---
type: entity
status: stable
tags: [entity, social]
created: 2026-07-24
updated: 2026-07-24
---

# X (Twitter) API

'그해오늘' 자동 게시에만 쓴다. 클라이언트는 이 API를 호출하지 않는다.

## 쓰는 방식

- `twitter-api-v2` 패키지, `scripts/dailyTweet/x.ts`
- 미디어 업로드 후 `postThread`로 스레드 게시
- 인증: `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` → [[env-vars]]

## 제약

- **트윗당 미디어 최대 4개.** `planTweets`가 이 한계로 그룹을 나눈다
- **업로드할 파일이 있어야 한다.** 외부 URL은 못 올린다 → R2 미디어만 대상 → [[cloudflare-r2]]
- 별개로 프론트에는 `react-tweet`로 트윗을 **임베드**만 한다. API 호출이 아니다

## 관련
- [[daily-tweet-bot]] · [[cloudflare-r2]] · [[env-vars]]
