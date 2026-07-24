---
type: tooling
status: stable
enforcement: must
tags: [tooling, env, security]
created: 2026-07-24
updated: 2026-07-24
---

# 환경변수

`.env` / `.env.local`에 둔다. **`.env.example`은 저장소에 없다** — 이 표가 사실상의 템플릿이다.

Vite 규칙상 **`VITE_` 접두사가 붙은 것만 클라이언트 번들에 들어간다.** 이 성질이 곧 보안 경계다 → [[supabase-key-boundary]]

| 변수 | 쓰이는 곳 |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 프론트 DB 접근 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버/봇 전용 쓰기 — **클라이언트 노출 금지** |
| `VITE_R2_ACCOUNT_ID`, `VITE_R2_ACCESS_KEY_ID`, `VITE_R2_SECRET_ACCESS_KEY`, `VITE_R2_BUCKET_NAME`, `VITE_R2_PUBLIC_URL` | R2 업로드/조회 |
| `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | X 게시 봇 |
| `DISCORD_WEBHOOK_URL` | 봇 게시 결과 알림 |

## 다른 저장 위치

| 위치 | 무엇 |
|---|---|
| GitHub Actions Secrets | 봇용 전체 (`.github/workflows/daily-tweet.yml` 참조) |
| Supabase Edge Function secrets | Gemini 키, service-role |
| Vercel 프로젝트 환경변수 | 배포 빌드용 `VITE_*` |

## 주의

> [!warning]
> R2 자격증명이 `VITE_` 접두사로 클라이언트에 노출된다. 브라우저에서 직접 멀티파트 업로드를 하기 때문인데, **버킷 권한이 곧 노출 범위**다. 키 회전이나 권한 축소를 검토할 때 이 사실을 전제로 본다.

## 관련
- [[supabase-key-boundary]] · [[stack]] · [[cloudflare-r2]] · [[daily-tweet-bot]]
