---
type: domain
status: stable
tags: [domain, home, calendar]
created: 2026-07-24
updated: 2026-07-24
---

# Home & Calendar

## 한 줄 정의

전 도메인 데이터를 가로질러 보여주는 두 화면. 자체 데이터를 갖지 않고 다른 도메인을 집계한다.

## Home

- 라우트: `/`, 네비에서는 로고
- 페이지: `src/pages/Home.tsx`

구성 요소 세 가지:

| 요소 | 내용 |
|---|---|
| 검색바 | AI 모드 토글 포함 → [[search]] |
| **그 해 오늘** | 오늘과 같은 월/일의 과거 콘텐츠. `components/OnThisDay.tsx` + `lib/dailyPick.ts` → [[on-this-day]] |
| **PICK** | 어드민이 지정한 Featured Content. 그 해 오늘이 비었을 때 폴백으로 표시 |

## Calendar

- 라우트: `/calendar`, 네비 표시명 **캘린더**
- 페이지: `src/pages/Calendar.tsx`

- 2020년~현재 범위
- 모든 도메인 데이터를 날짜별로 집계
- 콘텐츠 클릭 시 해당 아이템을 자동으로 펼치고 강조
- URL 파라미터로 상태 유지 (`?year=2025&month=1`)

## Settings

전용 페이지 없이 어드민 Dashboard에서 관리한다. `src/lib/database/settings.ts`, `src/lib/database/featured.ts`.

- 멤버명 (`member1_name`, `member2_name`)
- 도서관 노출 여부 → [[articles]]
- 홈 Featured Content 지정

## 함정

- Calendar는 **전 도메인을 다 읽는다.** 데이터가 늘수록 이 화면이 가장 먼저 느려진다
- 두 화면 모두 `date` 필드를 기준으로 집계하는데, 이 값은 등록일이 아니라 콘텐츠 원본 날짜다 → [[content-date-semantics]]

## 관련
- [[on-this-day]] · [[search]] · [[content-date-semantics]] · [[data-model]]
