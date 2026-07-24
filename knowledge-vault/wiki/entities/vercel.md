---
type: entity
status: stable
tags: [entity, hosting]
created: 2026-07-24
updated: 2026-07-24
---

# Vercel

프론트엔드 호스팅 + 서버리스 함수. **`main` 푸시 시 자동 배포**된다 → [[deploy]]

## 쓰는 방식

| 대상 | 내용 |
|---|---|
| 정적 호스팅 | Vite 빌드 산출물 (`dist/`) |
| Functions (`api/`) | `og.ts` — OG 이미지 렌더 → [[og-image-generation]] |
| | `ask/[id].ts` — 크롤러 UA면 OG 메타 HTML, 아니면 SPA |

`@vercel/node` 런타임을 쓴다. `satori`·`@resvg/resvg-js`·`sharp` 같은 Node 네이티브 의존이 필요해 이쪽에 뒀다 → [[edge-function-vercel-split]]

## 주의

- **`main` 푸시가 곧 배포다.** blast radius가 크다 → [[git-and-version]]
- `VITE_*` 환경변수를 Vercel 프로젝트 설정에도 등록해야 빌드가 맞는다 → [[env-vars]]
- `api/*`는 PWA 서비스워커 폴백에서 제외돼 있어야 한다 → [[pwa-setup]]

## 관련
- [[deploy]] · [[og-image-generation]] · [[edge-function-vercel-split]] · [[pwa-setup]]
