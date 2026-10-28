---
type: domain
status: stable
tags: [domain, videos, moments]
created: 2026-07-24
updated: 2026-10-28
---

# Videos & Moments

## 한 줄 정의

영상(Videos)과 그 영상 안의 순간 포착(Moments). 부모-자식 관계라 한 장에서 다룬다.

> [!key-insight]
> **네비의 "모먼트" 메뉴는 `videos` 도메인이다.** `moments`는 이름이 비슷한 **별개 도메인**이고 네비에 없다. 이 프로젝트에서 가장 자주 헷갈리는 지점.

## 위치

| | Videos | Moments |
|---|---|---|
| 라우트 | `/videos` | `/moments` |
| 네비 표시명 | **모먼트** | *숨김* |
| 공개 페이지 | `src/pages/Videos.tsx` | `src/pages/Moments.tsx` |
| 어드민 | `src/pages/admin/AdminVideos.tsx` | `src/pages/admin/AdminMoments.tsx` |
| DB 모듈 | `src/lib/database/videos.ts` | `src/lib/database/moments.ts` |

## Videos 동작

- 지원 플랫폼: YouTube, [[cloudflare-r2]] 직접 업로드, Weverse, Instagram, 기타(`platform_name`으로 표기)
- 플랫폼 판별은 URL 기반 — `src/lib/platformUtils.ts`의 `detectVideoPlatform`
- R2 업로드 시 멀티파트 + 진행률 표시 + 첫 프레임 썸네일 자동 생성 → [[r2-media-pipeline]]
- YouTube API로 메타데이터 자동 수집 (제목, 날짜, 채널명)
- 등록 시 중복 체크 (같은 제목 + 같은 날짜)
- 하위 Moments는 영상 상세(모달·`/videos/:id`)에서 보여준다

### 모먼트 탭 화면 (2.0.0~)

`src/pages/Videos.tsx` + `src/components/moments/*` + `src/lib/videoCatalog.ts`.

- **필터 한 줄**: 연도 칩(`전체` 포함, 기본은 최근 연도) · 분류 `전체 / Weverse / YouTube / 외부 출연` · Weverse일 때만 멤버 아이콘. 상태는 쿼리 `?y=` `?c=` `?mb=`에 남는다
- 그 아래 히어로(`MomentHero`, 모먼트가 있는 영상 중 무작위 하나) → 월별 가로 레일(`groupByMonth`, 연도 '전체'여도 연·월로 묶음) → 영상 카드(`VideoCard`)
- 카드를 누르면 영상 상세 모달(`VideoDetailModal`, `?v=<videoId>`). 모달 안 모먼트를 누르면 세로 숏폼 뷰어(`MomentViewer`, `?m=<momentId>`). 위로 넘기면 다음 모먼트(안내 문구는 없앰)
- 옛 링크 `/videos?highlight=<id>[&moment=<id>]`는 영상 상세(`/videos/:id`)로 넘긴다

### 분류 규칙 (`classifyVideo`)

**제목 패턴 분류는 더 이상 쓰지 않는다.** 틀릴 수 없는 기준만 쓴다.

| 분류 | 라벨 | 기준 |
|---|---|---|
| `live` | Weverse | URL에 `weverse` |
| `official` | YouTube | YouTube URL + `channel_name === 'ILLIT'` |
| `external` | 외부 출연 | 그 밖의 전부 |

> 1.x의 `YOUTUBE_CATEGORIES`(Shorts·비하인드·슈일릿 등 제목 문자열 매칭)는 2.0.0 모먼트 탭에서 사라졌다.

### Weverse 멤버 아이콘

`WEVERSE_MEMBERS` 상수. Weverse 영상은 아이콘으로 출연 멤버를 표시한다.

| 아이콘 | 의미 |
|---|---|
| 🤍 | 둘만 |
| 💙 | 모카 |
| 🩵 | 민주 |
| 🖤 | 여러명 |

🖤 선택 시 `icon_text` 필드로 구체적 멤버명을 덧붙일 수 있다. 모먼트 탭에서는 분류가 Weverse일 때 멤버 칩(`전체` · 🤍 · 💙 · 🩵 · 🖤)으로 고른다.

## Moments 동작

- 트윗 기반 순간 포착 콘텐츠 또는 R2 직접 업로드 영상
- `video_id`로 상위 Video와 연결 가능. 연결되면 상위 영상 상세에 함께 보인다
- `position` 필드로 수동 정렬 (`updateMomentPositions`)
- 어드민 목록은 무한 스크롤 + Enter/버튼 확정 방식 검색

### 날짜 판정

모먼트는 상위 영상이 있으면 **상위 영상의 날짜**를 자기 날짜처럼 쓴다. 홈 '그 해 오늘'과 X 봇이 같은 규칙을 공유한다 → [[on-this-day]]

## 함정

- ILLIT 공식 영상이라도 `channel_name`이 비어 있거나 다르면 `외부 출연`으로 간다. 분류는 URL과 채널명만 본다
- `moments`는 네비에 없어 URL 직접 접근으로만 도달한다. 존재를 잊기 쉽다

## 표지 이미지 (1.22.0~)

`getVideoCover(video, moments)` (`src/lib/videoCover.ts`): `thumbnail_url` → 유튜브 `i.ytimg.com/vi/{id}/hqdefault.jpg` → 첫 모먼트 썸네일 → null.

위버스 공식 썸네일은 서버가 수집하지 않는다(일반 요청에는 og:image가 없고, 봇 흉내는 하지 않기로 함). 어드민 `/admin/covers`의 북마클릿을 PC 크롬에서 위버스 라이브 화면 위에 누르면, 화면의 썸네일 주소를 읽어 `/api/r2`의 `import`(허용 호스트 `pstatic.net`·`wevpstatic.net`)로 R2 `covers/`에 복사하고 `thumbnail_url`을 채운다.

## 관련
- [[r2-media-pipeline]] · [[on-this-day]] · [[data-model]] · [[daily-tweet-bot]]
