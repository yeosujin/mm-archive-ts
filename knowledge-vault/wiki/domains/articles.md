---
type: domain
status: stable
tags: [domain, articles]
created: 2026-07-24
updated: 2026-07-24
---

# Articles (도서관)

## 한 줄 정의

외부에 쓰인 글 큐레이션. 팬이 쓴 장문 글 등을 링크와 메타데이터로 모은다.

## 위치

- 라우트: `/articles`, 네비 표시명 **도서관**
- 공개 페이지: `src/pages/Articles.tsx`
- 어드민: `src/pages/admin/AdminArticles.tsx`
- DB 모듈: `src/lib/database/articles.ts`

## 동작

- 필드: 제목, 글쓴이, 태그 배열, URL, 날짜
- Postype 링크는 [[supabase]] Edge Function으로 메타데이터를 크롤링해 자동 채운다
- **전체 노출 여부를 설정으로 토글할 수 있다** — `getArticlesVisibility` / `setArticlesVisibility` (`src/lib/database/settings.ts`)

## 함정

- 노출 토글이 꺼져 있으면 네비에서 사라진다. "도서관이 없어졌다"는 대부분 이 설정이다
- 크롤링은 Postype 마크업에 의존한다. 대상 사이트가 구조를 바꾸면 조용히 빈 값이 들어온다

## 관련
- [[supabase]] · [[data-model]]
