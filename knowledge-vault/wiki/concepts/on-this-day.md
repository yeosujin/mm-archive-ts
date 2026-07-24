---
type: concept
status: stable
tags: [concept, domain]
created: 2026-07-24
updated: 2026-07-24
---

# 그해 오늘

**오늘과 같은 월/일을 가진 과거 콘텐츠**를 모아 보여주는 개념. 연도는 무시하고 `MM-DD`만 맞춘다.

이 프로젝트에서 두 곳에 나타나며, **판정 규칙은 같아야 한다.**

| 나타나는 곳 | 구현 |
|---|---|
| 홈 화면 '그 해 오늘' 섹션 | [[home-calendar]] |
| 매일 자정 X 자동 게시 | [[daily-tweet-bot]] |

## 판정 규칙

- 콘텐츠의 날짜에서 **월/일만** 비교한다
- 모먼트는 상위 영상이 있으면 **상위 영상의 날짜**로 판정한다. 독립 모먼트는 자기 날짜 → [[content-date-semantics]]
- 봇 쪽에는 추가 제약이 있다: **R2에 올라간 미디어만** 게시 대상이고 Videos는 제외된다

## 왜 날짜가 정확해야 하나

그해오늘은 **날짜 자체가 콘텐츠**다. 자정을 넘겨 게시되면 하루가 어긋나 의미가 깨진다. 봇의 스케줄 설계가 복잡한 이유가 이것이다 → [[bot-early-trigger-midnight-wait]]

## 관련
- [[home-calendar]] · [[daily-tweet-bot]] · [[content-date-semantics]] · [[bot-early-trigger-midnight-wait]]
