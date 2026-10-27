---
type: tooling
status: stable
enforcement: must
tags: [tooling, env, security]
created: 2026-07-24
updated: 2026-10-27
---

# 환경변수

`.env` / `.env.local`에 둔다. **`.env.example`은 저장소에 없다** — 이 표가 사실상의 템플릿이다.

Vite 규칙상 **`VITE_` 접두사가 붙은 것만 클라이언트 번들에 들어간다.** 이 성질이 곧 보안 경계다 → [[supabase-key-boundary]]

| 변수 | 쓰이는 곳 |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 프론트 DB 접근 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버/봇 전용 쓰기 — **클라이언트 노출 금지** |
| `VITE_R2_PUBLIC_URL` | R2 공개 URL (클라이언트) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | `api/r2.ts` 전용 — **`VITE_` 금지** |
| `ADMIN_PASSWORD` | `api/r2.ts`가 어드민 비밀번호 검증 — **`VITE_` 금지** |
| `VITE_R2_ACCOUNT_ID`, `VITE_R2_ACCESS_KEY_ID`, `VITE_R2_SECRET_ACCESS_KEY`, `VITE_R2_BUCKET_NAME` | `scripts/`(봇·remux)만 `process.env`로 읽는다. 클라이언트 코드에서 참조하면 다시 번들에 들어간다 |
| `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | X 게시 봇 |
| `DISCORD_WEBHOOK_URL` | 봇 게시 결과 알림 |

## 다른 저장 위치

| 위치 | 무엇 |
|---|---|
| GitHub Actions Secrets | 봇용 전체 (`.github/workflows/daily-tweet.yml` 참조) |
| Supabase Edge Function secrets | Gemini 키, service-role |
| Vercel 프로젝트 환경변수 | 배포 빌드용 `VITE_*`, `api/r2.ts`용 `R2_*`·`ADMIN_PASSWORD` |

## 주의

> [!warning]
> 1.21.1까지는 R2 자격증명과 어드민 비밀번호가 `VITE_`로 번들에 들어가 있었다. 1.21.2부터 서버 전용(`api/r2.ts`)으로 옮겼다. Vite는 **코드에서 참조된** `VITE_*`만 인라인하므로, `src/`에서 `import.meta.env.VITE_R2_SECRET_ACCESS_KEY` 같은 참조를 다시 만들면 즉시 재노출된다.

## 관련
- [[supabase-key-boundary]] · [[stack]] · [[cloudflare-r2]] · [[daily-tweet-bot]]
