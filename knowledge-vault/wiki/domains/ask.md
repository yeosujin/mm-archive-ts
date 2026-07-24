---
type: domain
status: stable
tags: [domain, ask]
created: 2026-07-24
updated: 2026-07-24
---

# Ask (익명 질문)

## 한 줄 정의

방문자가 익명으로 질문을 남기고 운영자가 답변하는 창구. 답변은 개별 URL로 공유된다.

## 위치

- 라우트: `/ask`, `/ask/:id` — **네비 숨김**
- 공개 페이지: `src/pages/Ask.tsx`, `src/pages/AskDetail.tsx`
- 어드민: `src/pages/admin/AdminAsks.tsx`
- DB 모듈: `src/lib/database/asks.ts`
- 이미지 업로드: `src/lib/askStorage.ts`
- 공유용 서버 함수: `api/ask/index.ts`, `api/ask/[id].ts`

## 동작

- 질문 작성 시 이미지 최대 3장 첨부
- 상태: `pending` → `answered`
- 답변된 질문은 `/ask/:id`로 개별 공유. 크롤러가 요청하면 동적 OG 카드 이미지를 반환한다 → [[og-image-generation]]
- 이미지에 TTL이 있어 만료분을 정리한다 (`getExpiredImageAsks`, `clearAskImageUrl`)

## 함정

- **네비에 진입점이 없다.** 검색이나 직접 URL로만 도달한다. 사용자가 이 기능의 존재를 모를 가능성이 높다
- 만료 이미지 정리는 cron이 아니라 **어드민이 `AdminAsks` 화면을 열 때** 클라이언트에서 실행된다. 어드민이 안 들어가면 정리되지 않는다
- `Ask`는 `Activity`와 함께 `created_at`을 가진 둘뿐인 모델이다 → [[content-date-semantics]]

## 관련
- [[og-image-generation]] · [[supabase-key-boundary]] · [[content-date-semantics]]
