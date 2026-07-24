---
type: entity
status: stable
tags: [entity, external]
created: 2026-07-24
updated: 2026-07-24
---

# 그 밖의 외부 연동

전용 페이지를 둘 만큼 크지 않은 외부 의존들. 주요 서비스는 [[entities/_index]]의 나머지 항목을 본다.

| 대상 | 용도 | 호출 위치 |
|---|---|---|
| YouTube Data API v3 | 영상 메타데이터 자동 수집 | 어드민 영상 등록 |
| Twitter Widget / `react-tweet` | 트윗 임베드 (API 호출 아님) | `components/TweetEmbed.tsx` |
| Instagram Embed | 인스타 임베드 | `components/PostEmbed.tsx` |
| Postype | 아티클 메타데이터 크롤링 | Supabase Edge Function |
| Discord Webhook | 봇 게시 결과 알림 | `scripts/dailyTweet/notify.ts` |

## 주의

- **Postype 크롤링은 상대 사이트 HTML 구조에 의존한다.** 구조가 바뀌면 조용히 빈 메타데이터가 들어온다 → [[articles]]
- 임베드(트윗·인스타)는 상대 서비스가 스크립트를 내려주지 않으면 렌더가 비어 보인다. 우리 쪽 에러로 잡히지 않는다
- YouTube Data API로 가져온 **제목**이 카테고리 분류의 입력이다. 제목이 바뀌면 분류가 깨진다 → [[videos-moments]]

## 관련
- [[videos-moments]] · [[posts]] · [[articles]] · [[daily-tweet-bot]]
