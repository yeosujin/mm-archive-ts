# 시맨틱 검색 + RAG 설계

- **작성일**: 2026-07-14
- **대상 버전**: 1.17.0 → 1.18.0 (minor, 새 기능)
- **접근법**: 통합 임베딩 테이블 + Supabase Edge Function (접근 A)

## 1. 목표

현재 `Search.tsx`의 키워드(부분일치) 검색을 **하이브리드 검색**으로 확장하고,
그 위에 아카이브 근거로 답변을 생성하는 **RAG(질문하기)** 기능을 얹는다.

- **A. 시맨틱 검색**: 검색어와 단어가 겹치지 않아도 의미가 통하는 콘텐츠를 찾아준다.
- **B. RAG**: 자연어 질문에 대해 관련 콘텐츠를 근거로 문장 답변 + 출처를 제시한다.

**정보의 출처는 DB에 등록된 텍스트뿐이다.** 영상 픽셀/음성/이미지 내용은 검색 대상이 아니다.
(향후 자막 STT 파이프라인을 확장으로 붙이면 영상 내용 검색이 가능해지나, 본 스펙 범위 밖.)

## 2. 현재 상태 (조사 결과)

- 검색: `src/pages/Search.tsx`가 `DataContext`의 전체 데이터를 클라이언트에서
  `title.toLowerCase().includes(query)`로 부분일치 필터링. 서버 검색/RPC 없음.
- DB 함수: `src/lib/database/*.ts` (도메인별 파일), `database.ts`는 배럴.
- Edge Function: `supabase.functions.invoke('dynamic-task', ...)` 형태로 이미 사용 중
  (Edge Function은 Supabase 측에 배포되며 본 레포에 소스는 없음).
- 콘텐츠 도메인(텍스트 보유): `video`, `moment`, `post`, `episode`, `article`, `photo`, `ask`.
  (`activity`는 name만 있어 색인 가치 낮음 → 제외.)
- 주의: `CLAUDE.md`는 `photo`/`activity`/`ask` 도메인이 누락된 구버전. 본 작업으로 수정하지 않음(범위 외).

## 3. 데이터베이스

pgvector 확장을 활성화하고 통합 임베딩 테이블을 신설한다.

### `content_embeddings` 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid (PK, default gen_random_uuid) | |
| `content_type` | text | 'video' \| 'moment' \| 'post' \| 'episode' \| 'article' \| 'photo' \| 'ask' |
| `content_id` | uuid | 원본 항목 ID |
| `text` | text | 임베딩에 넣은 원문 (디버그/재생성용) |
| `embedding` | `vector(768)` | 임베딩 벡터 |
| `updated_at` | timestamptz default now() | 재임베딩 시각 |

- `UNIQUE (content_type, content_id)` → 항목당 1행, 재임베딩은 upsert.
- **HNSW 인덱스** (`vector_cosine_ops`) → 코사인 유사도 검색.
- RLS: 읽기는 Edge Function(service_role)만, 쓰기도 service_role만.

### RPC 함수 `match_content`

```
match_content(query_embedding vector(768), match_count int, filter_type text default null)
→ (content_type text, content_id uuid, similarity float)
```

코사인 유사도(`1 - (embedding <=> query_embedding)`) 내림차순으로 상위 `match_count`개 반환.
`filter_type`이 주어지면 해당 `content_type`만 필터.

## 4. 임베딩 모델

- **Gemini `gemini-embedding-001`**, 출력 차원 **768**, 코사인 유사도.
- task type 구분(Gemini 권장, 검색 정확도 향상):
  - 문서 색인 시 `RETRIEVAL_DOCUMENT`
  - 검색어 임베딩 시 `RETRIEVAL_QUERY`
- API 키는 Edge Function secret으로만 보관 (클라이언트 노출 금지).
- 비용: 이 데이터 규모(짧은 한국어 텍스트 위주)에서는 Gemini API 무료 티어로 충분.

### 도메인별 임베딩 텍스트 조합

| content_type | 조합 필드 |
|---|---|
| video | title + channel_name + icon_text + date |
| moment | title + date |
| post | title + writer + content + platform + date |
| episode | title + comment_text + messages[].content(type=text만) + date |
| article | title + author + tags + date |
| photo | title + tags + date |
| ask | content + answer |

## 5. Edge Functions (신규 3개)

1. **`embed-content`** — `{ content_type, content_id }`
   → 원본 조회 → 위 규칙으로 텍스트 조합 → Gemini 임베딩(RETRIEVAL_DOCUMENT)
   → `content_embeddings` upsert. (증분 색인용)

2. **`semantic-search`** — `{ query, limit?, content_type? }`
   → 검색어 임베딩(RETRIEVAL_QUERY) → `match_content` RPC
   → `[{ content_type, content_id, similarity }]` 반환.
   **ID + 점수만 반환** (본문은 클라이언트가 `DataContext` 캐시에서 렌더).

3. **`rag-answer`** (RAG) — `{ query }`
   → `semantic-search` 로직 재사용해 top-K 확보
   → 출처 메타와 함께 컨텍스트 구성 → **Gemini 2.5 Flash**로 답변 생성
   → `{ answer, sources: [{ content_type, content_id }] }` 반환.
   (기존 `Ask` 도메인과 이름 충돌 피하려 `rag-answer`로 명명.)

## 6. 데이터 흐름

- **백필 (1회 + 재실행 가능)**: 로컬 Node 스크립트가 service_role 키로 전체 콘텐츠를
  순회하며 `embed-content` 로직 실행. 항목별 try/catch, 실패 목록 리포트, 재실행 시 이어서.
  → 드리프트 발생 시 언제든 재실행 = 무료 수준 비용. **이것이 정합성 안전망.**
- **증분**: 어드민 저장 경로(`src/lib/database/*.ts`의 create/update) 성공 후
  `embed-content`를 fire-and-forget 호출. 삭제 시 해당 임베딩 행도 삭제.
- **검색(런타임)**: `semantic-search`가 ID+점수만 반환 →
  클라이언트가 `DataContext`에 이미 로드된 데이터에서 항목을 찾아 렌더.

## 7. UI (`src/pages/Search.tsx`) — 하이브리드

검색창은 하나. 결과를 두 섹션 + RAG 진입으로 구성:

1. **"검색 결과"** — 기존 키워드(부분일치) 결과. 현재 로직 유지, 도메인별 표시.
2. **"연관 콘텐츠"** — `semantic-search` 결과 중 **1번에 이미 나온 항목은 제외(dedup)**,
   유사도 순 정렬. 단어가 안 겹쳐도 의미로 걸린 항목이 노출됨.
   키워드 결과가 0개여도 여기서 후보를 보여줘 "검색 결과 없음"을 줄인다.
3. **"AI에게 물어보기"(RAG)** — 별도 진입. 답변 + 클릭 가능한 출처 카드
   (기존 `?highlight=id` 링크 재사용).

## 8. 에러 처리

- 임베딩/시맨틱 검색 실패 → "연관 콘텐츠" 섹션만 숨기고 키워드 결과는 정상 표시(폴백), 콘솔 로깅.
- RAG 실패 → "답변 생성 실패, 관련 검색 결과만 표시".
- 백필 스크립트 → 항목별 실패 격리 + 실패 목록 출력.

## 9. 검증 기준

- 백필 후 `content_embeddings` 행 수 == 색인 대상 콘텐츠 총수.
- "바다", "첫 라이브" 등 단어 미겹침 질의에서 키워드가 못 잡던 항목이 "연관 콘텐츠"에 노출.
- "연관 콘텐츠"에 키워드 결과와 중복 항목이 없음(dedup 확인).
- RAG 답변의 `sources` ID가 모두 실제 존재하는 항목.

## 10. 구축 순서 (A → B)

1. DB: pgvector 활성화 + `content_embeddings` 테이블 + `match_content` RPC.
2. `embed-content` Edge Function + 백필 스크립트 → 시맨틱 검색 재료 완성.
3. `semantic-search` Edge Function + `Search.tsx` "연관 콘텐츠" 섹션 → **A 완성**.
4. `rag-answer` Edge Function + "AI에게 물어보기" UI → **B 완성**.
5. `package.json` version 1.18.0.
