# mmemory 프로젝트 구조

> **작업 규칙**: 반드시 이 도메인 문서를 먼저 읽고 프로젝트 구조를 파악한 후 작업할 것. 수정 대상 파일의 도메인과 관련 파일을 확인하고, 영향 범위를 이해한 뒤 코드를 변경할 것.

이 프로젝트는 보통 모바일환경에서 사용되므로 모바일 환경에 맞는 반응형 디자인으로 설계함.

팬 커뮤니티 아카이브 플랫폼으로, 두 멤버의 활동을 시간순으로 아카이빙하는 React + TypeScript 웹 애플리케이션.

## 기술 스택

- **프론트엔드**: React 19 + TypeScript + Vite
- **백엔드**: Supabase (PostgreSQL)
- **미디어 저장소**: Cloudflare R2 (S3 호환)
- **외부 API**: YouTube Data API, Twitter Widget, Instagram Embed
- **배포**: Vercel

## 도메인별 구조

### 1. Videos (모먼트)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Videos.tsx` |
| 어드민 페이지 | `src/pages/admin/AdminVideos.tsx` |
| 임베드 컴포넌트 | `src/components/VideoEmbed.tsx`, `src/components/VideoPlayer.tsx` |
| DB 함수 | `src/lib/database.ts` (`getVideos`, `createVideo`, `updateVideo`, `deleteVideo`) |

- 네비게이션에서 "모먼트"로 표시됨
- YouTube, Cloudflare R2, Weverse 지원
- R2 업로드 시 멀티파트 업로드 + 진행률 표시 + 첫 프레임 썸네일 자동 생성
- YouTube API로 메타데이터 자동 가져오기

### 2. Moments (모먼트 - 숨김)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Moments.tsx` |
| 어드민 페이지 | `src/pages/admin/AdminMoments.tsx` |
| DB 함수 | `src/lib/database.ts` (`getMoments`, `getMomentsByVideoId`, `updateMomentPositions`) |

- **네비게이션에서 숨김 처리됨** (URL 직접 접근은 가능)
- 트윗 기반 순간 포착 콘텐츠 또는 R2 직접 업로드 영상
- Video와 연계 가능 (`video_id`)
- 버튼 기반 위치 정렬 (position 필드, `updateMomentPositions`)

### 3. Posts (소셜 포스트)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Posts.tsx` |
| 어드민 페이지 | `src/pages/admin/AdminPosts.tsx` |
| 임베드 컴포넌트 | `src/components/PostEmbed.tsx`, `src/components/TweetEmbed.tsx` |
| DB 함수 | `src/lib/database.ts` (`getPosts`, `createPost`, `updatePost`, `deletePost`) |

- 플랫폼: Twitter/X, Instagram, Weverse, 기타
- URL 입력 시 플랫폼 자동 감지

### 4. Episodes (에피소드)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Episodes.tsx` |
| 어드민 페이지 | `src/pages/admin/AdminEpisodes.tsx` |
| DB 함수 | `src/lib/database.ts` (`getEpisodes`, `createEpisode`, `updateEpisode`, `deleteEpisode`) |

- DM / Comment 두 가지 타입
- 멤버 간 메시지 배열 (text/image)
- 다른 콘텐츠(video/moment/post)와 연결 가능

### 5. Articles (글/기사)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Articles.tsx` |
| 어드민 페이지 | `src/pages/admin/AdminArticles.tsx` |
| 공유 컴포넌트 | `src/components/ArticleList.tsx` |
| DB 함수 | `src/lib/database.ts` (`getArticles`, `createArticle`, `updateArticle`, `deleteArticle`) |

- 제목, 글쓴이, 태그, URL 관리
- Postype 메타데이터 크롤링 (Supabase Edge Function)

### 6. Calendar (캘린더)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Calendar.tsx` |

- 2020년~현재 범위의 통합 캘린더 뷰
- 모든 도메인 데이터를 날짜별로 집계

### 7. Search (검색)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Search.tsx` |
| 홈 페이지 | `src/pages/Home.tsx` |

- 전체 콘텐츠 통합 검색
- 카테고리별 결과 구분 표시

### 8. Settings / Featured Content (설정)

| 구분 | 파일 |
|------|------|
| 어드민 대시보드 | `src/pages/admin/Dashboard.tsx` |
| DB 함수 | `src/lib/database.ts` (`getMemberSettings`, `getFeaturedContent`, `setFeaturedContent`) |

- 멤버명 관리
- 홈 Featured Content 선택

## 공통 인프라

| 구분 | 파일 | 역할 |
|------|------|------|
| Supabase 클라이언트 | `src/lib/supabase.ts` | DB 연결 |
| R2 업로드 | `src/lib/r2Upload.ts` | 미디어 스토리지 + 썸네일 생성 |
| 플랫폼 유틸 | `src/lib/platformUtils.ts` | URL → 플랫폼 감지 |
| 데이터 캐싱 | `src/context/DataContext.tsx` | 5분 TTL 캐시 |
| 레이아웃 | `src/components/Layout.tsx` | 공개 페이지 레이아웃 |
| 어드민 레이아웃 | `src/components/AdminLayout.tsx` | 어드민 레이아웃 |
| 어드민 인증 | `src/components/AdminAuth.tsx` | 비밀번호 인증 |
| 라우팅 | `src/routes/index.tsx` | 8개 공개 + 6개 어드민 라우트 |

## 라우트 구조

### 공개 라우트 (/)

```
/ (Layout)
├── /           → Home
├── /videos     → Videos (메뉴명: 모먼트)
├── /moments    → Moments (네비에서 숨김)
├── /posts      → Posts
├── /search     → Search
├── /episodes   → Episodes
├── /articles   → Articles
└── /calendar   → Calendar
```

### 어드민 라우트 (/admin)

```
/admin (AdminLayout + AdminAuth)
├── /admin          → Dashboard
├── /admin/videos   → AdminVideos
├── /admin/moments  → AdminMoments
├── /admin/posts    → AdminPosts
├── /admin/episodes → AdminEpisodes
└── /admin/articles → AdminArticles
```

## 데이터 모델

### Videos
```typescript
{ id, title, url, date, icon?, thumbnail_url? }
```

### Moments
```typescript
{ id, title, tweet_url, date, video_id?, position?, thumbnail_url? }
```

### Posts
```typescript
{ id, title, url, platform: 'twitter' | 'instagram' | 'weverse' | 'other', date }
```

### Episodes
```typescript
{ id, title?, date, episode_type: 'dm' | 'comment', sender: 'member1' | 'member2',
  messages?: { type, content, time }[], linked_content_type?, linked_content_id?, comment_text? }
```

### Articles
```typescript
{ id, title, author, tags: string[], url, date }
```
