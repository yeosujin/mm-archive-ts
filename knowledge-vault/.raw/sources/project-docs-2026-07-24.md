# mm-archive 프로젝트 문서 합본 (2026-07-24)

> 출처: `~/side/mm-archive/` 코드 기준으로 전면 재작성한 `CLAUDE.md` + `docs/*.md` 합본.
> 2026-06-02 스냅샷 이후 추가된 것: AI 의미검색(Supabase Edge Functions + Gemini + pgvector),
> Photos/Ask 도메인, '그해 오늘' X 자동 게시 봇(GitHub Actions), Vitest 테스트.

---

## CLAUDE.md

# mmemory

팬 커뮤니티 아카이브 플랫폼. 두 멤버의 활동을 시간순으로 아카이빙하는 React + TypeScript 웹앱.
**주 사용 환경은 모바일**이므로 모든 UI는 모바일 우선 반응형으로 설계한다.

## 문서

작업 전에 해당하는 문서를 읽을 것. 이 파일은 지도일 뿐이고, 실제 내용은 `docs/`에 있다.

| 문서 | 내용 |
|---|---|
| [docs/DOMAIN.md](docs/DOMAIN.md) | 콘텐츠 도메인 10종 — 각 도메인이 뭘 하는지, 페이지·어드민 위치, 필터/아이콘 규칙 |
| [docs/STRUCTURE.md](docs/STRUCTURE.md) | 디렉토리 구조, DB 레이어 모듈, 라우트 트리, 데이터 모델 |
| [docs/STACK.md](docs/STACK.md) | 기술 스택, 의존성, PWA 설정, npm 스크립트, 환경변수 |
| [docs/API.md](docs/API.md) | Edge Functions, Vercel Functions, DB 스키마, 외부 API |
| [docs/AUTOMATION.md](docs/AUTOMATION.md) | '그해 오늘' X 봇, 백필 스크립트, 배포 절차 |

`docs/superpowers/`에는 과거 기능(AI 검색, X 봇)의 설계·계획 문서가 남아 있다. 당시 기록이므로 현재 코드와 다를 수 있다.

## 작업 규칙

- 수정 대상 파일의 도메인과 관련 파일을 먼저 확인하고, 영향 범위를 이해한 뒤 코드를 변경할 것
- 코드와 문서가 어긋나면 **코드가 정답**이다. 문서를 고칠 것

## Git

- 코드 수정 후 **커밋만** 할 것. 푸시/머지는 사용자가 요청할 때만
- 작업 브랜치는 `develop`. `main` 푸시는 곧 배포다
- "배포해줘" / "배포" / "deploy" → `.claude/commands/deploy.md` 절차 실행

## 버전

기능 추가나 주요 스타일 변경 시 `package.json`의 version을 올린다 (현재 1.20.2).

- patch — 버그 수정, 작은 스타일 변경
- minor — 새 기능, 큰 UI 변경
- major — 호환성 깨지는 대규모 변경

## 주의할 함정

- **Videos ≠ Moments**: 네비의 "모먼트"는 `videos` 도메인이다. `moments`는 별도 도메인이고 네비에 없다
- **`SUPABASE_SERVICE_ROLE_KEY`는 클라이언트에 절대 노출 금지** — `VITE_` 접두사를 붙이지 말 것
- YouTube 카테고리 필터는 제목 문자열 매칭이라 제목이 바뀌면 분류가 깨진다
- `src/lib/database.ts`는 배럴 파일이고 실제 구현은 `src/lib/database/`에 도메인별로 나뉘어 있다

---

## docs/DOMAIN.md

# 콘텐츠 도메인

팬 커뮤니티 아카이브. 두 멤버의 활동을 시간순으로 모아 보여준다. 주 사용 환경은 모바일.

## 도메인 일람

| 도메인 | 경로 | 네비 표시 | 공개 페이지 | 어드민 |
|---|---|---|---|---|
| Home | `/` | 로고 | `pages/Home.tsx` | — |
| Videos | `/videos` | **모먼트** | `pages/Videos.tsx` | `admin/AdminVideos.tsx` |
| Moments | `/moments` | *숨김* | `pages/Moments.tsx` | `admin/AdminMoments.tsx` |
| Posts | `/posts` | 포스트 | `pages/Posts.tsx` | `admin/AdminPosts.tsx` |
| Photos | `/photos` | 사진 | `pages/Photos.tsx` | `admin/AdminPhotos.tsx` |
| Episodes | `/episodes` | 에피소드 | `pages/Episodes.tsx` | `admin/AdminEpisodes.tsx` |
| Articles | `/articles` | **도서관** | `pages/Articles.tsx` | `admin/AdminArticles.tsx` |
| Calendar | `/calendar` | 캘린더 | `pages/Calendar.tsx` | — |
| Search | `/search` | 아이콘 | `pages/Search.tsx` | — |
| Ask | `/ask`, `/ask/:id` | *숨김* | `pages/Ask.tsx`, `pages/AskDetail.tsx` | `admin/AdminAsks.tsx` |

네비 항목은 `components/Layout.tsx`에 하드코딩되어 있다(데스크톱/모바일 각각 1벌). Moments와 Ask는 라우트만 있고 네비에 노출되지 않는다 — URL 직접 접근은 가능.

---

## Videos (모먼트)

메뉴 이름은 "모먼트"지만 내부 도메인·테이블·라우트는 전부 `videos`다. 혼동 주의.

- 지원 플랫폼: YouTube, Cloudflare R2 직접 업로드, Weverse, Instagram, 기타(`platform_name`으로 표기)
- 플랫폼 판별은 URL 기반 (`lib/platformUtils.ts`의 `detectVideoPlatform`)
- R2 업로드 시 멀티파트 업로드 + 진행률 표시 + 첫 프레임 썸네일 자동 생성
- YouTube API로 메타데이터 자동 수집 (제목, 날짜, 채널명)
- 등록 시 중복 체크 (같은 제목 + 같은 날짜)
- 하위 Moments를 아코디언으로 연결 표시

### YouTube 카테고리 필터

`pages/Videos.tsx`의 `YOUTUBE_CATEGORIES` 상수. **제목 문자열 매칭**으로 분류한다(별도 카테고리 컬럼 없음).

| 값 | 라벨 | 매칭 패턴 |
|---|---|---|
| `shorts` | Shorts | `#ILLIT` |
| `behind` | 비하인드 | `비하인드`, `[BEHIND-IT]` |
| `super` | 슈일릿 | `SUPER ILLIT`, `슈일릿`, `슈퍼아일릿` |
| `litpouch` | lit-pouch | `[lit-pouch]` |
| `playit` | PLAY IT | `[PLAY-IT]`, `[Playlist]` |
| `illlikeit` | I'LL LIKE IT | `LL LIKE IT!` |
| `other_channel` | 타 채널 | `channel_name !== 'ILLIT'` (패턴 아님) |

패턴 매칭 방식이라 **영상 제목이 바뀌면 분류가 깨진다.**

### Weverse 멤버 아이콘

`WEVERSE_MEMBERS` 상수. Weverse 영상은 아이콘으로 출연 멤버를 표시한다.

| 아이콘 | 의미 |
|---|---|
| 🤍 | 둘만 |
| 💙 | 모카 |
| 🩵 | 민주 |
| 🖤 | 여러명 |

🖤 선택 시 `icon_text` 필드로 구체적인 멤버명을 덧붙일 수 있다. UI에서는 이 묶음을 "라이브"라고 부른다(`라이브 전체` 필터).

---

## Moments (순간)

- 트윗 기반 순간 포착 콘텐츠 또는 R2 직접 업로드 영상
- `video_id`로 상위 Video와 연결 가능. 연결되면 상위 영상 아코디언에 표시된다
- `position` 필드로 수동 정렬 (`updateMomentPositions`)
- 어드민 목록은 무한 스크롤 + Enter/버튼 확정 방식 검색

---

## Posts (포스트)

- 플랫폼: `twitter` | `instagram` | `weverse` | `other`
- URL 입력 시 플랫폼 자동 감지
- 그리드 썸네일 → 클릭 시 상세 모달
- 상세 모달: 미디어 캐러셀(스와이프 지원) + 헤더 sticky + 본문
- 긴 본문은 3줄 말줄임 후 "더보기"
- 영상은 `<source>` 태그로 MIME 명시 (iOS Safari 호환)

---

## Photos (사진)

- R2 업로드 이미지. 제목 + 태그 + 날짜
- 같은 제목으로 여러 장 올리면 `-1`, `-2` 접미사가 자동으로 붙는다 (`lib/titleSuffix.ts`), 삭제 시 번호 재정렬
- ThumbHash blur placeholder (`lib/thumbHash.ts`) — 로딩 중 흐린 미리보기
- 업로드 시 EXIF 제거 (`lib/stripMetadata.ts`)
- 라이트박스: 썸네일 → 원본 전환
- 어드민에서 검색 및 다중 선택 삭제 지원

---

## Episodes (에피소드)

- 타입 3종: `dm` | `comment` | `listening_party`
- 멤버 간 메시지 배열 (`text` / `image`)
- 다른 콘텐츠(video/moment/post)와 연결 가능 (`linked_content_type`, `linked_content_id`)
- URL 파라미터로 탭 유지 (`?tab=dm`)
- **Activities**: 에피소드에 붙이는 활동 태그 마스터 데이터. 어드민 에피소드 화면에서만 관리한다(`database/activities.ts`). 전용 페이지 없음

---

## Articles (도서관)

- 외부 글 큐레이션. 제목, 글쓴이, 태그, URL
- Postype 메타데이터 크롤링 (Supabase Edge Function)
- 설정으로 전체 노출 여부 토글 가능 (`getArticlesVisibility` / `setArticlesVisibility`)

---

## Calendar

- 2020년~현재 범위의 통합 캘린더
- 모든 도메인 데이터를 날짜별로 집계
- 콘텐츠 클릭 시 해당 아이템 자동 펼침/강조
- URL 파라미터로 상태 유지 (`?year=2025&month=1`)

---

## Search

두 가지 모드가 한 화면에 있다.

- **키워드 모드**(기본): 캐시된 전체 데이터를 클라이언트에서 문자열 매칭. 일치 지점 하이라이트
- **AI 모드**: Supabase Edge Function `semantic-search` 호출 (임베딩 기반). 의미 검색이라 하이라이트 없음
  - `AI_SIM_FLOOR = 0.64` 미만은 무관으로 간주해 제거. 교차언어 매칭이 동일언어보다 유사도가 낮게 나와 값을 낮춘 것
  - `AI_SIM_MARGIN = 0.05` — 최고점보다 이만큼 낮으면 제거
  - 일반 모드에서는 임베딩 쿼터를 쓰지 않도록 호출하지 않는다
  - 키워드 검색 0건일 때 "AI로 다시 찾아볼까요?" CTA 노출

---

## Ask (익명 질문)

- 방문자가 익명으로 질문 작성. 이미지 최대 3장 첨부
- 운영자가 어드민에서 답변 (`status: pending | answered`)
- 답변된 질문은 `/ask/:id`로 개별 공유 가능 — 크롤러 요청이면 동적 OG 카드 이미지를 반환한다 (`api/ask/[id].ts` + `api/og.ts`)
- 이미지에는 TTL이 있어 만료분을 정리한다 (`getExpiredImageAsks`, `clearAskImageUrl`)
- **네비에 진입점이 없다.** 검색 또는 직접 URL로만 접근 가능

---

## Home

- 검색바 (AI 모드 토글 포함)
- **그 해 오늘**: 오늘과 같은 월/일의 과거 콘텐츠 (`components/OnThisDay.tsx`, `lib/dailyPick.ts`)
- **PICK**: 어드민이 지정한 Featured Content. 그 해 오늘 콘텐츠가 없을 때 폴백으로 표시된다

---

## Settings

`database/settings.ts` + 어드민 Dashboard에서 관리.

- 멤버명 (`member1_name`, `member2_name`)
- 도서관 노출 여부
- 홈 Featured Content 지정

---

## docs/STRUCTURE.md

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

---

## docs/STACK.md

# 기술 스택

패키지명 `mmemory`. 모바일 우선 반응형 PWA.

## 구성

| 레이어 | 사용 기술 |
|---|---|
| 프론트엔드 | React 19 + TypeScript + Vite |
| 라우팅 | react-router-dom v7 (`createBrowserRouter`, 전 페이지 lazy + Suspense) |
| 데이터베이스 | Supabase (PostgreSQL + pgvector) |
| 서버리스 | Supabase Edge Functions (Deno) + Vercel Functions (`@vercel/node`) |
| 미디어 저장소 | Cloudflare R2 (S3 호환) |
| AI | Google Gemini (임베딩 + 답변 생성) — Edge Function에서만 호출 |
| 배포 | Vercel (`main` push 시 자동 배포) |
| 자동화 | GitHub Actions (일일 X 게시 봇) |
| 테스트 | Vitest |

## 런타임 의존성

| 패키지 | 용도 |
|---|---|
| `@supabase/supabase-js` | DB 접근, Edge Function 호출 |
| `@tanstack/react-query` | 서버 상태 (자체 `DataContext` 캐시와 병행) |
| `react-router-dom` | 라우팅 |
| `@aws-sdk/client-s3`, `lib-storage`, `s3-request-presigner` | R2 업로드(멀티파트) / 서명 URL |
| `@ffmpeg/ffmpeg`, `@ffmpeg/util` | 브라우저에서 영상 첫 프레임 썸네일 추출 |
| `thumbhash` | 이미지 blur placeholder 생성 |
| `tesseract.js` | OCR |
| `satori` | JSX → SVG (OG 이미지) |
| `@resvg/resvg-js` | SVG → PNG (OG 이미지) |
| `@vercel/node` | Vercel 서버리스 함수 타입/런타임 |
| `react-tweet` | 트윗 임베드 |
| `twitter-api-v2` | X(Twitter) 게시 — 봇 전용 |

## 개발 의존성 중 주의할 것

| 패키지 | 용도 |
|---|---|
| `vite-plugin-pwa` | PWA 매니페스트 + 서비스워커 |
| `sharp` | 서버 측 이미지 리사이즈 |
| `tsx` | 스크립트 실행 (봇, 백필) |
| `dotenv` | 스크립트용 `.env` 로드 |
| `vitest` | 테스트 러너 |

## PWA 설정

`vite.config.ts`의 `VitePWA`:

- `registerType: 'autoUpdate'`
- `display: standalone`, `orientation: portrait`, `lang: ko`
- `theme_color: #88C9F9`
- `navigateFallbackDenylist: [/^\/admin/, /^\/api/]` — 어드민과 API는 SPA 폴백에서 제외

## npm 스크립트

```
dev                 vite 개발 서버
build               tsc -b && vite build
lint                eslint .
test                vitest run
preview             vite preview
tweet:dry           그해오늘 봇 dry-run (게시 안 함)
backfill:thumb-hash 기존 이미지 ThumbHash 백필
backfill:embeddings 기존 콘텐츠 임베딩 백필
```

## 환경변수

`.env` / `.env.local` (Vite 규칙상 `VITE_` 접두사만 클라이언트에 노출됨).

| 변수 | 쓰이는 곳 |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 프론트 DB 접근 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버/봇 전용 쓰기 — **클라이언트 노출 금지** |
| `VITE_R2_ACCOUNT_ID`, `VITE_R2_ACCESS_KEY_ID`, `VITE_R2_SECRET_ACCESS_KEY`, `VITE_R2_BUCKET_NAME`, `VITE_R2_PUBLIC_URL` | R2 업로드/조회 |
| `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` | X 게시 봇 |
| `DISCORD_WEBHOOK_URL` | 봇 게시 결과 알림 |

봇용 시크릿은 GitHub Actions Secrets에도 동일하게 등록되어 있다 (`.github/workflows/daily-tweet.yml`).

## 버전 규칙

`package.json`의 `version`을 기능 변경 시 올린다.

- patch — 버그 수정, 작은 스타일 변경
- minor — 새 기능, 큰 UI 변경
- major — 호환성 깨지는 대규모 변경

---

## docs/API.md

# API · 서버리스 · 외부 연동

서버는 두 군데로 나뉜다. **Supabase Edge Functions**(Deno)는 AI/검색을, **Vercel Functions**(Node)는 OG 이미지와 Ask 공유를 담당한다.

## Supabase Edge Functions

`supabase/functions/`. 클라이언트에서 `supabase.functions.invoke(name)`로 호출한다.

| 함수 | 입력 | 하는 일 |
|---|---|---|
| `semantic-search` | `{ query, limit = 20, content_type = null }` | 쿼리를 임베딩 → `content_embeddings` 벡터 검색 → `{content_type, content_id, similarity}[]` |
| `rag-answer` | `{ query }` | 임베딩 → 관련 콘텐츠 검색 → Gemini로 답변 생성 → `{answer, sources}` |
| `embed-content` | 콘텐츠 식별자 | 콘텐츠 텍스트를 임베딩해 `content_embeddings`에 저장 |

공유 모듈 `_shared/`:

- `gemini.ts` — `embedText`, `generateAnswer`
- `content.ts` — 콘텐츠 → 임베딩 대상 텍스트 변환
- `cors.ts` — `corsHeaders`, `jsonResponse`

클라이언트 래퍼는 `src/lib/semanticSearch.ts`에 있다.

> **`askArchive`(rag-answer)는 정의만 되어 있고 UI 어디에서도 호출하지 않는다.** 검색 화면은 `semanticSearch`만 쓴다. RAG 답변 기능은 백엔드까지 완성돼 있고 프론트 연결만 남은 상태다.

## Vercel Functions

`api/`. `@vercel/node` 런타임.

### `api/og.ts`

동적 OG 카드 이미지 생성. `satori`로 JSX → SVG, `@resvg/resvg-js`로 SVG → PNG.

- 폰트: `api/fonts/SUIT-Regular.woff2`, `SUIT-SemiBold.woff2`
- 이모지는 **Twemoji 15.1.0** 이미지로 치환한다. `twemojiCode()`가 코드포인트를 전부 이어붙이는데, 첫 코드포인트만 쓰면 하트류·ZWJ 조합·키캡 이모지가 깨지기 때문이다. ZWJ가 포함되면 VS16(`fe0f`)을 유지하고, 아니면 떼어낸다

### `api/ask/index.ts`, `api/ask/[id].ts`

Ask 페이지의 SNS 공유 지원. User-Agent로 크롤러를 감지해 분기한다.

- 크롤러(`twitterbot`, `facebookexternalhit`, `linkedinbot`, `slackbot`, `discordbot`, `kakaotalk-scrap`)면 → OG 메타태그가 박힌 HTML 반환
- 일반 브라우저면 → `dist/index.html`을 그대로 반환해 SPA로 넘긴다

## 데이터베이스

Supabase PostgreSQL. **마이그레이션 도구를 쓰지 않는다** — `supabase/sql/`의 SQL을 수동 실행하는 방식.

| 파일 | 내용 |
|---|---|
| `2026-07-14-content-embeddings.sql` | `vector` 확장, `content_embeddings` 테이블(`vector(768)`), 벡터 인덱스, 검색 함수 |
| `2026-07-15-tweet-bot-log.sql` | `tweet_bot_log` 테이블 (봇 중복 게시 방지) |

`content_embeddings`: `id`, `content_type`, `content_id`, `text`, `embedding vector(768)`, `updated_at`

### 권한 분리

- 프론트엔드는 **anon key**로 직접 접근 (RLS 전제)
- 쓰기 권한이 필요한 서버/봇은 **service-role key** 사용. 이 키는 클라이언트 번들에 절대 들어가면 안 된다

## 외부 API

| 대상 | 용도 | 호출 위치 |
|---|---|---|
| YouTube Data API v3 | 영상 메타데이터 자동 수집 | 어드민 영상 등록 |
| X (Twitter) API v2 | 일일 자동 게시 | `scripts/dailyTweet/` (`twitter-api-v2`) |
| Twitter Widget / `react-tweet` | 트윗 임베드 | `components/TweetEmbed.tsx` |
| Instagram Embed | 인스타 임베드 | `components/PostEmbed.tsx` |
| Postype | 아티클 메타데이터 크롤링 | Supabase Edge Function |
| Google Gemini | 임베딩 + 답변 생성 | Edge Function `_shared/gemini.ts` |
| Discord Webhook | 봇 게시 결과 알림 | `scripts/dailyTweet/notify.ts` |
| Cloudflare R2 | 미디어 저장 | `lib/r2Upload.ts`, 봇 `r2.ts` |

---

## docs/AUTOMATION.md

# 자동화 · 배포

## '그해 오늘' X 자동 게시 봇

매일 KST 자정에 "오늘과 같은 월/일의 과거 콘텐츠"를 X(Twitter)에 자동 게시한다. 코드는 `scripts/dailyTweet/`, 워크플로는 `.github/workflows/daily-tweet.yml`.

### 모듈

| 파일 | 역할 |
|---|---|
| `index.ts` | 오케스트레이터 (조회 → 계획 → 게시) |
| `date.ts` | `getKstDateString`, `msUntilKstMidnight` |
| `fetch.ts` | `fetchAllRows` — Supabase 기본 1000행 제한을 페이지네이션으로 회피 |
| `normalize.ts` | 콘텐츠 → `MediaItem` 정규화, `isR2Url` |
| `group.ts` | `planTweets` — `groupKey`별로 묶어 트윗당 미디어 최대 4개 |
| `text.ts` | 캡션 규칙 + `#그해오늘` 해시태그 |
| `platform.ts` | 상위 영상 플랫폼 → 한글 라벨 |
| `r2.ts` | R2 다운로드, `urlToKey` |
| `x.ts` | 미디어 업로드 + `postThread` |
| `dedup.ts` | `tweet_bot_log` 기반 중복 게시 방지 |
| `notify.ts` | Discord 웹훅 알림 |
| `mime.ts` | URL → MIME 타입 |

각 모듈에 `*.test.ts`가 붙어 있다 (`npm test`).

### 게시 대상

- **R2에 올라간 미디어만.** 외부 URL(YouTube, 트위터 임베드 등)은 X에 업로드할 수 없으므로 제외된다
- 대상 종류: 사진(Photos), 순간(Moments), 포스트(Posts)의 미디어
- **영상(Videos)은 제외 대상**이다. dry-run에서는 "왜 안 올라갔는지" 확인용으로만 출력된다
- 모먼트는 상위 영상이 있으면 **상위 영상 날짜**로 그해오늘 여부를 판정한다 (홈 '그 해 오늘' 섹션과 동일 규칙). 독립 모먼트는 자기 날짜 기준

### 캡션 규칙 (`text.ts`)

```
사진    250724 제목            제목 끝의 -1, -2 접미사 제거
포스트  250724 제목            제목 앞 연도 prefix 제거 ('2025 생일' → '생일')
모먼트  250724 유튜브
        슈일릿 EP.12           1줄=날짜+플랫폼, 2줄=제목(상위 영상 제목, 없으면 모먼트 제목)
```

모든 트윗 끝에 빈 줄 하나 뒤 `#그해오늘`이 붙는다. 플랫폼 라벨은 한글(유튜브/위버스/인스타그램/트위터), '기타'면 `platform_name`.

같은 `groupKey`(종류|제목|날짜)끼리만 스레드로 이어지고, 다른 그룹은 독립 트윗으로 나간다. 그룹은 오래된 날짜부터.

### 스케줄이 21:50인 이유

cron은 UTC `50 12 * * *` = **KST 21:50**에 트리거된다. 자정 게시인데 2시간 이상 일찍 트리거하는 건 GitHub Actions 스케줄 디스패치가 이 저장소에서 상습적으로 60~90분 밀리기 때문이다(실측). 자정 직전 트리거로는 새벽 1시가 넘어 게시됐다.

그래서 트리거만 미리 걸고, 스크립트가 KST 자정까지 대기했다가 게시한다.

- 대기는 `GITHUB_EVENT_NAME === 'schedule'`일 때만. 수동 실행(`workflow_dispatch`)과 로컬은 즉시 진행
- 대기값이 `MAX_WAIT_MS`(3시간)를 넘으면 이미 자정을 지나 시작한 것이므로 즉시 게시

### 실행

```bash
npm run tweet:dry      # dry-run — 계획만 출력, 게시 안 함
npx tsx scripts/dailyTweet/index.ts           # 실제 게시
npx tsx scripts/dailyTweet/index.ts --force   # 중복 방지 무시하고 재게시
```

dry-run은 종류별 매칭 건수, R2 여부, 영상별 연결 순간까지 진단 출력한다.

### 필요한 시크릿

GitHub Actions Secrets에 등록되어 있다: `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_R2_*` 5종, `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`, `DISCORD_WEBHOOK_URL`.

---

## 백필 스크립트

일회성/수동 실행. 로컬에서 `.env`를 읽는다.

| 명령 | 하는 일 |
|---|---|
| `npm run backfill:thumb-hash` | 기존 이미지에 ThumbHash 생성 |
| `npm run backfill:embeddings` | 기존 콘텐츠를 임베딩해 `content_embeddings` 채우기 |
| `npx tsx scripts/remux-r2-videos.ts` | R2 영상 remux |

---

## 배포

`main` 브랜치 푸시 → **Vercel 자동 배포**. blast radius가 크다.

작업은 `develop`에서 하고, 배포할 때만 `main`으로 머지한다.

```bash
git push origin develop
git checkout main
git pull origin main --ff-only
git merge develop --no-ff -m "Merge develop into main"
git push origin main      # ← 여기서 배포 트리거
git checkout develop
```

이 절차는 `.claude/commands/deploy.md`에 슬래시 커맨드로 정의되어 있다("배포해줘" 트리거).

### deploy-guard

`.claude/skills/deploy-guard/` — main 푸시 직전 검증 스킬. 다음을 확인한다.

- **블로커**: 빌드(`npm run build`), 린트(`npm run lint`), 시크릿 노출
- **확인 요청**: 버전 갱신, 문서 동기화, 콘솔 로그 잔존, 모바일 확인

feature/develop 브랜치 푸시에는 개입하지 않는다.
