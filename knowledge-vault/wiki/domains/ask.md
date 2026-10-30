---
type: domain
status: stable
tags: [domain, ask]
created: 2026-07-24
updated: 2026-10-30
---

# Ask (익명 질문)

## 한 줄 정의

방문자가 익명으로 질문을 남기고 운영자가 답변하는 창구. 답변은 개별 URL로 공유된다.

## 위치

- 라우트: `/ask`, `/ask/:id` — 탭에는 없고 헤더 왼쪽 물음표 아이콘(2.1.0~)과 홈 맨 아래 링크로 들어간다
- 공개 페이지: `src/pages/Ask.tsx`, `src/pages/AskDetail.tsx`
- 어드민: `src/pages/admin/AdminAsks.tsx`
- DB 모듈: `src/lib/database/asks.ts`
- 이미지 업로드: `src/lib/askStorage.ts`
- 공유용 서버 함수: `api/ask/index.ts`, `api/ask/[id].ts`

## 화면 (2.1.0)

- 헤더는 다른 화면과 같은 로고 줄. 문의 화면에선 왼쪽 물음표 자리가 **홈 아이콘**이 된다(탭 줄이 없어서 나가는 길)
- 위: 제목 `궁금한 점·요청` + 안내(답변은 아래 목록에, 비공개면 공개 안 됨) + 입력 상자(글·사진 3장·글자 수·검은 `보내기`)
- 아래: `답변 모음 N개` + 둥근 검색창(`mc-search`) + **대화형 카드** — 질문은 왼쪽 회색 말풍선, 답변은 오른쪽 하늘색. 에피소드 DM 말풍선과 같은 색감 (`components/AskBubbles.tsx`, `styles/ask.css`)
- 상세 `/ask/:id`: 같은 말풍선 + `공유하기`(휴대폰 공유 시트, 안 되면 링크 복사) · `나도 질문하기` · `다른 답변 보기`

## 동작

- 질문 작성 시 이미지 최대 3장 첨부
- 상태: `pending` → `answered`
- 답변된 질문은 `/ask/:id`로 개별 공유. 크롤러가 요청하면 동적 OG 카드 이미지를 반환한다 → [[og-image-generation]]
- 이미지에 TTL이 있어 만료분을 정리한다 (`getExpiredImageAsks`, `clearAskImageUrl`)

## 함정

- 만료 이미지 정리는 cron이 아니라 **어드민이 `AdminAsks` 화면을 열 때** 클라이언트에서 실행된다. 어드민이 안 들어가면 정리되지 않는다
- `Ask`는 `Activity`와 함께 `created_at`을 가진 둘뿐인 모델이다 → [[content-date-semantics]]

## 관련
- [[og-image-generation]] · [[supabase-key-boundary]] · [[content-date-semantics]]
