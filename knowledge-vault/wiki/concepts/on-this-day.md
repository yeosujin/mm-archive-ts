---
type: concept
status: stable
tags: [concept, domain]
created: 2026-07-24
updated: 2026-10-28
---

# 그해 오늘

**오늘과 같은 월/일을 가진 과거 콘텐츠**를 모아 보여주는 개념. 연도는 무시하고 `MM-DD`만 맞춘다.

이 프로젝트에서 두 곳에 나타나며, **판정 규칙은 같아야 한다.**

| 나타나는 곳 | 구현 |
|---|---|
| 홈 '그 해 오늘' 카드 + 스토리 뷰어 | [[home-calendar]], `lib/onThisDayStory.ts` |
| 매일 자정 X 자동 게시 | [[daily-tweet-bot]] |

## 판정 규칙

- 콘텐츠의 날짜에서 **월/일만** 비교한다
- 모먼트는 상위 영상이 있으면 **상위 영상의 날짜**로 판정한다. 독립 모먼트는 자기 날짜 → [[content-date-semantics]]
- 봇 쪽에는 추가 제약이 있다: **R2에 올라간 미디어만** 게시 대상이고 Videos는 제외된다

## 홈에서의 표현 (2.0.0~)

- `buildStoryYears`가 오늘과 `MM-DD`가 같은 과거 연도별로 프레임을 모은다(최신 연도 먼저). 프레임 순서: 영상의 모먼트 → 독립 모먼트 → 모먼트 없는 영상 → 사진(묶음 제목·번호 순) → 포스트(미디어마다) → 에피소드
- 카드 위 이름은 `그 해 M월 D일`, 해 이름은 `N년 전`
- **대체 날**: 오늘 그 해 오늘이 하나도 없으면 `pickFallbackDate`가 올해(없으면 콘텐츠가 있는 가장 최근 해) 오늘 이전 날 중 하나를 날짜 해시로 고정 선택한다. 이름은 `fallbackLabel` — `올해 M월 D일` / `작년 M월 D일` / `YYYY년 M월 D일`
- **자동 열기**: `shouldAutoOpen` — 진짜 그 해 오늘이 있는 날에만, 하루 한 번(`localStorage['mmemory.storyAutoShownDate']`). **대체 날은 절대 자동으로 열지 않는다**
- 확인용 `?date=YYYY-MM-DD`로 날짜를 바꾸면 '하루 한 번' 규칙은 건너뛰지만, 대체 날이면 여전히 안 연다. 이때는 기록도 남기지 않는다
- `?m=`·`?v=`가 이미 열려 있으면 자동으로 열지 않는다

## 왜 날짜가 정확해야 하나

그해오늘은 **날짜 자체가 콘텐츠**다. 자정을 넘겨 게시되면 하루가 어긋나 의미가 깨진다. 봇의 스케줄 설계가 복잡한 이유가 이것이다 → [[bot-early-trigger-midnight-wait]]

## 관련
- [[home-calendar]] · [[daily-tweet-bot]] · [[content-date-semantics]] · [[bot-early-trigger-midnight-wait]]
