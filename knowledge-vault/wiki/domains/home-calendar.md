---
type: domain
status: stable
tags: [domain, home, calendar]
created: 2026-07-24
updated: 2026-10-28
---

# Home & Calendar

## 한 줄 정의

전 도메인 데이터를 가로질러 보여주는 두 화면. 자체 데이터를 갖지 않고 다른 도메인을 집계한다.

## Home (2.0.0~)

- 라우트: `/`, 탭 **홈**
- 페이지: `src/pages/Home.tsx`

위에서 아래로:

| 요소 | 내용 |
|---|---|
| **그 해 오늘 카드** | `components/home/OnThisDayCards.tsx`. 연도가 아니라 **콘텐츠 하나당 카드 하나**(같은 영상의 모먼트·같은 묶음 사진·같은 포스트 미디어는 한 카드, `groupStoryContents`). 누르면 그 카드부터 스토리를 연다 → [[on-this-day]] |
| 검색 | 키워드/AI 토글. **기본값은 AI** → [[search]] |
| **새로 올라온 영상** | `latestVideos`(`created_at` 내림차순 9개). 누르면 영상 상세 모달(`?v=`) |
| 문의 링크 | `궁금한 점이나 요청 남기러 가기 →` (`/ask`) |

- 스토리 뷰어(`components/StoryViewer.tsx`, `components/story/StoryFrameView.tsx`, `lib/onThisDayStory.ts`)는 쿼리 `?s=YEAR[.FRAME]`로 열린다. 카드에서 커지며 열리고(FLIP 확대) 닫힐 때 그 카드로 돌아간다. 장면 사이 검은 화면이 없도록 포스터(썸네일)를 먼저 깔고 다음 장면을 미리 받는다
- 세션 첫 홈 진입이면 로고 화면(`components/EntrySplash.tsx`, `lib/entrySplash.ts`)을 띄운다. 최소 0.6초, 늦어도 2.5초면 내린다. 다른 경로로 들어오면 안 띄운다
- 자동 열기 규칙 → [[on-this-day]]
- 목록 데이터는 `lib/dataCache.ts`가 `localStorage`에 남겨 다음 방문에 바로 그린다 → [[directory-structure]]
- PICK(홈 메인 걸기, Featured Content)은 2.0.0에서 홈·어드민 모두 제거

## Calendar

- 라우트: `/calendar`, 헤더의 캘린더 아이콘
- 페이지: `src/pages/Calendar.tsx`

- 2020년~현재 범위
- 모든 도메인 데이터를 날짜별로 집계 (영상·영상 없는 모먼트·포스트·사진·에피소드). 사진은 같은 날 같은 제목(끝 `-N` 제외)을 한 묶음으로 보이고 누르면 `/photos?highlight=`로 첫 장을 연다. 날짜 점 색: 빨(영상)·주(모먼트)·노(포스트)·초(에피소드)·파(사진)
- 콘텐츠 클릭 시 해당 아이템을 자동으로 펼치고 강조
- URL 파라미터로 상태 유지 (`?year=2025&month=1`)

## Settings

전용 페이지 없이 어드민 Dashboard에서 관리한다(`src/lib/database/settings.ts`). 2.0.0부터는 멤버명(`member1_name`, `member2_name`)만 남았다 → [[settings]]

## 함정

- Calendar는 **전 도메인을 다 읽는다.** 데이터가 늘수록 이 화면이 가장 먼저 느려진다
- 두 화면 모두 `date` 필드를 기준으로 집계하는데, 이 값은 등록일이 아니라 콘텐츠 원본 날짜다 → [[content-date-semantics]]

## 관련
- [[on-this-day]] · [[videos-moments]] · [[search]] · [[content-date-semantics]] · [[data-model]]
