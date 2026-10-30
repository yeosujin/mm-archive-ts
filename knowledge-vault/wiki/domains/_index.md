---
type: meta
title: "Domains Index"
created: 2026-07-24
updated: 2026-10-30
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
| [[articles]] | ~~`/articles`~~ | *2.0.0에서 제거* |
| [[search]] | `/search` | 아이콘 |
| [[ask]] | `/ask`, `/ask/:id` | *숨김* |
| [[home-calendar]] | `/`, `/calendar` | 홈 / 캘린더 |
| [[settings]] | *어드민 전용* | — |

> [!key-insight]
> 네비 표시명과 내부 도메인명이 어긋난다. **모먼트 = `videos`**. 특히 `moments`가 별도로 존재하므로 "모먼트"라는 말이 나오면 어느 쪽인지 먼저 확인한다.

네비는 `src/components/Layout.tsx`의 헤더 + 상단 글자 탭 한 벌(모든 화면 크기 공통, 2.0.0~). 아래로 스크롤하면 헤더가 숨고 위로 올리면 다시 나온다이다. 헤더 첫 줄은 가운데 로고 + 오른쪽 돋보기(홈은 본문에 검색창이 있어 없음). 탭: 홈 · 모먼트 · 포스트 · 사진 · 에피소드 · 캘린더. 검색 화면은 로고 줄 대신 검색창, 탭 줄 없음. `moments`, `ask`는 탭에 없고 URL로만 들어간다.
