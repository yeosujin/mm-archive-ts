---
type: architecture
status: stable
tags: [architecture, routing]
created: 2026-07-24
updated: 2026-10-30
---

# 라우팅

`src/routes/index.tsx`. `react-router-dom` v7 `createBrowserRouter`. 전 페이지 `lazy()` + `Suspense fallback={<PageLoader />}`.

```
RootLayout  (errorElement: ErrorFallback)
├── / ................ Layout
│   ├── index ........ Home          (?s= 스토리 · ?m= · ?v=)
│   ├── videos ....... Videos        (탭: 모먼트, ?v= 상세 모달 · ?m= 모먼트 뷰어)
│   ├── videos/:id ... VideoDetail
│   ├── moments ...... Moments       (네비 숨김)
│   ├── posts ........ Posts
│   ├── photos ....... Photos
│   ├── search ....... Search        (헤더 돋보기)
│   ├── episodes ..... Episodes
│   ├── calendar ..... Calendar      (상단 탭)
│   ├── ask .......... Ask           (네비 숨김)
│   └── ask/:id ...... AskDetail     (네비 숨김)
│
├── /admin ........... AdminLayout (+ AdminAuth 비밀번호 인증)
│   ├── index ........ Dashboard
│   ├── videos ....... AdminVideos
│   ├── moments ...... AdminMoments
│   ├── posts ........ AdminPosts
│   ├── episodes ..... AdminEpisodes
│   ├── photos ....... AdminPhotos
│   ├── asks ......... AdminAsks
│   └── covers ....... AdminCovers
│
└── * ................ Navigate to "/"
```

공개 11 + 어드민 8. 도서관(`/articles`, `/admin/articles`)은 2.0.0에서 제거.

탭은 `Layout.tsx`의 홈 · 모먼트 · 포스트 · 사진 · 에피소드. 뷰어·모달은 별도 라우트가 아니라 쿼리(`?s=` `?m=` `?v=`)로 열고, 휴대폰 뒤로가기로 닫힌다.

## 404

별도 페이지 없이 홈으로 리다이렉트한다. 잘못된 URL과 삭제된 콘텐츠가 구분되지 않는다.

## 어드민 인증

`AdminAuth`의 비밀번호는 **UI 게이트일 뿐 DB 권한이 아니다.** 브라우저는 어드민 화면에서도 anon 키를 쓰므로, 실제 방어선은 RLS 정책뿐이다 → [[supabase-key-boundary]]

## PWA와의 관계

`vite.config.ts`의 `navigateFallbackDenylist: [/^\/admin/, /^\/api/]` — 어드민과 API는 서비스워커 SPA 폴백에서 제외된다 → [[pwa-setup]]

## 관련
- [[directory-structure]] · [[supabase-key-boundary]] · [[pwa-setup]] · [[domains/_index|도메인 목록]]
