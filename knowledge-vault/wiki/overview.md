---
type: meta
title: "Overview"
created: 2026-07-24
updated: 2026-07-24
tags: [meta, overview]
---

# mmemory 개요

팬 커뮤니티 아카이브 플랫폼. 두 멤버의 활동을 시간순으로 아카이빙하는 React + TypeScript 웹앱. **주 사용 환경은 모바일**이다.

## 한눈에

```
브라우저 (React 19 + Vite, PWA)
   │  anon 키
   ├──────────────→ Supabase (PostgreSQL + pgvector)
   │                   └─ Edge Functions (Deno)
   │                        semantic-search / embed-content / rag-answer
   │                        └─→ Google Gemini
   ├──────────────→ Cloudflare R2  (영상·사진 직접 업로드)
   │
   └──────────────→ Vercel Functions (api/)
                       og.ts / ask/[id].ts

GitHub Actions ──(매일)──→ 그해오늘 X 봇 ──→ X API
```

## 무엇이 어디에 있나

| 알고 싶은 것 | 보는 곳 |
|---|---|
| 이 앱이 어떤 콘텐츠를 다루나 | [[domains/_index]] |
| 코드가 어떻게 배치돼 있나 | [[architecture/_index]] |
| 재사용되는 해법 | [[patterns/_index]] |
| 어기면 안 되는 규칙 | [[convention/_index]] |
| 왜 이렇게 정했나 | [[decisions/_index]] |
| 스택·배포·스크립트 | [[tooling/_index]] |
| 용어 정의 | [[concepts/_index]] |
| 외부 서비스 | [[entities/_index]] |

## 먼저 알아야 할 함정

1. **네비의 "모먼트"는 `videos` 도메인이다.** `moments`는 별도 도메인이고 네비에 없다 → [[videos-moments]]
2. **`src/lib/database.ts`는 배럴이다.** 구현은 `src/lib/database/` 디렉토리에 있다 → [[database-layer]]
3. **`SUPABASE_SERVICE_ROLE_KEY`에 `VITE_` 접두사를 붙이면 사고다.** 어드민도 anon 키를 쓰므로 RLS가 유일한 방어선이다 → [[supabase-key-boundary]]
4. **YouTube 카테고리 필터는 제목 문자열 매칭이다.** 제목이 바뀌면 분류가 깨진다 → [[videos-moments]]
5. **`main` 푸시 = 배포다** → [[deploy]]

## 완성 안 된 것

> [!gap]
> `rag-answer` Edge Function과 클라이언트 래퍼 `askArchive`는 **동작하지만 UI에서 호출되지 않는다.** AI "검색"은 붙었고 "답변"은 백엔드까지만 있다 → [[embedding-semantic-search]]

## 관련
- [[index]] · [[conventions|meta/conventions]] · [[log]]
