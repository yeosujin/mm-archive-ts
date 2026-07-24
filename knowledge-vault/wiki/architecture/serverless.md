---
type: architecture
status: stable
tags: [architecture, serverless, api]
created: 2026-07-24
updated: 2026-07-24
---

# 서버리스 표면

서버가 두 군데로 나뉜다. 왜 나눴는지는 → [[edge-function-vercel-split]]

## Supabase Edge Functions

`supabase/functions/`. 클라이언트에서 `supabase.functions.invoke(name)`으로 호출한다.

| 함수 | 입력 | 하는 일 |
|---|---|---|
| `semantic-search` | `{ query, limit = 20, content_type = null }` | 쿼리 임베딩 → `content_embeddings` 벡터 검색 → `{content_type, content_id, similarity}[]` |
| `rag-answer` | `{ query }` | 임베딩 → 관련 콘텐츠 검색 → Gemini 답변 생성 → `{answer, sources}` |
| `embed-content` | 콘텐츠 식별자 | 콘텐츠 텍스트를 임베딩해 `content_embeddings`에 저장 |

공유 모듈 `_shared/`:

| 파일 | export |
|---|---|
| `gemini.ts` | `embedText`, `generateAnswer` |
| `content.ts` | 콘텐츠 → 임베딩 대상 텍스트 변환 |
| `cors.ts` | `corsHeaders`, `jsonResponse` |

클라이언트 래퍼는 `src/lib/semanticSearch.ts`.

> [!gap]
> `askArchive`(→ `rag-answer`)는 정의만 되어 있고 **UI 어디에서도 호출하지 않는다.** 검색 화면은 `semanticSearch`만 쓴다.

## Vercel Functions

`api/`. `@vercel/node` 런타임.

| 경로 | 하는 일 |
|---|---|
| `api/og.ts` | 동적 OG 카드 PNG 생성 → [[og-image-generation]] |
| `api/ask/index.ts`, `api/ask/[id].ts` | 크롤러 UA면 OG 메타 HTML, 아니면 `dist/index.html`(SPA) |

## content_embeddings

`supabase/sql/2026-07-14-content-embeddings.sql`로 만든다 → [[no-migration-tool]]

| 컬럼 | |
|---|---|
| `id` | |
| `content_type` | 도메인 구분 |
| `content_id` | 원본 레코드 id |
| `text` | 임베딩 대상 텍스트 |
| `embedding` | `vector(768)` |
| `updated_at` | |

같은 파일에 `vector` 확장, 벡터 인덱스, 검색 함수, `enable row level security`(정책 없음 = service_role 전용)가 함께 들어 있다.

`tweet_bot_log`는 `2026-07-15-tweet-bot-log.sql`. 봇 중복 게시 방지용 → [[daily-tweet-bot]]

## 관련
- [[edge-function-vercel-split]] · [[embedding-semantic-search]] · [[og-image-generation]] · [[supabase]] · [[vercel]]
