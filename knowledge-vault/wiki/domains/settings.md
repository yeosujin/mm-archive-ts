---
type: domain
status: stable
tags: [domain, admin]
created: 2026-07-24
updated: 2026-07-24
---

# Settings

콘텐츠가 아니라 **앱 전역 설정**. 사용자에게 별도 화면이 없고 어드민 Dashboard에서만 다룬다.

## 다루는 것

| 설정 | 저장 |
|---|---|
| 멤버명 | `member1_name`, `member2_name` |
| 도서관 노출 여부 | `getArticlesVisibility` / `setArticlesVisibility` → [[articles]] |
| 홈 Featured Content 지정 | `featured.ts`의 `getFeaturedContent` / `setFeaturedContent` → [[home-calendar]] |

## 코드

| 위치 | 내용 |
|---|---|
| `src/lib/database/settings.ts` | `getMemberSettings`, `updateMemberSettings`, `getArticlesVisibility`, `setArticlesVisibility` |
| `src/lib/database/featured.ts` | `getFeaturedContent`, `setFeaturedContent` |
| 어드민 Dashboard | 편집 UI |

## 주의

- **멤버명이 설정값이다.** UI에 이름을 하드코딩하지 않는다
- **`articles_visible`는 한 곳이 아니라 다섯 곳에서 읽힌다** — `Layout.tsx`(네비), `Home.tsx`, `Search.tsx`, `Calendar.tsx`, `Articles.tsx`. 라우트는 살아 있고 각 화면이 개별적으로 가린다. 새 진입점을 만들면 여기서도 체크해야 한다
- `getMemberSettings`는 실패 시 `{ 멤버1, 멤버2, articles_visible: false }`로 폴백한다. 조회가 깨지면 도서관이 **조용히 숨겨진다**
- 어드민 화면도 anon 키로 직접 쓴다. 이 설정들을 지키는 것은 RLS뿐이다 → [[supabase-key-boundary]]

## 관련
- [[articles]] · [[home-calendar]] · [[database-layer]] · [[supabase-key-boundary]]
