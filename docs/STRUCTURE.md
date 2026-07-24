# 디렉토리 · 라우트 · 데이터 모델

## 디렉토리

```
mm-archive/
├── api/                    Vercel 서버리스 함수
│   ├── og.ts               동적 OG 이미지 (satori + resvg)
│   ├── ask/index.ts        Ask 목록 — 크롤러면 OG 메타 주입
│   ├── ask/[id].ts         Ask 상세 — 크롤러면 OG 카드 반환
│   └── fonts/              OG 렌더용 SUIT woff2
│
├── scripts/
│   ├── dailyTweet/         '그해 오늘' X 자동 게시 봇 (docs/AUTOMATION.md)
│   ├── backfill-embeddings.ts
│   ├── backfill-thumb-hash.ts
│   └── remux-r2-videos.ts
│
├── supabase/
│   ├── functions/          Edge Functions (Deno)
│   │   ├── semantic-search/
│   │   ├── rag-answer/
│   │   ├── embed-content/
│   │   └── _shared/        gemini.ts · content.ts · cors.ts
│   └── sql/                수동 실행 SQL (마이그레이션 도구 미사용)
│
├── src/
│   ├── components/         공용 컴포넌트
│   ├── context/            DataContext (5분 TTL 캐시)
│   ├── hooks/              useData · useToast · useConfirm
│   ├── lib/                DB 레이어 + 유틸
│   ├── pages/              공개 페이지
│   ├── pages/admin/        어드민 페이지
│   ├── routes/index.tsx    라우터 정의
│   └── App.css             전체 스타일 (단일 파일)
│
├── docs/                   이 문서들
└── .github/workflows/      daily-tweet.yml
```

## DB 레이어

`src/lib/database/`에 도메인별로 파일이 나뉘어 있고, `src/lib/database.ts`는 **backward-compat barrel**이다. 기존 import 경로(`from '../lib/database'`)를 유지하기 위한 re-export이므로, 새 코드도 이 배럴에서 import하면 된다.

| 파일 | export |
|---|---|
| `types.ts` | 모든 인터페이스 (타입 단일 출처) |
| `videos.ts` | `getVideos` `getVideo` `createVideo` `updateVideo` `deleteVideo` |
| `moments.ts` | `getMoments` `getMomentsByVideoId` `createMoment` `updateMoment` `deleteMoment` `updateMomentPositions` |
| `posts.ts` | `getPosts` `createPost` `updatePost` `deletePost` |
| `photos.ts` | `getPhotos` `createPhoto` `updatePhoto` `deletePhoto` |
| `episodes.ts` | `getEpisodes` `createEpisode` `updateEpisode` `deleteEpisode` |
| `articles.ts` | `getArticles` `createArticle` `updateArticle` `deleteArticle` |
| `asks.ts` | `getAsks` `getAnsweredAsks` `getAsk` `createAsk` `answerAsk` `updateAsk` `deleteAsk` `getExpiredImageAsks` `clearAskImageUrl` |
| `activities.ts` | `getActivities` `createActivity` `deleteActivity` |
| `featured.ts` | `getFeaturedContent` `setFeaturedContent` |
| `settings.ts` | `getMemberSettings` `updateMemberSettings` `getArticlesVisibility` `setArticlesVisibility` |
| `embeddings.ts` | `syncEmbedding`, `EmbeddingContentType` |

모든 함수는 Supabase 응답을 unwrap한 뒤 `Promise<T>`를 반환한다.

## 기타 lib

| 파일 | 역할 |
|---|---|
| `supabase.ts` | Supabase 클라이언트 (anon key) |
| `r2Upload.ts` | R2 멀티파트 업로드 + 썸네일 생성 |
| `platformUtils.ts` | URL → 플랫폼 감지 |
| `semanticSearch.ts` | Edge Function 호출 래퍼 (`semanticSearch`, `askArchive`) |
| `dailyPick.ts` | '그 해 오늘' 필터 (`filterOnThisDay`) — 웹과 봇이 공유 |
| `thumbHash.ts` | ThumbHash 인코딩/디코딩 |
| `stripMetadata.ts` | 업로드 이미지 EXIF 제거 |
| `titleSuffix.ts` | 사진 제목 `-N` 접미사 부여/재정렬 |
| `episodeHelpers.ts` | 에피소드 메시지 가공 |
| `videoPlaybackCoordinator.ts` | 동시 재생 방지 (한 번에 한 영상) |
| `askStorage.ts` | Ask 첨부 이미지 업로드 |

## 라우트

`src/routes/index.tsx`. 전 페이지 `lazy()` + `Suspense fallback={<PageLoader />}`.

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

404는 별도 페이지 없이 홈으로 리다이렉트된다.

## 데이터 모델

`src/lib/database/types.ts` 원문 기준.

```typescript
interface Video {
  id: string; title: string; url: string; date: string;
  icon?: string;          // Weverse 멤버 아이콘 🤍💙🩵🖤
  icon_text?: string;     // 🖤일 때 구체적 멤버명
  thumbnail_url?: string;
  channel_name?: string;  // YouTube 채널명 (타 채널 필터용)
  platform_name?: string; // 기타 플랫폼일 때 표시명
}

interface Moment {
  id: string; title: string; tweet_url: string; date: string;
  video_id?: string; position?: number; thumbnail_url?: string;
}

interface PostMedia {
  type: 'image' | 'video'; url: string;
  thumbnail?: string; thumb_hash?: string;
}

interface Post {
  id: string; title: string; url: string;
  platform: 'twitter' | 'instagram' | 'weverse' | 'other';
  date: string; writer?: string; content?: string; media?: PostMedia[];
}

interface Episode {
  id: string; title?: string; date: string;
  episode_type: 'dm' | 'comment' | 'listening_party';
  sender?: 'member1' | 'member2';
  platform?: 'weverse' | 'melon' | 'spotify' | 'apple_music';
  messages?: { type: 'text' | 'image'; content: string; time: string; sender_name?: string }[];
  linked_content_type?: 'video' | 'moment' | 'post';
  linked_content_id?: string;
  comment_text?: string;
}

interface Article { id: string; title: string; author: string; tags: string[]; url: string; date: string }

interface Photo {
  id: string; title: string; date: string; tags: string[];
  image_url: string; thumbnail_url?: string; thumb_hash?: string;
}

interface Ask {
  id: string; content: string; image_url?: string; answer?: string;
  status: 'pending' | 'answered'; created_at: string; answered_at?: string;
}

interface Activity { id: string; name: string; created_at?: string }

interface MemberSettings { member1_name: string; member2_name: string; articles_visible?: boolean }

interface FeaturedContent {
  type: 'video' | 'post' | 'moment' | 'episode' | null;
  content_id: string | null;
}
```

> `created_at`을 가진 것은 `Ask`와 `Activity`뿐이다. 나머지 콘텐츠의 `date`는 **콘텐츠 원본 날짜**이지 등록 시각이 아니다. "최근 등록순" 정렬은 현재 불가능하다.

## 캐싱

`src/context/DataContext.tsx` — 5분 TTL 인메모리 캐시. `useData()` 훅으로 접근한다. `@tanstack/react-query`도 설치되어 있어 두 방식이 공존한다.

## CSS

- 전부 `src/App.css` 단일 파일 (`src/styles/`도 존재)
- CSS 변수 기반 테마 (`--text-primary`, `--bg-card`, `--border`, `--accent` …)
- 다크/라이트 테마는 `localStorage`에 저장 (`Layout.tsx`). **localStorage는 현재 테마에만 쓰인다**
- 모바일 네비는 `position: fixed` 오버레이 (페이지 밀림 없음)
