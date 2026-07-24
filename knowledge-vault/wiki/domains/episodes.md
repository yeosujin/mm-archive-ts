---
type: domain
status: stable
tags: [domain, episodes, activities]
created: 2026-07-24
updated: 2026-07-24
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

## Activities

에피소드에 붙이는 **활동 태그 마스터 데이터**. `src/lib/database/activities.ts`.

- 전용 페이지가 없다. 어드민 에피소드 화면에서만 관리한다
- `Activity`는 `Ask`와 함께 **`created_at`을 가진 둘뿐인 모델**이다 → [[content-date-semantics]]

## 함정

- 연결된 콘텐츠가 삭제돼도 `linked_content_id`는 남는다. 참조 무결성이 DB 레벨에서 강제되지 않는다
- Activities는 진입점이 어드민 한 곳뿐이라 존재를 놓치기 쉽다

## 관련
- [[data-model]] · [[content-date-semantics]]
