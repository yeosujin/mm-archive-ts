---
type: domain
status: stable
tags: [domain, posts]
created: 2026-07-24
updated: 2026-07-24
---

# Posts (포스트)

## 한 줄 정의

SNS 게시물 아카이브. 트위터/X, 인스타그램, 위버스 등의 글과 첨부 미디어를 담는다.

## 위치

- 라우트: `/posts`, 네비 표시명 **포스트**
- 공개 페이지: `src/pages/Posts.tsx`
- 어드민: `src/pages/admin/AdminPosts.tsx`
- DB 모듈: `src/lib/database/posts.ts`

## 동작

- 플랫폼: `twitter` | `instagram` | `weverse` | `other`
- URL 입력 시 플랫폼 자동 감지 (`src/lib/platformUtils.ts`)
- 그리드 썸네일 → 클릭 시 상세 모달
- 상세 모달: 미디어 캐러셀(스와이프 지원) + 헤더 sticky + 본문
- 긴 본문은 3줄 말줄임 후 "더보기"
- 미디어는 `PostMedia[]` 배열로 여러 개 첨부 가능

## 함정

- 영상 미디어는 `<source>` 태그로 MIME을 **명시해야 한다**. iOS Safari가 확장자만으로는 재생하지 않는 경우가 있어서다
- 임베드는 외부 스크립트에 의존한다 — 트윗은 `react-tweet`, 인스타는 `components/PostEmbed.tsx`. 원본이 삭제되면 임베드가 빈 칸이 된다

## 관련
- [[data-model]] · [[r2-media-pipeline]] · [[daily-tweet-bot]]
