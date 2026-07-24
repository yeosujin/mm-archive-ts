---
type: convention
status: stable
enforcement: must
tags: [convention, security, supabase]
created: 2026-07-24
updated: 2026-07-24
---

# Supabase 키 경계

## 규칙

**`SUPABASE_SERVICE_ROLE_KEY`는 클라이언트 번들에 절대 들어가면 안 된다. `VITE_` 접두사를 붙이지 말 것.**

Vite는 `VITE_`로 시작하는 환경변수를 **번들에 문자열로 인라인**한다. 접두사를 붙이는 순간 브라우저에서 누구나 읽을 수 있고, service-role 키는 RLS를 전부 우회한다.

## 경계

| 영역 | 쓰는 키 | 이유 |
|---|---|---|
| 브라우저 (`src/`) | `VITE_SUPABASE_ANON_KEY` | 번들에 노출됨. RLS가 막아 준다 |
| Edge Functions (`supabase/functions/`) | `SUPABASE_SERVICE_ROLE_KEY` | Deno 런타임, 클라이언트에 안 감 |
| Node 스크립트 (`scripts/`) | `SUPABASE_SERVICE_ROLE_KEY` | CI 시크릿 / 로컬 `.env` |

service-role을 쓰는 지점은 현재 네 곳뿐이다.

- `scripts/dailyTweet/dedup.ts`
- `supabase/functions/semantic-search/index.ts`
- `supabase/functions/embed-content/index.ts`
- `supabase/functions/rag-answer/index.ts`

## 따라오는 사실 — RLS가 유일한 방어선

어드민 화면(`src/pages/admin/`)도 **anon 키로 직접 쓰기를 한다.** `answerAsk`/`deleteAsk` 같은 함수가 `AdminAsks.tsx`에서 그대로 호출된다.

> [!important]
> 어드민 비밀번호는 **UI 게이트일 뿐**이다. 네트워크 요청을 직접 만들면 우회된다.
> 따라서 쓰기 권한을 실제로 통제하는 것은 **Supabase RLS 정책 하나뿐**이다. RLS를 느슨하게 열면 그 순간 아무나 쓰기가 가능해진다.

RLS 정책을 손댈 때는 이 사실을 전제로 검토한다.

## 확인 방법

```bash
grep -rn "SERVICE_ROLE" src/          # 결과가 있으면 사고
grep -rn "VITE_.*SERVICE" .           # 결과가 있으면 사고
```

## 관련
- [[supabase]] · [[env-vars]] · [[database-layer]] · [[edge-function-vercel-split]]
