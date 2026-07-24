---
type: domain
status: stable
tags: [domain, videos, moments]
created: 2026-07-24
updated: 2026-07-24
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
- 하위 Moments를 아코디언으로 연결 표시

### YouTube 카테고리 필터

`src/pages/Videos.tsx`의 `YOUTUBE_CATEGORIES` 상수. 별도 카테고리 컬럼이 없어 **제목 문자열 매칭**으로 분류한다.

| 값 | 라벨 | 매칭 패턴 |
|---|---|---|
| `shorts` | Shorts | `#ILLIT` |
| `behind` | 비하인드 | `비하인드`, `[BEHIND-IT]` |
| `super` | 슈일릿 | `SUPER ILLIT`, `슈일릿`, `슈퍼아일릿` |
| `litpouch` | lit-pouch | `[lit-pouch]` |
| `playit` | PLAY IT | `[PLAY-IT]`, `[Playlist]` |
| `illlikeit` | I'LL LIKE IT | `LL LIKE IT!` |
| `other_channel` | 타 채널 | `channel_name !== 'ILLIT'` (패턴 아님) |

### Weverse 멤버 아이콘

`WEVERSE_MEMBERS` 상수. Weverse 영상은 아이콘으로 출연 멤버를 표시한다.

| 아이콘 | 의미 |
|---|---|
| 🤍 | 둘만 |
| 💙 | 모카 |
| 🩵 | 민주 |
| 🖤 | 여러명 |

🖤 선택 시 `icon_text` 필드로 구체적 멤버명을 덧붙일 수 있다. UI에서는 이 묶음을 "라이브"라고 부른다(`라이브 전체` 필터).

## Moments 동작

- 트윗 기반 순간 포착 콘텐츠 또는 R2 직접 업로드 영상
- `video_id`로 상위 Video와 연결 가능. 연결되면 상위 영상 아코디언에 표시된다
- `position` 필드로 수동 정렬 (`updateMomentPositions`)
- 어드민 목록은 무한 스크롤 + Enter/버튼 확정 방식 검색

### 날짜 판정

모먼트는 상위 영상이 있으면 **상위 영상의 날짜**를 자기 날짜처럼 쓴다. 홈 '그 해 오늘'과 X 봇이 같은 규칙을 공유한다 → [[on-this-day]]

## 함정

- **제목이 바뀌면 YouTube 카테고리 분류가 깨진다.** 패턴 매칭이라 원본 영상 제목이 수정되면 다른 카테고리로 가거나 어디에도 안 잡힌다
- `moments`는 네비에 없어 URL 직접 접근으로만 도달한다. 존재를 잊기 쉽다

## 관련
- [[r2-media-pipeline]] · [[on-this-day]] · [[data-model]] · [[daily-tweet-bot]]
