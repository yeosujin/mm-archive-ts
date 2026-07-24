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
