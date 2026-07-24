---
type: meta
title: "Domains Index"
created: 2026-07-24
updated: 2026-07-24
tags: [meta, index]
---

# Domains

앱이 다루는 콘텐츠 종류. 사용자에게 보이는 단위다. 코드 배치는 [[architecture/_index|아키텍처]]를 본다.

| 페이지 | 라우트 | 네비 표시명 |
|---|---|---|
| [[videos-moments]] | `/videos`, `/moments` | **모먼트** / *숨김* |
| [[posts]] | `/posts` | 포스트 |
| [[photos]] | `/photos` | 사진 |
| [[episodes]] | `/episodes` | 에피소드 |
| [[articles]] | `/articles` | **도서관** |
| [[search]] | `/search` | 아이콘 |
| [[ask]] | `/ask`, `/ask/:id` | *숨김* |
| [[home-calendar]] | `/`, `/calendar` | 로고 / 캘린더 |
| [[settings]] | *어드민 전용* | — |

> [!key-insight]
> 네비 표시명과 내부 도메인명이 두 군데서 어긋난다. **모먼트 = `videos`**, **도서관 = `articles`**. 특히 `moments`가 별도로 존재하므로 "모먼트"라는 말이 나오면 어느 쪽인지 먼저 확인한다.

네비 항목은 `src/components/Layout.tsx`에 하드코딩되어 있다(데스크톱/모바일 각각 1벌). `moments`와 `ask`는 라우트만 있고 네비에 없다 — URL 직접 접근은 가능하다.
