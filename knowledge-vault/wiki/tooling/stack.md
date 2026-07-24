---
type: tooling
status: stable
tags: [tooling, stack]
created: 2026-07-24
updated: 2026-07-24
---

# 기술 스택

패키지명 `mmemory`. 모바일 우선 반응형 PWA → [[mobile-first-ui]]

## 구성

| 레이어 | 사용 기술 |
|---|---|
| 프론트엔드 | React 19 + TypeScript + Vite |
| 라우팅 | react-router-dom v7 (`createBrowserRouter`, 전 페이지 lazy + Suspense) |
| 데이터베이스 | [[supabase]] (PostgreSQL + pgvector) |
| 서버리스 | Supabase Edge Functions (Deno) + [[vercel]] Functions (`@vercel/node`) |
| 미디어 저장소 | [[cloudflare-r2]] (S3 호환) |
| AI | [[google-gemini]] (임베딩 + 답변 생성) — Edge Function에서만 호출 |
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
| `vite-plugin-pwa` | PWA 매니페스트 + 서비스워커 → [[pwa-setup]] |
| `sharp` | 서버 측 이미지 리사이즈 |
| `tsx` | 스크립트 실행 (봇, 백필) |
| `dotenv` | 스크립트용 `.env` 로드 |
| `vitest` | 테스트 러너 |

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

## 관련
- [[env-vars]] · [[pwa-setup]] · [[deploy]] · [[directory-structure]]
