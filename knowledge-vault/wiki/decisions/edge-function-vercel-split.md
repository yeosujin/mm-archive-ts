---
type: decision
status: stable
decision_date: unknown
tags: [decision, architecture, serverless, reconstructed]
created: 2026-07-24
updated: 2026-07-24
---

# 서버리스를 Edge Function과 Vercel Function으로 나눈다

> [!note] 사후 복원된 ADR
> 당시 기록이 없어 코드 배치에서 역추적했다. 경위는 추정으로 읽는다.

## 맥락

서버가 필요한 일이 두 종류였다.

1. **비밀을 쥐고 DB에 붙는 일** — Gemini 임베딩·생성, service-role 쓰기
2. **HTTP 응답 자체를 조립하는 일** — 크롤러에게 OG 메타태그를 주고 PNG를 그려 주는 일

## 결정

두 런타임을 목적으로 갈라 쓴다.

| 런타임 | 위치 | 맡는 일 |
|---|---|---|
| Supabase Edge Functions (Deno) | `supabase/functions/` | `semantic-search`, `embed-content`, `rag-answer` — DB·AI 키를 쥐는 쪽 |
| Vercel Functions (`@vercel/node`) | `api/` | `og.ts`, `ask/[id].ts` — 크롤러 응답과 이미지 렌더 |

## 기각한 대안

| 대안 | 기각 이유 |
|---|---|
| 전부 Vercel | DB·AI 키가 Vercel 환경변수로 흩어진다. Supabase 안에서 DB에 붙는 편이 짧다 |
| 전부 Edge Function | `satori`·`@resvg/resvg-js`·`sharp`는 Node 네이티브 의존이 있어 Deno 런타임에 얹기 곤란하다 |

## 결과

- 시크릿 저장소가 둘로 나뉜다 (Supabase Edge secrets / Vercel env) → [[env-vars]]
- `api/*`는 PWA 서비스워커 폴백에서 빠져야 한다 → [[pwa-setup]]
- Edge Function을 배포하려면 Vercel 배포와 별개로 `supabase functions deploy`가 필요하다. 프론트만 배포하고 함수를 안 올려 안 맞는 상황이 생길 수 있다

## 관련
- [[og-image-generation]] · [[embedding-semantic-search]] · [[supabase]] · [[vercel]] · [[env-vars]]
