# 시맨틱 검색 + RAG 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 키워드 검색을 하이브리드(키워드 + 시맨틱) 검색으로 확장하고, 아카이브 텍스트를 근거로 답변하는 RAG(질문하기)를 추가한다.

**Architecture:** 전 도메인의 텍스트를 하나의 `content_embeddings`(pgvector) 테이블에 임베딩으로 모으고, 3개의 Supabase Edge Function(`embed-content`/`semantic-search`/`rag-answer`)이 색인·검색·답변을 담당한다. API 키는 Edge Function secret에만 둔다. 클라이언트는 검색 결과 ID를 받아 이미 `DataContext`에 캐시된 데이터로 렌더한다.

**Tech Stack:** React 19 + TS + Vite, Supabase(Postgres + pgvector + Edge Functions/Deno), Gemini API(`gemini-embedding-001`, `gemini-2.5-flash`), 백필은 `tsx` 스크립트.

**스펙:** `docs/superpowers/specs/2026-07-14-semantic-search-rag-design.md`

---

## 이 프로젝트의 검증 방식 (읽고 시작할 것)

이 레포에는 자동화 테스트 프레임워크가 없다(vitest/jest 없음). 프로젝트의 "단순함/외과적 변경/기존 패턴 준수" 원칙에 따라 **테스트 프레임워크를 새로 도입하지 않는다.** 각 태스크의 검증은 다음으로 한다:

- `npm run build` (tsc 타입체크 + vite 빌드 통과)
- `npm run lint` (eslint 통과)
- SQL 콘솔에서 행 수/결과 확인
- Edge Function 직접 호출(`supabase functions ... ` 또는 `curl`)로 응답 확인
- 브라우저에서 실제 화면 확인

각 태스크 끝에서 커밋한다(코드 수정 후 커밋만, 푸시는 하지 않음 — 프로젝트 규칙).

---

## 파일 구조 (생성/수정 맵)

**생성:**
- `supabase/config.toml` — `supabase init` 산출물
- `supabase/functions/_shared/cors.ts` — CORS 헤더 + OPTIONS 처리
- `supabase/functions/_shared/gemini.ts` — Gemini 임베딩/생성 호출
- `supabase/functions/_shared/content.ts` — content_type별 원문 텍스트 조합
- `supabase/functions/embed-content/index.ts` — 단건 색인(upsert/삭제)
- `supabase/functions/semantic-search/index.ts` — 검색어 임베딩 + 유사도 검색
- `supabase/functions/rag-answer/index.ts` — 검색 + Gemini 답변 생성
- `scripts/backfill-embeddings.ts` — 전체 콘텐츠 일괄 색인(재실행 가능)
- `src/lib/database/embeddings.ts` — `syncEmbedding()` fire-and-forget 헬퍼
- `src/lib/semanticSearch.ts` — 클라이언트 검색/RAG 호출 래퍼

**수정:**
- Supabase DB (대시보드 SQL) — pgvector 확장 + `content_embeddings` 테이블 + `match_content` RPC
- `src/lib/database/videos.ts`, `moments.ts`, `posts.ts`, `episodes.ts`, `articles.ts`, `photos.ts`, `asks.ts` — create/update/delete 성공 후 `syncEmbedding()` 호출
- `src/pages/Search.tsx` — "연관 콘텐츠" 섹션 + "AI에게 물어보기" 추가
- `src/App.css` — 신규 섹션 스타일
- `package.json` — `backfill:embeddings` 스크립트, version 1.18.0

---

## 태스크 0: 사전 준비 (사용자 대화형 실행)

**Files:** 없음(환경 설정)

- [ ] **Step 1: Gemini API 키 발급**

Google AI Studio(https://aistudio.google.com/apikey)에서 API 키 발급. 무료 티어로 시작.

- [ ] **Step 2: Supabase CLI 로그인 및 프로젝트 링크**

프롬프트에 아래를 `!` 접두사로 직접 실행(대화형 로그인):

```
! supabase login
```

이어서 레포 루트에서:

```bash
supabase init          # supabase/ 디렉터리 + config.toml 생성 (기존 대시보드 함수엔 영향 없음)
supabase link --project-ref <YOUR_PROJECT_REF>   # 대시보드 Settings > General 의 Reference ID
```

- [ ] **Step 3: Edge Function secret 설정**

```bash
supabase secrets set GEMINI_API_KEY=<발급받은_키>
```

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`는 Edge Function 런타임에 자동 주입되므로 별도 설정 불필요.

- [ ] **Step 4: 커밋**

```bash
git add supabase/config.toml
git commit -m "chore(search): supabase CLI 초기화 (semantic search 준비)"
```

---

## 태스크 1: DB — pgvector + content_embeddings + match_content RPC

**Files:**
- Modify: Supabase DB (대시보드 SQL Editor에서 실행)

- [ ] **Step 1: 아래 SQL을 대시보드 SQL Editor에서 실행**

```sql
-- pgvector 확장
create extension if not exists vector;

-- 통합 임베딩 테이블
create table if not exists content_embeddings (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id uuid not null,
  text text not null,
  embedding vector(768) not null,
  updated_at timestamptz not null default now(),
  unique (content_type, content_id)
);

-- 코사인 유사도용 HNSW 인덱스
create index if not exists content_embeddings_embedding_idx
  on content_embeddings using hnsw (embedding vector_cosine_ops);

-- RLS: 정책 없음 = service_role(Edge Function)만 접근. 클라이언트는 직접 조회하지 않음.
alter table content_embeddings enable row level security;

-- 유사도 검색 RPC
create or replace function match_content(
  query_embedding vector(768),
  match_count int default 20,
  filter_type text default null
)
returns table (
  content_type text,
  content_id uuid,
  text text,
  similarity float
)
language sql stable
as $$
  select ce.content_type, ce.content_id, ce.text,
         1 - (ce.embedding <=> query_embedding) as similarity
  from content_embeddings ce
  where filter_type is null or ce.content_type = filter_type
  order by ce.embedding <=> query_embedding
  limit match_count;
$$;
```

- [ ] **Step 2: 검증 — 테이블/함수 생성 확인**

SQL Editor에서 실행:

```sql
select count(*) from content_embeddings;                 -- 0 이어야 함 (에러 없이)
select proname from pg_proc where proname = 'match_content';  -- 1행 반환
```

Expected: 첫 쿼리 `0`, 둘째 쿼리 `match_content` 1행. 에러 없음.

- [ ] **Step 3: 커밋 (문서화용 SQL 파일 남기기)**

DB 변경은 대시보드에서 이뤄지므로, 재현용으로 SQL을 레포에 남긴다.

`supabase/sql/2026-07-14-content-embeddings.sql` 파일에 위 Step 1 SQL 전체를 저장한 뒤:

```bash
git add supabase/sql/2026-07-14-content-embeddings.sql
git commit -m "feat(search): content_embeddings 테이블 + match_content RPC (pgvector)"
```

---

## 태스크 2: Edge Function 공용 모듈 (_shared)

**Files:**
- Create: `supabase/functions/_shared/cors.ts`
- Create: `supabase/functions/_shared/gemini.ts`
- Create: `supabase/functions/_shared/content.ts`

- [ ] **Step 1: CORS 헬퍼 작성**

`supabase/functions/_shared/cors.ts`:

```ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Gemini 호출 헬퍼 작성**

`supabase/functions/_shared/gemini.ts`:

```ts
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY')!;
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// 768차원 임베딩. 코사인 사용이므로 정규화 불필요(스케일 불변).
export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY',
): Promise<number[]> {
  const res = await fetch(
    `${BASE}/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: 768,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini embed failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.embedding.values as number[];
}

export async function generateAnswer(prompt: string): Promise<string> {
  const res = await fetch(
    `${BASE}/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini generate failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
```

- [ ] **Step 3: content_type별 원문 조합 헬퍼 작성**

`supabase/functions/_shared/content.ts`:

```ts
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// 색인 대상 content_type 목록 (activity는 name만이라 제외)
export const INDEXABLE_TYPES = [
  'video', 'moment', 'post', 'episode', 'article', 'photo', 'ask',
] as const;
export type ContentType = (typeof INDEXABLE_TYPES)[number];

const TABLE: Record<ContentType, string> = {
  video: 'videos',
  moment: 'moments',
  post: 'posts',
  episode: 'episodes',
  article: 'articles',
  photo: 'photos',
  ask: 'asks',
};

function join(parts: (string | null | undefined)[]): string {
  return parts.filter((p) => p && p.trim()).join(' \n');
}

// 원본 행을 조회해 임베딩용 텍스트를 만든다. 원본이 없으면 null(→ 삭제 처리).
export async function buildEmbeddingText(
  supabase: SupabaseClient,
  contentType: ContentType,
  contentId: string,
): Promise<string | null> {
  const { data: row, error } = await supabase
    .from(TABLE[contentType])
    .select('*')
    .eq('id', contentId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  switch (contentType) {
    case 'video':
      return join([row.title, row.channel_name, row.icon_text, row.date]);
    case 'moment':
      return join([row.title, row.date]);
    case 'post':
      return join([row.title, row.writer, row.content, row.platform, row.date]);
    case 'episode': {
      const msgs = Array.isArray(row.messages)
        ? row.messages
            .filter((m: { type: string }) => m.type === 'text')
            .map((m: { content: string }) => m.content)
            .join(' ')
        : '';
      return join([row.title, row.comment_text, msgs, row.date]);
    }
    case 'article': {
      const tags = Array.isArray(row.tags) ? row.tags.join(' ') : '';
      return join([row.title, row.author, tags, row.date]);
    }
    case 'photo': {
      const tags = Array.isArray(row.tags) ? row.tags.join(' ') : '';
      return join([row.title, tags, row.date]);
    }
    case 'ask':
      return join([row.content, row.answer]);
  }
}
```

- [ ] **Step 4: 검증 — Deno 문법 체크**

```bash
deno check supabase/functions/_shared/*.ts
```

Expected: 에러 없음. (deno가 없으면 이 태스크는 태스크 3 배포 시 함께 검증됨 — 그 경우 스킵하고 진행.)

- [ ] **Step 5: 커밋**

```bash
git add supabase/functions/_shared
git commit -m "feat(search): Edge Function 공용 모듈 (cors/gemini/content)"
```

---

## 태스크 3: embed-content Edge Function + 배포

**Files:**
- Create: `supabase/functions/embed-content/index.ts`

- [ ] **Step 1: 함수 작성**

`supabase/functions/embed-content/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { embedText } from '../_shared/gemini.ts';
import {
  buildEmbeddingText,
  INDEXABLE_TYPES,
  type ContentType,
} from '../_shared/content.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { content_type, content_id } = await req.json();
    if (!INDEXABLE_TYPES.includes(content_type)) {
      return jsonResponse({ error: `invalid content_type: ${content_type}` }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const text = await buildEmbeddingText(
      supabase,
      content_type as ContentType,
      content_id,
    );

    // 원본이 삭제된 경우 → 임베딩 행도 제거
    if (!text) {
      await supabase
        .from('content_embeddings')
        .delete()
        .match({ content_type, content_id });
      return jsonResponse({ deleted: true });
    }

    const embedding = await embedText(text, 'RETRIEVAL_DOCUMENT');

    const { error } = await supabase.from('content_embeddings').upsert(
      {
        content_type,
        content_id,
        text,
        embedding,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'content_type,content_id' },
    );
    if (error) throw error;

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('embed-content error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
```

- [ ] **Step 2: 배포**

```bash
supabase functions deploy embed-content
```

Expected: `Deployed Function embed-content` 성공 메시지.

- [ ] **Step 3: 검증 — 실제 항목 하나 색인**

기존 영상 하나의 id를 SQL로 확인:

```sql
select id from videos limit 1;
```

그 id로 함수 호출(로컬 `.env`의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 사용):

```bash
curl -i -X POST "$VITE_SUPABASE_URL/functions/v1/embed-content" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"content_type":"video","content_id":"<위에서_얻은_id>"}'
```

Expected: `{"ok":true}`. 이어서 SQL로 확인:

```sql
select content_type, length(text), updated_at from content_embeddings;
```

Expected: video 1행, `length` > 0.

- [ ] **Step 4: 커밋**

```bash
git add supabase/functions/embed-content
git commit -m "feat(search): embed-content Edge Function (단건 색인/삭제)"
```

---

## 태스크 4: 백필 스크립트

**Files:**
- Create: `scripts/backfill-embeddings.ts`
- Modify: `package.json` (scripts에 `backfill:embeddings` 추가)

- [ ] **Step 1: 스크립트 작성**

`scripts/backfill-embeddings.ts`:

```ts
/**
 * 전체 콘텐츠를 content_embeddings에 일괄 색인합니다. (재실행 가능 = 정합성 안전망)
 *
 * 실행:
 *   npx tsx scripts/backfill-embeddings.ts
 *
 * 환경변수 (.env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * 동작:
 *   1. 색인 대상 7개 테이블에서 id 전체 조회
 *   2. 각 (content_type, id)에 대해 embed-content Edge Function 호출 (동시 5개)
 *   3. 실패 항목은 모아서 마지막에 리포트
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TYPE_TABLE: Record<string, string> = {
  video: 'videos',
  moment: 'moments',
  post: 'posts',
  episode: 'episodes',
  article: 'articles',
  photo: 'photos',
  ask: 'asks',
};

const CONCURRENCY = 5;
const failures: { type: string; id: string; error: string }[] = [];

async function embedOne(type: string, id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('embed-content', {
    body: { content_type: type, content_id: id },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

async function runPool(
  items: { type: string; id: string }[],
): Promise<void> {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const item = items[i++];
      try {
        await embedOne(item.type, item.id);
      } catch (e) {
        failures.push({ type: item.type, id: item.id, error: String(e) });
      }
      if (i % 20 === 0) console.log(`  ...${i}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

async function main() {
  const all: { type: string; id: string }[] = [];
  for (const [type, table] of Object.entries(TYPE_TABLE)) {
    const { data, error } = await supabase.from(table).select('id').limit(10000);
    if (error) {
      console.error(`${table} 조회 실패:`, error.message);
      continue;
    }
    for (const row of data ?? []) all.push({ type, id: row.id });
    console.log(`${type}: ${data?.length ?? 0}건`);
  }

  console.log(`\n총 ${all.length}건 색인 시작...`);
  await runPool(all);

  console.log(`\n완료. 성공 ${all.length - failures.length} / 실패 ${failures.length}`);
  if (failures.length) {
    console.log('실패 목록:');
    for (const f of failures) console.log(`  [${f.type}] ${f.id}: ${f.error}`);
    process.exit(1);
  }
}

main();
```

- [ ] **Step 2: package.json에 스크립트 추가**

`package.json`의 `scripts`에 한 줄 추가:

```json
    "backfill:thumb-hash": "tsx scripts/backfill-thumb-hash.ts",
    "backfill:embeddings": "tsx scripts/backfill-embeddings.ts"
```

- [ ] **Step 3: 실행 및 검증**

```bash
npm run backfill:embeddings
```

Expected: 각 타입별 건수 출력 → "완료. 성공 N / 실패 0". SQL로 대조:

```sql
select content_type, count(*) from content_embeddings group by content_type;
```

Expected: 각 타입 행 수가 원본 테이블 건수와 일치.

- [ ] **Step 4: 커밋**

```bash
git add scripts/backfill-embeddings.ts package.json
git commit -m "feat(search): 임베딩 백필 스크립트"
```

---

## 태스크 5: semantic-search Edge Function + 클라이언트 래퍼

**Files:**
- Create: `supabase/functions/semantic-search/index.ts`
- Create: `src/lib/semanticSearch.ts`

- [ ] **Step 1: 함수 작성**

`supabase/functions/semantic-search/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { embedText } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { query, limit = 20, content_type = null } = await req.json();
    if (!query || typeof query !== 'string') {
      return jsonResponse({ error: 'query required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const embedding = await embedText(query, 'RETRIEVAL_QUERY');

    const { data, error } = await supabase.rpc('match_content', {
      query_embedding: embedding,
      match_count: limit,
      filter_type: content_type,
    });
    if (error) throw error;

    // text는 검색 응답에서 제외(페이로드 절약)
    const results = (data ?? []).map(
      (r: { content_type: string; content_id: string; similarity: number }) => ({
        content_type: r.content_type,
        content_id: r.content_id,
        similarity: r.similarity,
      }),
    );

    return jsonResponse({ results });
  } catch (e) {
    console.error('semantic-search error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
```

- [ ] **Step 2: 배포 및 검증**

```bash
supabase functions deploy semantic-search
curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/semantic-search" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"바다","limit":5}'
```

Expected: `{"results":[{"content_type":...,"content_id":...,"similarity":0.x}, ...]}` (유사도 내림차순).

- [ ] **Step 3: 클라이언트 래퍼 작성**

`src/lib/semanticSearch.ts`:

```ts
import { supabase } from './supabase';

export interface SemanticHit {
  content_type: 'video' | 'moment' | 'post' | 'episode' | 'article' | 'photo' | 'ask';
  content_id: string;
  similarity: number;
}

export async function semanticSearch(
  query: string,
  limit = 20,
): Promise<SemanticHit[]> {
  const { data, error } = await supabase.functions.invoke('semantic-search', {
    body: { query, limit },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.results ?? []) as SemanticHit[];
}

export interface RagSource {
  content_type: SemanticHit['content_type'];
  content_id: string;
}

export interface RagResult {
  answer: string;
  sources: RagSource[];
}

export async function askArchive(query: string): Promise<RagResult> {
  const { data, error } = await supabase.functions.invoke('rag-answer', {
    body: { query },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as RagResult;
}
```

- [ ] **Step 4: 검증**

```bash
npm run build
```

Expected: 타입 에러 없이 빌드 성공. (`askArchive`는 태스크 8에서 사용, 여기선 타입만 통과하면 됨.)

- [ ] **Step 5: 커밋**

```bash
git add supabase/functions/semantic-search src/lib/semanticSearch.ts
git commit -m "feat(search): semantic-search Edge Function + 클라이언트 래퍼"
```

---

## 태스크 6: 증분 색인 훅 (syncEmbedding)

**Files:**
- Create: `src/lib/database/embeddings.ts`
- Modify: `src/lib/database/videos.ts`, `moments.ts`, `posts.ts`, `episodes.ts`, `articles.ts`, `photos.ts`, `asks.ts`

- [ ] **Step 1: 헬퍼 작성**

`src/lib/database/embeddings.ts`:

```ts
import { supabase } from '../supabase';

export type EmbeddingContentType =
  | 'video' | 'moment' | 'post' | 'episode' | 'article' | 'photo' | 'ask';

// 색인 재생성을 백그라운드로 요청한다. 실패해도 원 작업을 막지 않는다(fire-and-forget).
// 정합성은 backfill:embeddings 재실행으로 보정 가능.
export function syncEmbedding(
  contentType: EmbeddingContentType,
  contentId: string,
): void {
  void supabase.functions
    .invoke('embed-content', {
      body: { content_type: contentType, content_id: contentId },
    })
    .catch((e) => console.error('syncEmbedding failed:', contentType, contentId, e));
}
```

- [ ] **Step 2: videos.ts에 훅 연결 (완전 예시)**

`src/lib/database/videos.ts` 상단 import에 추가:

```ts
import { syncEmbedding } from './embeddings';
```

`createVideo` 반환 직전 수정:

```ts
  if (error) throw error;
  syncEmbedding('video', data.id);
  return data;
```

`updateVideo` 반환 직전 수정:

```ts
  if (error) throw error;
  syncEmbedding('video', data.id);
  return data;
```

`deleteVideo` 반환 직전 수정 (원본 삭제 후 호출 → embed-content가 임베딩 행 제거):

```ts
  if (error) throw error;
  syncEmbedding('video', id);
```

- [ ] **Step 3: 나머지 6개 도메인에 동일 패턴 적용**

각 파일에서 (1) `import { syncEmbedding } from './embeddings';` 추가, (2) create/update는 `syncEmbedding('<type>', data.id);`, delete는 `syncEmbedding('<type>', id);`를 각 함수의 `if (error) throw error;` 직후·`return` 직전에 삽입.

| 파일 | content_type | create/update 대상 함수 | delete 대상 함수 |
|---|---|---|---|
| `moments.ts` | `moment` | `createMoment`, `updateMoment` | `deleteMoment` |
| `posts.ts` | `post` | `createPost`, `updatePost` | `deletePost` |
| `episodes.ts` | `episode` | `createEpisode`, `updateEpisode` | `deleteEpisode` |
| `articles.ts` | `article` | `createArticle`, `updateArticle` | `deleteArticle` |
| `photos.ts` | `photo` | `createPhoto`, `updatePhoto` | `deletePhoto` |
| `asks.ts` | `ask` | (생성/답변 저장 함수: `createAsk`, `answerAsk`/`updateAsk`) | (`deleteAsk` 있으면) |

> 주의: 각 파일의 실제 create/update/delete 함수명을 `grep -n "export async function" src/lib/database/<file>.ts`로 먼저 확인하고, insert/update는 `.select().single()` 결과 `data.id`를, delete는 인자 `id`를 넘긴다. 반환 형태가 다른 함수(예: void 반환이지만 id를 인자로 받음)는 인자 id를 사용한다.

- [ ] **Step 4: 검증**

```bash
npm run build && npm run lint
```

Expected: 타입/린트 에러 없음.

브라우저 수동 검증: 어드민에서 영상 하나 제목 수정 → 저장 → SQL로 해당 임베딩 `updated_at`이 갱신됐는지 확인:

```sql
select updated_at from content_embeddings where content_type='video' and content_id='<수정한_id>';
```

Expected: 방금 시각으로 갱신.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/database
git commit -m "feat(search): create/update/delete 시 임베딩 증분 동기화"
```

---

## 태스크 7: Search.tsx — "연관 콘텐츠" 섹션 (Phase A 완성)

**Files:**
- Modify: `src/pages/Search.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: 연관 콘텐츠 상태 + 조회 로직 추가**

`src/pages/Search.tsx`의 import에 추가:

```ts
import { semanticSearch, type SemanticHit } from '../lib/semanticSearch';
```

컴포넌트 내부, `inputValue` state 선언 아래에 추가:

```ts
  const [related, setRelated] = useState<SemanticHit[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
```

`trimmedQuery` 계산 이후, 쿼리 변경 시 시맨틱 검색을 실행하는 effect 추가:

```ts
  // 시맨틱 "연관 콘텐츠" 조회 (키워드 결과와 별개, 실패해도 무시)
  useEffect(() => {
    if (!trimmedQuery) {
      setRelated([]);
      return;
    }
    let cancelled = false;
    setRelatedLoading(true);
    semanticSearch(trimmedQuery, 20)
      .then((hits) => {
        if (!cancelled) setRelated(hits);
      })
      .catch((e) => {
        console.error('semantic search failed:', e);
        if (!cancelled) setRelated([]);
      })
      .finally(() => {
        if (!cancelled) setRelatedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trimmedQuery]);
```

- [ ] **Step 2: 키워드 결과와 dedup 후 렌더용 데이터 계산**

`totalResults` 계산 아래에 추가:

```ts
  // 키워드 결과에 이미 나온 (type,id)는 연관 콘텐츠에서 제외
  const keywordKeys = new Set<string>([
    ...matchedVideos.map((v) => `video:${v.id}`),
    ...matchedMoments.map((m) => `moment:${m.id}`),
    ...matchedPosts.map((p) => `post:${p.id}`),
    ...matchedEpisodes.map((e) => `episode:${e.id}`),
    ...matchedArticles.map((a) => `article:${a.id}`),
  ]);

  const RELATED_ROUTE: Record<SemanticHit['content_type'], string> = {
    video: '/videos',
    moment: '/videos',
    post: '/posts',
    episode: '/episodes',
    article: '/articles',
    photo: '/photos',
    ask: '/',
  };
  const RELATED_LABEL: Record<SemanticHit['content_type'], string> = {
    video: '영상', moment: '모먼트', post: '포스트', episode: '에피소드',
    article: '글', photo: '포토', ask: '문답',
  };

  // 캐시된 데이터에서 제목/날짜를 찾아 표시용으로 변환. 못 찾으면 제외.
  const relatedItems = related
    .filter((h) => !keywordKeys.has(`${h.content_type}:${h.content_id}`))
    .map((h) => {
      let title = '';
      let date = '';
      let linkId = h.content_id;
      if (h.content_type === 'video' || h.content_type === 'moment') {
        const v = videos.find((x) => x.id === h.content_id);
        const m = moments.find((x) => x.id === h.content_id);
        const found = v ?? m;
        if (found) { title = found.title; date = found.date; }
        if (m && !v) linkId = m.video_id || m.id;
      } else if (h.content_type === 'post') {
        const p = posts.find((x) => x.id === h.content_id);
        if (p) { title = p.title || p.platform; date = p.date; }
      } else if (h.content_type === 'episode') {
        const e = episodes.find((x) => x.id === h.content_id);
        if (e) { title = e.title || e.date; date = e.date; }
      } else if (h.content_type === 'article') {
        const a = articles.find((x) => x.id === h.content_id);
        if (a) { title = a.title; date = a.date; }
      }
      return { hit: h, title, date, linkId };
    })
    .filter((r) => r.title); // 캐시에 없거나 표시 불가한 항목 제외
```

> 참고: `photo`/`ask`는 `Search.tsx`가 현재 캐시로 들고 있지 않으므로 제목이 비어 자동 제외된다. 이는 의도된 동작(현 검색 페이지 스코프 유지). 추후 확장 시 `fetchPhotos`/`fetchAsks`를 로드해 포함할 수 있다.

- [ ] **Step 3: "연관 콘텐츠" 섹션 렌더 추가**

`search-results` div 내부, 도메인 섹션들이 끝난 직후(마지막 `</div>` 이전, 글 결과 섹션 다음)에 추가:

```tsx
          {/* 연관 콘텐츠 (시맨틱) */}
          {activeFilter === 'all' && relatedItems.length > 0 && (
            <div className="search-section related-section">
              <h2>🔎 연관 콘텐츠 ({relatedItems.length})</h2>
              <p className="related-desc">검색어와 의미가 비슷한 콘텐츠예요</p>
              <div className="search-list">
                {relatedItems.map(({ hit, title, date, linkId }) => (
                  <Link
                    to={`${RELATED_ROUTE[hit.content_type]}?highlight=${linkId}`}
                    key={`${hit.content_type}:${hit.content_id}`}
                    className="search-item"
                  >
                    <span className="search-item-title">
                      <span className="related-badge">{RELATED_LABEL[hit.content_type]}</span>
                      {title}
                    </span>
                    <span className="search-item-date">{date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
```

- [ ] **Step 4: "결과 없음" 분기 보정**

키워드 결과가 0이어도 연관 콘텐츠가 있으면 결과 화면을 보여줘야 한다. `totalResults === 0` 분기 조건을 수정:

기존:

```tsx
      ) : totalResults === 0 ? (
```

수정:

```tsx
      ) : totalResults === 0 && relatedItems.length === 0 && !relatedLoading ? (
```

그리고 `search-results` 진입 조건도 `totalResults > 0`에만 의존하지 않도록, 키워드 섹션들은 각자 `matchedX.length > 0` 가드가 이미 있으므로 그대로 두고, 연관 섹션이 렌더되도록 위 구조를 유지한다. (키워드 0건이어도 `search-results` 컨테이너로 진입해 연관 섹션만 표시됨.)

- [ ] **Step 5: 스타일 추가**

`src/App.css` 맨 아래에 추가:

```css
/* 시맨틱 연관 콘텐츠 */
.related-section { margin-top: 24px; }
.related-desc {
  color: var(--text-secondary);
  font-size: 13px;
  margin: -4px 0 12px;
}
.related-badge {
  display: inline-block;
  font-size: 11px;
  padding: 1px 6px;
  margin-right: 6px;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  vertical-align: middle;
}
```

- [ ] **Step 6: 검증**

```bash
npm run build && npm run lint
```

Expected: 에러 없음.

브라우저: `/search?q=바다` 등으로 검색 → 키워드 결과 아래 "연관 콘텐츠" 섹션 노출, 키워드 결과와 중복 없음. 키워드 0건 쿼리(의미로만 걸리는 단어)에서도 연관 콘텐츠가 뜨는지 확인.

- [ ] **Step 7: 커밋 (Phase A 완성)**

```bash
git add src/pages/Search.tsx src/App.css
git commit -m "feat(search): 하이브리드 검색 - 연관 콘텐츠(시맨틱) 섹션 추가"
```

---

## 태스크 8: rag-answer Edge Function (Phase B)

**Files:**
- Create: `supabase/functions/rag-answer/index.ts`

- [ ] **Step 1: 함수 작성**

`supabase/functions/rag-answer/index.ts`:

```ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { embedText, generateAnswer } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return jsonResponse({ error: 'query required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const embedding = await embedText(query, 'RETRIEVAL_QUERY');
    const { data: hits, error } = await supabase.rpc('match_content', {
      query_embedding: embedding,
      match_count: 8,
      filter_type: null,
    });
    if (error) throw error;

    const rows = (hits ?? []) as {
      content_type: string;
      content_id: string;
      text: string;
      similarity: number;
    }[];

    if (rows.length === 0) {
      return jsonResponse({
        answer: '관련된 내용을 아카이브에서 찾지 못했어요.',
        sources: [],
      });
    }

    const context = rows
      .map((r, i) => `[${i + 1}] (${r.content_type}) ${r.text}`)
      .join('\n\n');

    const prompt = [
      '너는 팬 아카이브의 검색 도우미야. 아래 "자료"만 근거로 사용자 질문에 한국어로 간결하게 답해.',
      '자료에 없는 내용은 지어내지 말고, 모르면 모른다고 답해. 추측 금지.',
      '',
      `질문: ${query}`,
      '',
      '자료:',
      context,
    ].join('\n');

    const answer = await generateAnswer(prompt);

    return jsonResponse({
      answer,
      sources: rows.map((r) => ({
        content_type: r.content_type,
        content_id: r.content_id,
      })),
    });
  } catch (e) {
    console.error('rag-answer error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
```

- [ ] **Step 2: 배포 및 검증**

```bash
supabase functions deploy rag-answer
curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/rag-answer" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"둘이 바다에 간 적 있어?"}'
```

Expected: `{"answer":"...", "sources":[{"content_type":...,"content_id":...}]}`. `sources`의 id가 실제 존재하는 항목인지 SQL로 1건 확인.

- [ ] **Step 3: 커밋**

```bash
git add supabase/functions/rag-answer
git commit -m "feat(search): rag-answer Edge Function (RAG 답변 생성)"
```

---

## 태스크 9: Search.tsx — "AI에게 물어보기" UI (Phase B 완성)

**Files:**
- Modify: `src/pages/Search.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: RAG import 및 상태 추가**

`src/pages/Search.tsx`의 semanticSearch import를 확장:

```ts
import { semanticSearch, askArchive, type SemanticHit, type RagResult } from '../lib/semanticSearch';
```

상태 추가(related state 근처):

```ts
  const [rag, setRag] = useState<RagResult | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
```

쿼리가 바뀌면 이전 답변을 초기화하는 처리 — 기존 `useEffect([query])` 안에 한 줄 추가:

```ts
  useEffect(() => {
    setInputValue(query);
    setActiveFilter('all');
    setRag(null);
  }, [query]);
```

- [ ] **Step 2: RAG 실행 핸들러 추가**

컴포넌트 내부에 추가:

```ts
  const handleAsk = useCallback(() => {
    if (!trimmedQuery) return;
    setRagLoading(true);
    setRag(null);
    askArchive(trimmedQuery)
      .then(setRag)
      .catch((e) => {
        console.error('rag failed:', e);
        setRag({ answer: '답변 생성에 실패했어요. 아래 검색 결과를 참고해주세요.', sources: [] });
      })
      .finally(() => setRagLoading(false));
  }, [trimmedQuery]);
```

- [ ] **Step 3: "AI에게 물어보기" 블록 렌더**

`search-results` div 최상단(필터 탭 바로 위)에 추가:

```tsx
          {/* AI에게 물어보기 (RAG) */}
          <div className="rag-box">
            {!rag && !ragLoading && (
              <button className="rag-ask-btn" onClick={handleAsk}>
                🤖 "{trimmedQuery}" AI에게 물어보기
              </button>
            )}
            {ragLoading && <div className="rag-loading">답변 생성 중...</div>}
            {rag && (
              <div className="rag-answer">
                <p className="rag-answer-text">{rag.answer}</p>
                {rag.sources.length > 0 && (
                  <div className="rag-sources">
                    <span className="rag-sources-label">출처</span>
                    {rag.sources.map((s) => {
                      const route = RELATED_ROUTE[s.content_type];
                      let linkId = s.content_id;
                      if (s.content_type === 'moment') {
                        const m = moments.find((x) => x.id === s.content_id);
                        if (m) linkId = m.video_id || m.id;
                      }
                      return (
                        <Link
                          key={`${s.content_type}:${s.content_id}`}
                          to={`${route}?highlight=${linkId}`}
                          className="rag-source-chip"
                        >
                          {RELATED_LABEL[s.content_type]}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
```

> `RELATED_ROUTE`/`RELATED_LABEL`은 태스크 7 Step 2에서 이미 정의됨(같은 컴포넌트 스코프).

- [ ] **Step 4: 스타일 추가**

`src/App.css` 맨 아래에 추가:

```css
/* RAG 물어보기 */
.rag-box { margin-bottom: 20px; }
.rag-ask-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
}
.rag-ask-btn:hover { border-color: var(--accent); }
.rag-loading { padding: 12px 16px; color: var(--text-secondary); }
.rag-answer {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-card);
}
.rag-answer-text { margin: 0 0 12px; line-height: 1.6; white-space: pre-wrap; }
.rag-sources { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.rag-sources-label { font-size: 12px; color: var(--text-secondary); margin-right: 4px; }
.rag-source-chip {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  text-decoration: none;
}
.rag-source-chip:hover { border-color: var(--accent); color: var(--accent); }
```

- [ ] **Step 5: 검증**

```bash
npm run build && npm run lint
```

Expected: 에러 없음.

브라우저: 검색 후 "AI에게 물어보기" 클릭 → 답변 + 출처 칩 노출, 칩 클릭 시 해당 콘텐츠로 이동(highlight).

- [ ] **Step 6: 커밋 (Phase B 완성)**

```bash
git add src/pages/Search.tsx src/App.css
git commit -m "feat(search): AI에게 물어보기(RAG) UI 추가"
```

---

## 태스크 10: 버전 업 + 마무리

**Files:**
- Modify: `package.json` (version)

- [ ] **Step 1: 버전 업데이트**

`package.json`의 `"version": "1.17.0"` → `"version": "1.18.0"` (minor, 새 기능).

- [ ] **Step 2: 전체 검증**

```bash
npm run build && npm run lint
```

Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add package.json
git commit -m "chore: v1.18.0 - 시맨틱 검색 + RAG"
```

---

## 자체 점검 결과 (작성자 확인)

- **스펙 커버리지:** DB(태스크1), 임베딩 모델·도메인별 텍스트(태스크2 content.ts), embed-content(태스크3), 백필(태스크4), semantic-search(태스크5), 증분 색인(태스크6), 하이브리드 UI 연관 콘텐츠(태스크7), rag-answer(태스크8), 물어보기 UI(태스크9), 버전(태스크10) — 스펙 전 섹션 매핑됨.
- **타입 일관성:** `SemanticHit`/`RagResult`/`RagSource`는 `src/lib/semanticSearch.ts`에서 정의되고 Search.tsx에서 재사용. `RELATED_ROUTE`/`RELATED_LABEL`은 태스크7에서 정의되어 태스크9에서 참조(동일 컴포넌트 스코프). Edge Function 반환 형태(`{results}`, `{answer,sources}`)와 클라이언트 파싱 일치.
- **알려진 스코프 한계(의도됨):** photo/ask는 색인·검색·RAG 근거에는 포함되나, Search 페이지가 이 둘을 캐시로 로드하지 않아 "연관 콘텐츠" 목록엔 표시되지 않음(제목 없으면 자동 제외). 필요 시 `fetchPhotos`/`fetchAsks` 로드로 확장.
- **정합성:** 증분 동기화 실패는 무시(fire-and-forget)하되 `npm run backfill:embeddings` 재실행으로 언제든 보정.
