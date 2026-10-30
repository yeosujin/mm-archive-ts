---
type: domain
status: stable
tags: [domain, home, calendar]
created: 2026-07-24
updated: 2026-10-30
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

## Calendar (2.1.0~ 표지 달력)

- 라우트: `/calendar`, 상단 탭 맨 끝 `캘린더` (2.2.0~, 전에는 헤더 아이콘). 홈 '그 해 오늘' 제목 옆 `캘린더 ›` 링크도 있다
- 페이지: `src/pages/Calendar.tsx`, 날짜별 집계는 `src/lib/calendarDays.ts`, 스타일은 `src/styles/calendar.css`

위에서 아래로:

| 요소 | 내용 |
|---|---|
| **연월 머리** | `10월 2026 ▾` + "기록 있는 날 N일 · M개". 오른쪽 ‹ ›로 한 달씩. 달력을 좌우로 밀어도 넘어간다 |
| **연·월 선택** | 연월을 누르면 달력을 밀지 않고 그 아래에 떠서 열린다(바깥 누르기·Esc로 닫힘). 연도 칩 + 12개월 칸. 첫 기록 달 ~ 이번 달 밖은 못 고르고, 기록 없는 달은 흐리게. 달을 누르면 그 달로 가고 닫힌다 |
| **표지 달력** | 기록 있는 날은 칸 전체가 그날 표지(`dayCover`): 영상 표지 → 모먼트 → 사진 → 포스트 미디어. 이미지 없는 영상은 플랫폼 색(`vcover-*`), 에피소드만 있는 날은 종류 알약(`DM`·`댓글`·`리스닝`, 색은 아래 말풍선 규칙), 글 포스트만 있는 날은 흰 칸. 여러 개면 `+N`. 오늘은 숫자에 채운 알약, 고른 날은 `--accent` 테두리. 선택 표시(고른 날·연도 칩·달)는 모두 `--accent` |
| **고른 날** | 날짜 제목 + `스토리` 버튼 + 카드 레일. 에피소드 카드는 에피소드 페이지 말풍선을 줄인 캡처(보낸 사람 + 첫 메시지 3개). 말풍선 색은 에피소드 페이지와 같다: DM은 보낸 멤버 색(member1 하늘·member2 파랑), 댓글·리스닝 파티는 회색 |

- 집계 대상: 영상·모먼트·사진·포스트·에피소드. 상위 영상과 날짜가 같은 모먼트는 영상에 묶고, 다르면 자기 날짜에 `/videos/:video_id?m=` 링크로 둔다(영상 없는 모먼트는 `/moments?highlight=`). 사진은 같은 날 같은 제목(끝 `-N` 제외)을 한 묶음
- 고른 날 기본값: 오늘(기록 있을 때) → 오늘 이전 마지막 기록 날 → 그 달 첫 기록 날
- 카드를 누르면 페이지를 옮기지 않고 캘린더 위에 띄운다(모두 URL 쿼리라 뒤로가기로 닫힌다. 새 탭 클릭은 각 페이지 링크)
  - 영상 → `?v=` 영상 상세 모달(`VideoDetailModal`)
  - 모먼트 → `?m=` 모먼트 뷰어. 영상에 딸리면 그 영상의 모먼트 목록, 아니면 그 하나
  - 사진·포스트·에피소드 → `?d=kind:id`, `components/calendar/EntryDetail.tsx`. 사진은 묶음 라이트박스(번호순), 포스트는 `PostDetailContent`, 에피소드는 `EpisodeContentBody`를 각 페이지와 같은 모양(클래스)으로
- `스토리`는 그 날짜 하나로 만든 스토리(`buildStoryForDate`)를 `StoryViewer`로 연다. 뷰어 이름은 `fallbackLabel`(올해/작년 M월 D일)
- 오늘 판정은 `getTodayString`(로컬 시간, `?date=` 덮어쓰기 가능)
- 유튜브 칸 표지는 `mqdefault`(16:9). `hqdefault`는 4:3 검은 띠가 작은 칸에서 보인다
- URL 파라미터로 보는 달 유지 (`?year=2025&month=1`, 기록 범위 밖이면 이번 달)
- 데이터는 홈·모먼트와 같은 `useData` 캐시를 쓴다

## Settings

전용 페이지 없이 어드민 Dashboard에서 관리한다(`src/lib/database/settings.ts`). 2.0.0부터는 멤버명(`member1_name`, `member2_name`)만 남았다 → [[settings]]

## 함정

- Calendar는 **전 도메인을 다 읽는다.** 캐시(`useData`)를 같이 쓰지만 데이터가 늘수록 이 화면이 가장 먼저 느려진다
- 두 화면 모두 `date` 필드를 기준으로 집계하는데, 이 값은 등록일이 아니라 콘텐츠 원본 날짜다 → [[content-date-semantics]]

## 관련
- [[on-this-day]] · [[videos-moments]] · [[search]] · [[content-date-semantics]] · [[data-model]]
