# 기술 스택

패키지명 `mmemory`. 모바일 우선 반응형 PWA.

## 구성

| 레이어 | 사용 기술 |
|---|---|
| 프론트엔드 | React 19 + TypeScript + Vite |
| 라우팅 | react-router-dom v7 (`createBrowserRouter`, 전 페이지 lazy + Suspense) |
| 데이터베이스 | Supabase (PostgreSQL + pgvector) |
| 서버리스 | Supabase Edge Functions (Deno) + Vercel Functions (`@vercel/node`) |
| 미디어 저장소 | Cloudflare R2 (S3 호환) |
| AI | Google Gemini (임베딩 + 답변 생성) — Edge Function에서만 호출 |
| 배포 | Vercel (`main` push 시 자동 배포) |
| 자동화 | GitHub Actions (일일 X 게시 봇) |
| 테스트 | Vitest |

## 런타임 의존성

| 패키지 | 용도 |
|---|---|
| `@supabase/supabase-js` | DB 접근, Edge Function 호출 |
| `@tanstack/react-query` | 서버 상태 (자체 `DataContext` 캐시와 병행) |
| `react-router-dom` | 라우팅 |
| `@aws-sdk/client-s3`, `lib-storage`, `s3-request-presigner` | R2 업로드(멀티파트) / 서명 URL |
| `@ffmpeg/ffmpeg`, `@ffmpeg/util` | 브라우저에서 영상 첫 프레임 썸네일 추출 |
| `thumbhash` | 이미지 blur placeholder 생성 |
| `tesseract.js` | OCR |
| `satori` | JSX → SVG (OG 이미지) |
| `@resvg/resvg-js` | SVG → PNG (OG 이미지) |
| `@vercel/node` | Vercel 서버리스 함수 타입/런타임 |
| `react-tweet` | 트윗 임베드 |
| `twitter-api-v2` | X(Twitter) 게시 — 봇 전용 |

## 개발 의존성 중 주의할 것

| 패키지 | 용도 |
|---|---|
| `vite-plugin-pwa` | PWA 매니페스트 + 서비스워커 |
| `sharp` | 서버 측 이미지 리사이즈 |
| `tsx` | 스크립트 실행 (봇, 백필) |
| `dotenv` | 스크립트용 `.env` 로드 |
| `vitest` | 테스트 러너 |

## PWA 설정

`vite.config.ts`의 `VitePWA`:

- `registerType: 'autoUpdate'`
- `display: standalone`, `orientation: portrait`, `lang: ko`
- `theme_color: #88C9F9`
- `navigateFallbackDenylist: [/^\/admin/, /^\/api/]` — 어드민과 API는 SPA 폴백에서 제외

## npm 스크립트

```
dev                 vite 개발 서버
build               tsc -b && vite build
lint                eslint .
test                vitest run
preview             vite preview
tweet:dry           그해오늘 봇 dry-run (게시 안 함)
backfill:thumb-hash 기존 이미지 ThumbHash 백필
backfill:embeddings 기존 콘텐츠 임베딩 백필
```

## 환경변수

`.env` / `.env.local` (Vite 규칙상 `VITE_` 접두사만 클라이언트에 노출됨).

| 변수 | 쓰이는 곳 |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 프론트 DB 접근 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버/봇 전용 쓰기 — **클라이언트 노출 금지** |
| `VITE_R2_ACCOUNT_ID`, `VITE_R2_ACCESS_KEY_ID`, `VITE_R2_SECRET_ACCESS_KEY`, `VITE_R2_BUCKET_NAME`, `VITE_R2_PUBLIC_URL` | R2 업로드/조회 |
| `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | X 게시 봇 |
| `DISCORD_WEBHOOK_URL` | 봇 게시 결과 알림 |

봇용 시크릿은 GitHub Actions Secrets에도 동일하게 등록되어 있다 (`.github/workflows/daily-tweet.yml`).

## 버전 규칙

`package.json`의 `version`을 기능 변경 시 올린다.

- patch — 버그 수정, 작은 스타일 변경
- minor — 새 기능, 큰 UI 변경
- major — 호환성 깨지는 대규모 변경
