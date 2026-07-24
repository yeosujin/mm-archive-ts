# API · 서버리스 · 외부 연동

서버는 두 군데로 나뉜다. **Supabase Edge Functions**(Deno)는 AI/검색을, **Vercel Functions**(Node)는 OG 이미지와 Ask 공유를 담당한다.

## Supabase Edge Functions

`supabase/functions/`. 클라이언트에서 `supabase.functions.invoke(name)`로 호출한다.

| 함수 | 입력 | 하는 일 |
|---|---|---|
| `semantic-search` | `{ query, limit = 20, content_type = null }` | 쿼리를 임베딩 → `content_embeddings` 벡터 검색 → `{content_type, content_id, similarity}[]` |
| `rag-answer` | `{ query }` | 임베딩 → 관련 콘텐츠 검색 → Gemini로 답변 생성 → `{answer, sources}` |
| `embed-content` | 콘텐츠 식별자 | 콘텐츠 텍스트를 임베딩해 `content_embeddings`에 저장 |

공유 모듈 `_shared/`:

- `gemini.ts` — `embedText`, `generateAnswer`
- `content.ts` — 콘텐츠 → 임베딩 대상 텍스트 변환
- `cors.ts` — `corsHeaders`, `jsonResponse`

클라이언트 래퍼는 `src/lib/semanticSearch.ts`에 있다.

> **`askArchive`(rag-answer)는 정의만 되어 있고 UI 어디에서도 호출하지 않는다.** 검색 화면은 `semanticSearch`만 쓴다. RAG 답변 기능은 백엔드까지 완성돼 있고 프론트 연결만 남은 상태다.

## Vercel Functions

`api/`. `@vercel/node` 런타임.

### `api/og.ts`

동적 OG 카드 이미지 생성. `satori`로 JSX → SVG, `@resvg/resvg-js`로 SVG → PNG.

- 폰트: `api/fonts/SUIT-Regular.woff2`, `SUIT-SemiBold.woff2`
- 이모지는 **Twemoji 15.1.0** 이미지로 치환한다. `twemojiCode()`가 코드포인트를 전부 이어붙이는데, 첫 코드포인트만 쓰면 하트류·ZWJ 조합·키캡 이모지가 깨지기 때문이다. ZWJ가 포함되면 VS16(`fe0f`)을 유지하고, 아니면 떼어낸다

### `api/ask/index.ts`, `api/ask/[id].ts`

Ask 페이지의 SNS 공유 지원. User-Agent로 크롤러를 감지해 분기한다.

- 크롤러(`twitterbot`, `facebookexternalhit`, `linkedinbot`, `slackbot`, `discordbot`, `kakaotalk-scrap`)면 → OG 메타태그가 박힌 HTML 반환
- 일반 브라우저면 → `dist/index.html`을 그대로 반환해 SPA로 넘긴다

## 데이터베이스

Supabase PostgreSQL. **마이그레이션 도구를 쓰지 않는다** — `supabase/sql/`의 SQL을 수동 실행하는 방식.

| 파일 | 내용 |
|---|---|
| `2026-07-14-content-embeddings.sql` | `vector` 확장, `content_embeddings` 테이블(`vector(768)`), 벡터 인덱스, 검색 함수 |
| `2026-07-15-tweet-bot-log.sql` | `tweet_bot_log` 테이블 (봇 중복 게시 방지) |

`content_embeddings`: `id`, `content_type`, `content_id`, `text`, `embedding vector(768)`, `updated_at`

### 권한 분리

- 프론트엔드는 **anon key**로 직접 접근 (RLS 전제)
- 쓰기 권한이 필요한 서버/봇은 **service-role key** 사용. 이 키는 클라이언트 번들에 절대 들어가면 안 된다

## 외부 API

| 대상 | 용도 | 호출 위치 |
|---|---|---|
| YouTube Data API v3 | 영상 메타데이터 자동 수집 | 어드민 영상 등록 |
| X (Twitter) API v2 | 일일 자동 게시 | `scripts/dailyTweet/` (`twitter-api-v2`) |
| Twitter Widget / `react-tweet` | 트윗 임베드 | `components/TweetEmbed.tsx` |
| Instagram Embed | 인스타 임베드 | `components/PostEmbed.tsx` |
| Postype | 아티클 메타데이터 크롤링 | Supabase Edge Function |
| Google Gemini | 임베딩 + 답변 생성 | Edge Function `_shared/gemini.ts` |
| Discord Webhook | 봇 게시 결과 알림 | `scripts/dailyTweet/notify.ts` |
| Cloudflare R2 | 미디어 저장 | `lib/r2Upload.ts`, 봇 `r2.ts` |
