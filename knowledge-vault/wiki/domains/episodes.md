---
type: domain
status: stable
tags: [domain, episodes, activities]
created: 2026-07-24
updated: 2026-09-18
---

# Episodes (에피소드)

## 한 줄 정의

두 멤버 사이의 대화·상호작용 기록. DM, 댓글, 리스닝 파티 3종.

## 위치

- 라우트: `/episodes`, 네비 표시명 **에피소드**
- 공개 페이지: `src/pages/Episodes.tsx`
- 어드민: `src/pages/admin/AdminEpisodes.tsx`
- DB 모듈: `src/lib/database/episodes.ts`, `src/lib/database/activities.ts`
- 보조: `src/lib/episodeHelpers.ts`

## 동작

- 타입 3종: `dm` | `comment` | `listening_party`
- 메시지는 배열이고 각 항목이 `text` 또는 `image`
- 다른 콘텐츠와 연결 가능 — `linked_content_type`(`video` | `moment` | `post`) + `linked_content_id`
- URL 파라미터로 탭 유지 (`?tab=dm`)

## 트윗 이미지 (`tweet_images`)

어드민에서만 첨부하는 **X 봇 전용 이미지**(R2 URL 배열, 최대 4장). 컴포넌트는
`src/components/AdminTweetImages.tsx`, 타입 3종이 같은 필드를 공유한다.

- **공개 페이지에는 렌더링하지 않는다.** 에피소드 본문(`messages`의 `image`)과는 별개다 —
  본문 이미지는 사이트에 보이고, 이건 안 보인다
- [[daily-tweet-bot]]이 "그 해 오늘"에 걸린 에피소드에서 이 배열만 읽어 트윗에 올린다
- 배열 순서 = 트윗 안 미디어 순서. 에피소드 1개 = 트윗 1개(`groupKey`가 에피소드 id)
- 마이그레이션: `supabase/sql/2026-09-18-add-episode-tweet-images.sql`

## Activities

에피소드에 붙이는 **활동 태그 마스터 데이터**. `src/lib/database/activities.ts`.

- 전용 페이지가 없다. 어드민 에피소드 화면에서만 관리한다
- `Activity`는 `Ask`와 함께 **`created_at`을 가진 둘뿐인 모델**이다 → [[content-date-semantics]]

## 함정

- 연결된 콘텐츠가 삭제돼도 `linked_content_id`는 남는다. 참조 무결성이 DB 레벨에서 강제되지 않는다
- Activities는 진입점이 어드민 한 곳뿐이라 존재를 놓치기 쉽다

## 관련
- [[data-model]] · [[content-date-semantics]]
