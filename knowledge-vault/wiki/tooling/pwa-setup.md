---
type: tooling
status: stable
tags: [tooling, pwa]
created: 2026-07-24
updated: 2026-07-24
---

# PWA 설정

`vite.config.ts`의 `VitePWA` 플러그인(`vite-plugin-pwa`)이 매니페스트와 서비스워커를 만든다.

| 항목 | 값 |
|---|---|
| `registerType` | `autoUpdate` |
| `display` | `standalone` |
| `orientation` | `portrait` |
| `lang` | `ko` |
| `theme_color` | `#88C9F9` |

## navigateFallbackDenylist

```
[/^\/admin/, /^\/api/]
```

이 두 경로는 **SPA 폴백에서 제외**된다.

- `/api/*` — [[vercel]] 서버리스 함수. 서비스워커가 가로채면 OG 카드와 크롤러 응답이 깨진다 → [[og-image-generation]]
- `/admin/*` — 캐시된 셸이 뜨는 것을 막는다

새 서버 함수 경로를 만들면 이 목록에 걸리는지 확인한다.

## 주의

- `autoUpdate`라 배포 직후에도 이전 셸이 잠깐 남을 수 있다. 배포 후 확인은 새로고침 두 번
- 설치형(standalone)에서 깨지는 레이아웃은 버그다 → [[mobile-first-ui]]

## 관련
- [[stack]] · [[mobile-first-ui]] · [[og-image-generation]] · [[deploy]]
