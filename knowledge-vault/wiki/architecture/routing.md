---
type: architecture
status: stable
tags: [architecture, routing]
created: 2026-07-24
updated: 2026-07-24
---

# 라우팅

`src/routes/index.tsx`. `react-router-dom` v7 `createBrowserRouter`. 전 페이지 `lazy()` + `Suspense fallback={<PageLoader />}`.

```
RootLayout  (errorElement: ErrorFallback)
├── / ................ Layout
│   ├── index ........ Home
│   ├── videos ....... Videos        (메뉴: 모먼트)
│   ├── moments ...... Moments       (네비 숨김)
│   ├── posts ........ Posts
│   ├── photos ....... Photos
│   ├── search ....... Search
│   ├── episodes ..... Episodes
│   ├── articles ..... Articles      (메뉴: 도서관)
│   ├── calendar ..... Calendar
│   ├── ask .......... Ask           (네비 숨김)
│   └── ask/:id ...... AskDetail     (네비 숨김)
│
├── /admin ........... AdminLayout (+ AdminAuth 비밀번호 인증)
│   ├── index ........ Dashboard
│   ├── videos ....... AdminVideos
│   ├── moments ...... AdminMoments
│   ├── posts ........ AdminPosts
│   ├── episodes ..... AdminEpisodes
│   ├── articles ..... AdminArticles
│   ├── photos ....... AdminPhotos
│   └── asks ......... AdminAsks
│
└── * ................ Navigate to "/"
```

공개 11 + 어드민 8.

## 404

별도 페이지 없이 홈으로 리다이렉트한다. 잘못된 URL과 삭제된 콘텐츠가 구분되지 않는다.

## 어드민 인증

`AdminAuth`의 비밀번호는 **UI 게이트일 뿐 DB 권한이 아니다.** 브라우저는 어드민 화면에서도 anon 키를 쓰므로, 실제 방어선은 RLS 정책뿐이다 → [[supabase-key-boundary]]

## PWA와의 관계

`vite.config.ts`의 `navigateFallbackDenylist: [/^\/admin/, /^\/api/]` — 어드민과 API는 서비스워커 SPA 폴백에서 제외된다 → [[pwa-setup]]

## 관련
- [[directory-structure]] · [[supabase-key-boundary]] · [[pwa-setup]] · [[domains/_index|도메인 목록]]
