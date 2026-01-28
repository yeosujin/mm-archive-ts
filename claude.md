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
- 하위 Moments(순간)를 아코디언으로 연결 표시 (제목 숨김 처리됨)
- Weverse 영상은 아이콘으로 멤버 표시 (🤍둘만, 💙모카, 🩵민주, 🖤여러명)
- 🖤 선택 시 `icon_text` 필드로 구체적 멤버 표시 가능

### 2. Moments (순간 - 네비 숨김)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Moments.tsx` |
| 어드민 페이지 | `src/pages/admin/AdminMoments.tsx` |
| DB 함수 | `src/lib/database.ts` (`getMoments`, `getMomentsByVideoId`, `updateMomentPositions`) |

- **네비게이션에서 숨김 처리됨** (URL 직접 접근은 가능)
- 트윗 기반 순간 포착 콘텐츠 또는 R2 직접 업로드 영상
- Video와 연계 가능 (`video_id`)
- 버튼 기반 위치 정렬 (position 필드, `updateMomentPositions`)
- 어드민 목록에서 제목 상단 표시, 수정/삭제 버튼 하단 가로 배치

### 3. Posts (포스트)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Posts.tsx` |
| 어드민 페이지 | `src/pages/admin/AdminPosts.tsx` |
| 임베드 컴포넌트 | `src/components/PostEmbed.tsx`, `src/components/TweetEmbed.tsx` |
| DB 함수 | `src/lib/database.ts` (`getPosts`, `createPost`, `updatePost`, `deletePost`) |

- 플랫폼: Twitter/X, Instagram, Weverse, 기타
- URL 입력 시 플랫폼 자동 감지
- 그리드 형태로 썸네일 표시, 클릭 시 상세 모달
- 상세 모달: 미디어 캐러셀 + 헤더(글쓴이/날짜) sticky 고정 + 글 내용
- 긴 텍스트는 3줄 말줄임(...) 후 "더보기" 버튼으로 펼치기
- 영상 `preload="auto"` + `poster` 썸네일로 로딩 최적화

### 4. Episodes (에피소드)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Episodes.tsx` |
| 어드민 페이지 | `src/pages/admin/AdminEpisodes.tsx` |
| DB 함수 | `src/lib/database.ts` (`getEpisodes`, `createEpisode`, `updateEpisode`, `deleteEpisode`) |

- DM / Comment / Listening Party 세 가지 타입
- 멤버 간 메시지 배열 (text/image)
- 다른 콘텐츠(video/moment/post)와 연결 가능
- URL 파라미터로 탭 상태 유지 (`?tab=dm`, `?tab=comment`, `?tab=listening_party`)

### 5. Articles (도서관)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Articles.tsx` |
| 어드민 페이지 | `src/pages/admin/AdminArticles.tsx` |
| 공유 컴포넌트 | `src/components/ArticleList.tsx` |
| DB 함수 | `src/lib/database.ts` (`getArticles`, `createArticle`, `updateArticle`, `deleteArticle`) |

- 네비게이션에서 "도서관"으로 표시됨
- 제목, 글쓴이, 태그, URL 관리
- Postype 메타데이터 크롤링 (Supabase Edge Function)

### 6. Calendar (캘린더)

| 구분 | 파일 |
|------|------|
| 공개 페이지 | `src/pages/Calendar.tsx` |

- 2020년~현재 범위의 통합 캘린더 뷰
- 모든 도메인 데이터를 날짜별로 집계
- 콘텐츠 클릭 시 해당 아이템 자동 펼침/강조

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
| 루트 레이아웃 | `src/components/RootLayout.tsx` | 최상위 레이아웃 |
| 어드민 레이아웃 | `src/components/AdminLayout.tsx` | 어드민 레이아웃 |
| 어드민 인증 | `src/components/AdminAuth.tsx` | 비밀번호 인증 |
| 어드민 모달 | `src/components/AdminModal.tsx` | 어드민 폼 모달 |
| 페이지 로더 | `src/components/PageLoader.tsx` | Lazy loading 폴백 |
| 플랫폼 아이콘 | `src/components/PlatformIcon.tsx` | 플랫폼별 아이콘 표시 |
| 아이콘 컴포넌트 | `src/components/Icons.tsx` | 공통 SVG 아이콘 |
| 라우팅 | `src/routes/index.tsx` | 8개 공개 + 6개 어드민 라우트 |

## 라우트 구조

### 공개 라우트 (/)

```
/ (Layout)
├── /           → Home
├── /videos     → Videos (메뉴명: 모먼트)
├── /moments    → Moments (네비에서 숨김)
├── /posts      → Posts (메뉴명: 포스트)
├── /search     → Search
├── /episodes   → Episodes (메뉴명: 에피소드)
├── /articles   → Articles (메뉴명: 도서관)
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
{
  id, title, url, date,
  icon?: string,        // 위버스 멤버 아이콘 (💙, 🩵, 🖤, 🤍)
  icon_text?: string,   // 🖤 선택 시 구체적 멤버 표시
  thumbnail_url?: string
}
```

### Moments
```typescript
{ id, title, tweet_url, date, video_id?, position?, thumbnail_url? }
```

### Posts
```typescript
{
  id, title, url, date,
  platform: 'twitter' | 'instagram' | 'weverse' | 'other',
  writer?: string,      // 글쓴이
  content?: string,     // 글 내용
  media?: PostMedia[]   // 이미지/영상 배열
}

// PostMedia
{ type: 'image' | 'video', url: string, thumbnail?: string }
```

### Episodes
```typescript
{
  id, title?, date,
  episode_type: 'dm' | 'comment' | 'listening_party',
  sender?: 'member1' | 'member2',
  platform?: 'weverse' | 'melon' | 'spotify' | 'apple_music',
  messages?: { type: 'text' | 'image', content, time, sender_name? }[],
  linked_content_type?, linked_content_id?, comment_text?
}
```

### Articles
```typescript
{ id, title, author, tags: string[], url, date }
```

## UI/UX 특징

- 다크/라이트 테마 지원 (localStorage 저장)
- 모바일 네비게이션: 햄버거 메뉴 → 오버레이 방식 (페이지 밀림 없음)
- 홈 화면: Featured Content + 그라데이션 배경
- 정렬 토글: 최신순/오래된순 전환

## CSS 구조

- 모든 스타일은 `src/App.css`에 통합
- CSS 변수 기반 테마 시스템 (`--text-primary`, `--bg-card`, `--border`, `--accent` 등)
- 모바일 우선 반응형 디자인
- 주요 CSS 클래스:
  - `.mobile-nav` - 모바일 네비게이션 (position: fixed 오버레이)
  - `.post-detail-modal` - 포스트 상세 모달
  - `.post-detail-header` - 상세 모달 헤더 (sticky)
  - `.post-detail-text` - 글 내용 (line-clamp 3줄)
  - `.text-expand-btn` - 더보기 버튼
  - `.moments-timeline` - 타임라인 레이아웃
  - `.admin-item-wrapper` - 어드민 아이템 컨테이너
