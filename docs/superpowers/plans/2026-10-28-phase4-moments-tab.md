# 4단계 모먼트 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/videos`를 OTT식 표지(연도 탭 · 분류 칩 · 히어로 · 월별 레일)로 바꾸고, 영상 상세(`/videos/:id`, 모먼트 3열 그리드)와 세로 숏폼 뷰어를 만든다.

**Architecture:**
- 순수 로직(분류·필터·월 묶음·히어로 후보·모먼트 정렬)은 `src/lib/videoCatalog.ts`에 두고 vitest로 검증한다
- 뷰어는 `src/components/MomentViewer.tsx` 하나. 페이지가 모먼트 목록과 시작 위치를 넘긴다. 열림 상태는 URL 쿼리 `?m=<momentId>`로 둬서 휴대폰 뒤로가기가 뷰어를 닫게 한다
- 저장(공유 시트/다운로드)은 기존 `VideoPlayer`의 로직을 `src/lib/shareVideo.ts`로 꺼내 둘이 같이 쓴다
- 새 화면 스타일은 `src/styles/moments.css`(App.tsx에서 import)에 둔다 — 6,500줄 `App.css`에 더하지 않는다
- 옛 링크 `/videos?highlight=<videoId>[&moment=<momentId>]`는 표지에서 `/videos/<videoId>[?m=<momentId>]`로 바꿔 보낸다(검색·홈·캘린더·에피소드가 이 형식을 쓴다)

**Tech Stack:** React 19 + TS, react-router-dom 7, vitest, CSS scroll-snap, IntersectionObserver.

**브랜치·배포:** `yeosujin/v2-ui`. 배포하지 않는다(2.0.0에서 함께).

**스펙:** `docs/superpowers/specs/2026-10-27-immersive-ui-design.md` §7. **동작 참고:** 브레인스토밍 프로토타입 `.superpowers/brainstorm/66139-1793057944/content/prototype.html`(바닐라 JS, git 미추적) — `openViewer`, `setActive`, `playV`, `seek` 부분이 뷰어 동작의 기준이다.

---

## 사전 사실 (2026-10-28)

- 영상 332(YouTube 263 / Weverse 58 / 기타 11). 모먼트 1,414, 전부 영상에 연결, 전부 cdn mp4 + 썸네일 있음
- 데이터는 `useData()`(`src/hooks/useData.ts`): `videos`, `moments`(캐시, null 가능), `fetchVideos()`, `fetchMoments()`(Promise, 캐시 채움)
- `Moment` 타입에 `created_at`이 없다(DB에는 있다) → 추가
- 표지 이미지: `getVideoCover(video, moments)` (`src/lib/videoCover.ts`, 2단계)
- 위버스 멤버 아이콘: 🤍 둘만 · 💙 모카 · 🩵 민주 · 🖤 여러명 (`videos.icon`)
- 현재 `src/pages/Videos.tsx`(622줄)는 플랫폼·카테고리 드롭다운 + 아코디언. 통째로 교체한다
- `src/pages/Moments.tsx`(`/moments`)는 그대로 둔다(탭에 없음, 영상 없는 모먼트용)
- `/videos?highlight=` 사용처: `Search.tsx`, `Home.tsx`, `OnThisDay.tsx`, `episodeHelpers.ts`, `Calendar.tsx`
- `VideoPlayer.handleDownload`: fetch → blob → `navigator.share({files})` 가능하면 공유 시트, 아니면 `<a download>`, 실패 시 새 탭
- `videoPlaybackCoordinator.requestPlay/release`: 한 번에 하나만 재생

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/videoCatalog.ts` + `.test.ts` (생성) | `classifyVideo`, `videoYears`, `filterVideos`, `groupByMonth`, `momentsByVideo`, `pickHero` |
| `src/lib/shareVideo.ts` (생성) | `shareOrDownloadVideo(url)` |
| `src/components/VideoPlayer.tsx` (수정) | `handleDownload`가 `shareOrDownloadVideo` 사용 |
| `src/components/MomentViewer.tsx` (생성) | 세로 숏폼 뷰어 |
| `src/pages/VideoDetail.tsx` (생성) | `/videos/:id` |
| `src/pages/Videos.tsx` (교체) | 표지 |
| `src/styles/moments.css` (생성) | 표지·상세·뷰어 스타일 |
| `src/App.tsx`, `src/routes/index.tsx` (수정) | css import, 라우트 |
| `src/lib/database/types.ts` (수정) | `Moment.created_at?` |
| `src/pages/Calendar.tsx` (수정) | 영상 연결 모먼트 → 영상 상세 |
| vault | 문서 |

---

### Task 1: 카탈로그 순수 로직 (TDD)

**Files:**
- Create: `src/lib/videoCatalog.ts`, `src/lib/videoCatalog.test.ts`
- Modify: `src/lib/database/types.ts` (`Moment`에 `created_at?: string`)

- [ ] **Step 1: 타입**

`Moment` 인터페이스 마지막 필드 뒤에 `created_at?: string;` 추가.

- [ ] **Step 2: 실패하는 테스트**

`src/lib/videoCatalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classifyVideo, videoYears, filterVideos, groupByMonth, momentsByVideo, pickHero } from './videoCatalog';
import type { Video, Moment } from './database/types';

const v = (id: string, url: string, date: string, extra: Partial<Video> = {}): Video => ({ id, title: id, url, date, ...extra });
const m = (id: string, video_id: string, position: number, created_at: string): Moment =>
  ({ id, title: '', tweet_url: `https://cdn/${id}.mp4`, date: '2025-01-01', video_id, position, created_at });

const live = v('live', 'https://weverse.io/illit/live/4-1', '2025-10-03', { icon: '💙' });
const official = v('off', 'https://youtu.be/abcdefghijk', '2025-09-10', { channel_name: 'ILLIT' });
const external = v('ext', 'https://youtu.be/bbbbbbbbbbb', '2024-12-01', { channel_name: 'KBS' });
const insta = v('ig', 'https://www.instagram.com/p/x', '2025-10-20');

describe('classifyVideo', () => {
  it('weverse → live, ILLIT 유튜브 → official, 나머지 → external', () => {
    expect(classifyVideo(live)).toBe('live');
    expect(classifyVideo(official)).toBe('official');
    expect(classifyVideo(external)).toBe('external');
    expect(classifyVideo(insta)).toBe('external');
  });
});

describe('videoYears', () => {
  it('내림차순 중복 없음', () => {
    expect(videoYears([live, official, external, insta])).toEqual([2025, 2024]);
  });
});

describe('filterVideos', () => {
  const all = [live, official, external, insta];
  it('연도', () => expect(filterVideos(all, { year: 2024, category: 'all', member: 'all' }).map(x => x.id)).toEqual(['ext']));
  it('분류', () => expect(filterVideos(all, { year: 2025, category: 'external', member: 'all' }).map(x => x.id)).toEqual(['ig']));
  it('멤버는 라이브에서만', () => {
    expect(filterVideos(all, { year: 2025, category: 'live', member: '💙' }).map(x => x.id)).toEqual(['live']);
    expect(filterVideos(all, { year: 2025, category: 'live', member: '🤍' })).toEqual([]);
  });
});

describe('groupByMonth', () => {
  it('월 내림차순, 월 안은 날짜 내림차순', () => {
    const a = v('a', 'x', '2025-10-03'), b = v('b', 'x', '2025-10-20'), c = v('c', 'x', '2025-09-10');
    expect(groupByMonth([a, c, b])).toEqual([
      { month: 10, videos: [b, a] },
      { month: 9, videos: [c] },
    ]);
  });
});

describe('momentsByVideo', () => {
  it('영상별로 position → created_at 오름차순', () => {
    const map = momentsByVideo([
      m('m2', 'v1', 1, '2025-01-01T00:00:00Z'),
      m('m1', 'v1', 0, '2025-01-02T00:00:00Z'),
      m('m0', 'v1', 0, '2025-01-01T00:00:00Z'),
      m('x', 'v2', 0, '2025-01-01T00:00:00Z'),
    ]);
    expect(map.get('v1')!.map(x => x.id)).toEqual(['m0', 'm1', 'm2']);
    expect(map.get('v2')!.map(x => x.id)).toEqual(['x']);
  });
});

describe('pickHero', () => {
  it('모먼트 있는 영상 중에서 고른다', () => {
    const map = new Map([['off', [m('a', 'off', 0, '')]]]);
    expect(pickHero([live, official], map, () => 0.99)?.id).toBe('off');
  });
  it('후보가 없으면 null', () => {
    expect(pickHero([live], new Map(), () => 0)).toBeNull();
  });
});
```

- [ ] **Step 3: 실패 확인** — `npx vitest run src/lib/videoCatalog.test.ts` → 모듈 없음으로 FAIL

- [ ] **Step 4: 구현**

`src/lib/videoCatalog.ts`:

```ts
import type { Moment, Video } from './database/types';

export type VideoCategory = 'live' | 'official' | 'external';

/** 표지 분류 — 틀릴 수 없는 기준만 쓴다(제목 패턴 분류는 쓰지 않음) */
export function classifyVideo(video: Pick<Video, 'url' | 'channel_name'>): VideoCategory {
  if (video.url.includes('weverse')) return 'live';
  const youtube = video.url.includes('youtube.com') || video.url.includes('youtu.be');
  return youtube && video.channel_name === 'ILLIT' ? 'official' : 'external';
}

export function videoYears(videos: Pick<Video, 'date'>[]): number[] {
  return [...new Set(videos.map(v => Number(v.date.slice(0, 4))))].sort((a, b) => b - a);
}

export interface CatalogFilter {
  year: number;
  category: 'all' | VideoCategory;
  /** 위버스 멤버 아이콘. 라이브 분류에서만 적용 */
  member: string;
}

export function filterVideos<T extends Video>(videos: T[], f: CatalogFilter): T[] {
  return videos.filter(v =>
    Number(v.date.slice(0, 4)) === f.year &&
    (f.category === 'all' || classifyVideo(v) === f.category) &&
    (f.category !== 'live' || f.member === 'all' || v.icon === f.member)
  );
}

export function groupByMonth<T extends Pick<Video, 'date'>>(videos: T[]): { month: number; videos: T[] }[] {
  const byMonth = new Map<number, T[]>();
  for (const v of videos) {
    const month = Number(v.date.slice(5, 7));
    byMonth.set(month, [...(byMonth.get(month) ?? []), v]);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => b - a)
    .map(([month, list]) => ({ month, videos: list.sort((a, b) => b.date.localeCompare(a.date)) }));
}

/** 영상 id → 모먼트(position → created_at 오름차순) */
export function momentsByVideo(moments: Moment[]): Map<string, Moment[]> {
  const map = new Map<string, Moment[]>();
  for (const m of moments) {
    if (!m.video_id) continue;
    map.set(m.video_id, [...(map.get(m.video_id) ?? []), m]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  }
  return map;
}

export function pickHero<T extends Pick<Video, 'id'>>(videos: T[], moments: Map<string, Moment[]>, random = Math.random): T | null {
  const candidates = videos.filter(v => (moments.get(v.id)?.length ?? 0) > 0);
  return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
}
```

- [ ] **Step 5: 통과** — `npx vitest run src/lib/videoCatalog.test.ts && npm test && npm run build`

- [ ] **Step 6: 커밋** — `git add src/lib/videoCatalog.ts src/lib/videoCatalog.test.ts src/lib/database/types.ts && git commit -m "feat(moments): 표지 분류·필터·월 묶음·히어로 후보 로직"`

---

### Task 2: 저장(공유/다운로드) 공용화

**Files:**
- Create: `src/lib/shareVideo.ts`
- Modify: `src/components/VideoPlayer.tsx` (`handleDownload`)

- [ ] **Step 1: 공용 함수**

```ts
/**
 * 영상 저장. 휴대폰은 공유 시트(사진 앱에 저장 가능), PC는 파일 다운로드, 실패하면 새 탭으로 연다.
 * 사용자가 공유 시트를 닫으면(AbortError) 조용히 끝낸다.
 */
export async function shareOrDownloadVideo(videoUrl: string): Promise<void> {
  try {
    const res = await fetch(videoUrl);
    const blob = await res.blob();
    const fileName = videoUrl.split('/').pop()?.split('?')[0] || 'video.mp4';
    const file = new File([blob], fileName, { type: blob.type });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    window.open(videoUrl, '_blank');
  }
}
```

- [ ] **Step 2: VideoPlayer가 쓰게** — `handleDownload` 본문의 try 블록을 `await shareOrDownloadVideo(videoUrl);`로 바꾸고 catch는 지운다(`setDownloading(true)` / `finally setDownloading(false)`는 유지). import 추가.

- [ ] **Step 3: 확인·커밋** — `npm run build && npx eslint src/lib/shareVideo.ts src/components/VideoPlayer.tsx` → `git commit -m "refactor(video): 영상 저장 로직을 shareVideo로 분리"`

---

### Task 3: 숏폼 뷰어 `MomentViewer`

가장 큰 작업. 프로토타입의 동작을 React로 옮긴다. **구현자는 반드시 프로토타입 HTML의 뷰어 부분(`openViewer`~`seek` 이벤트, CSS `.vw`·`.feed`·`.sl`·`.seek`)을 읽고 시작한다.**

**Files:**
- Create: `src/components/MomentViewer.tsx`, `src/styles/moments.css`
- Modify: `src/App.tsx` (`import './styles/moments.css';`를 admin.css import 다음에)

- [ ] **Step 1: 인터페이스**

```ts
interface Props {
  moments: Moment[];          // 넘길 순서 그대로
  startIndex: number;
  onClose: () => void;
}
export default function MomentViewer({ moments, startIndex, onClose }: Props)
```

- [ ] **Step 2: 구조 (렌더 트리)**

```
<div class="mv" role="dialog" aria-modal>          ← position:fixed; inset:0; z-index:1000; background:#000
  <div class="mv-feed">                             ← height:100dvh; overflow-y:scroll; scroll-snap-type:y mandatory
    <div class="mv-slide mv-edge" data-edge="top"/> ← 닫기용 빈 장 (첫 장에서 아래로 당기면 여기로 스냅 → 닫힘)
    {moments.map((m, i) =>
      <div class="mv-slide" data-index={i}>          ← height:100dvh; scroll-snap-align:start; scroll-snap-stop:always
        <div class="mv-bg" style={backgroundImage: thumbnail}/>  ← blur(24px) brightness(.5), 꽉 채움
        <video playsInline preload="none" poster={thumbnail} data-src={tweet_url} class="mv-video"/> ← object-fit:contain
        {paused && <span class="mv-paused">▶</span>}
      </div>)}
    <div class="mv-slide mv-edge" data-edge="bottom"/>
  </div>
  <div class="mv-top">✕ 버튼 · `n / N`</div>        ← 진행 막대 없음, 제목 없음
  <div class="mv-side">🔊/🔇 버튼 · ⤓ 버튼</div>     ← 오른쪽 아래
  <div class="mv-seek">…</div>                        ← 하단 틱톡식 재생바
  {showHint && <div class="mv-hint">︿ 위로 넘겨 다음</div>}
</div>
```

- [ ] **Step 3: 동작 (전부 구현)**

1. **열기**: 마운트 시 `body` 스크롤 잠금(`overflow:hidden`, 언마운트 시 복원). 피드를 `startIndex+1`번째 장(위 edge 때문에 +1) 위치로 즉시 이동 — 스냅을 잠깐 끄고 `scrollTop = clientHeight*(startIndex+1)` 후 다음 프레임에 복원(프로토타입과 동일)
2. **현재 장 판정**: `IntersectionObserver(root=feed, threshold=0.6)`. edge 장이 60% 이상 보이면 `onClose()`. 일반 장이면 active index 갱신
3. **재생**: active가 바뀌면 모든 video `pause()`, active video에 `src`가 없으면 `data-src`를 넣고 `currentTime=0` 후 재생. `muted = !soundOn`으로 `play()`; 실패하면 `muted=true`, `soundOn=false`로 바꾸고 다시 `play()`(브라우저 자동재생 정책). 다른 플레이어와 겹치지 않게 `requestPlay(video)` 사용, 언마운트 시 `release`
4. **소리 상태**: 모듈 변수 `let sessionSoundOn = true;` — 뷰어를 닫았다 열어도 페이지 세션 동안 유지. 🔊 버튼으로 토글, 현재 video `muted` 즉시 반영
5. **탭**: video를 탭하면 일시정지/재생 토글, 정지 중 ▶ 표시
6. **자동 넘김**: video `ended` → 다음 장이 있으면 `scrollTo({top: 다음장.offsetTop, behavior:'smooth'})`. 마지막 장이면 그대로 정지(닫지 않음). video에 `loop` 없음
7. **다음 장 미리 받기**: active 다음 장 video에 `src` 지정 + `preload="auto"`. `navigator.connection?.saveData`가 true면 하지 않음
8. **재생바**: 평소 높이 3px, `pointerdown` 시 7px로 두꺼워지고 `setPointerCapture`, `pointermove`로 `currentTime` 이동, 드래그 중에만 `0:12 / 0:48` 표시. `timeupdate`로 채움 폭 갱신
9. **⤓**: `shareOrDownloadVideo(현재 모먼트 tweet_url)`, 진행 중엔 버튼 비활성 + 스피너
10. **안내**: `localStorage['mmemory.viewerHintSeen']`이 없으면 첫 장 하단에 `︿ 위로 넘겨 다음`. active가 처음 바뀌는 순간 숨기고 기록(try/catch)
11. **키보드(PC)**: ↑/↓ 이전/다음 장, Esc 닫기, Space 재생/정지
12. **닫기**: ✕, Esc, edge 장 — 모두 `onClose()`. 언마운트 시 모든 video pause, 관찰자 해제
13. **로딩 표시**: active video가 0.3초 안에 `playing`이 안 되면 가운데 작은 스피너(그 전엔 poster만)

- [ ] **Step 4: 스타일** — `src/styles/moments.css`에 `.mv*` 규칙. 버튼은 이모지 대신 기존 `Icons.tsx`의 아이콘(`CloseIcon`, `VolumeOnIcon`, `VolumeOffIcon`, `ShareIcon`)을 쓴다. 안전 영역: 상단·하단에 `env(safe-area-inset-*)` 여백

- [ ] **Step 5: 확인** — `npm run build && npx eslint src/components/MomentViewer.tsx`. 화면 확인은 Task 6

- [ ] **Step 6: 커밋** — `git commit -m "feat(moments): 세로 숏폼 뷰어"`

---

### Task 4: 영상 상세 `/videos/:id`

**Files:**
- Create: `src/pages/VideoDetail.tsx`
- Modify: `src/routes/index.tsx` (`path: 'videos/:id'`, lazy, `videos` 라우트 다음), `src/styles/moments.css`

- [ ] **Step 1: 페이지**

- 데이터: `useData()`의 `fetchVideos()`, `fetchMoments()`로 로드. `momentsByVideo`로 이 영상 모먼트(정렬됨)
- 영상이 없으면 "영상을 찾을 수 없어요" + 표지로 가는 링크
- 상단: 16:9 표지(`getVideoCover`, null이면 플랫폼 색 블록), 제목, `YYYY.MM.DD · {분류 이름} · 모먼트 N`(분류 이름: live→위버스 라이브, official→아일릿 채널, external→외부 출연)
- 버튼: `▶ 모먼트 재생`(모먼트 있을 때만, 첫 모먼트로 뷰어) · `보러가기 →`(원본 `url` 새 탭, `rel="noreferrer"`)
- 모먼트 그리드: 3열, 칸 비율 3:4, `object-fit:cover` 썸네일, **제목 없음**. 칸 탭 → 그 모먼트로 뷰어
- 칸 `onPointerDown`: 그 모먼트 영상 미리 받기 — 숨은 `<link rel="preload" as="video">` 대신 `new Image()`가 안 되므로, 화면 밖 `<video preload="auto" src>`를 하나 만들어 두고 뷰어가 열리면 버린다(같은 URL이라 브라우저 캐시를 탄다). `saveData`면 하지 않음
- 뷰어 열림: `useSearchParams`의 `m`. 칸 탭 → `setSearchParams({ m: id })`(push). 닫기 → `navigate(-1)`이 아니라, 이 페이지에서 연 경우만 뒤로, 직접 들어온 경우(`?m=`로 진입)엔 `setSearchParams({}, { replace: true })` — 구분은 `location.key === 'default'` 또는 열 때 state 플래그로
- 문서 제목은 건드리지 않는다

- [ ] **Step 2: 확인·커밋** — `npm run build`, eslint → `git commit -m "feat(moments): 영상 상세 화면 /videos/:id"`

---

### Task 5: 표지 `/videos` 교체

**Files:**
- Replace: `src/pages/Videos.tsx`
- Modify: `src/styles/moments.css`

- [ ] **Step 1: 옛 링크 호환** — 맨 위에서 `highlight`가 있으면 `<Navigate replace to={`/videos/${highlight}${moment ? `?m=${moment}` : ''}`} />` 반환

- [ ] **Step 2: 상태** — `year`(기본: `videoYears(videos)[0]`), `category`('all'), `member`('all'). URL 쿼리(`y`, `c`, `mb`)에 `replace`로 반영해서 상세에서 뒤로 오면 같은 필터로 복귀

- [ ] **Step 3: 화면**

1. 연도 탭(가로 스크롤, 글자 탭 — 3단계 상단 탭과 같은 모양을 작게)
2. 분류 칩: 전체 · 위버스 라이브 · 아일릿 채널 · 외부 출연. 위버스 라이브일 때만 두 번째 줄: 전체 · 🤍 둘만 · 💙 모카 · 🩵 민주 · 🖤 여러명
3. **히어로**: `pickHero(filtered, momentMap)` — 연도/칩이 바뀔 때마다 다시 뽑는다(`useMemo` 의존성). 16:9 표지 + 그라디언트 위에 `YYYY.MM.DD · 분류`, 제목, `모먼트 N`, `▶ 넘겨보기`. 후보 없으면 숨김
   - **미리보기**: 표지 먼저, 1초 뒤 첫 모먼트를 `muted playsInline`으로 앞 8초만 재생(`timeupdate`에서 8초 넘으면 정지) → 표지로 페이드백(opacity 전환). 소리 버튼 없음
   - 재생 안 함: `matchMedia('(prefers-reduced-motion: reduce)')` 또는 `navigator.connection?.saveData`
   - 화면 밖이면 정지(IntersectionObserver), 뷰어가 열리면 정지
   - 탭 → 그 영상 첫 모먼트부터 뷰어(이 페이지 위에 `?m=` 방식, 상세와 같은 규칙)
4. **월별 레일**: `groupByMonth(filtered)`. 제목 `10월`, 가로 스크롤 카드(`scroll-snap-type:x`). 결과 0개인 달은 자연히 없음
   - 카드: 16:9 표지(`getVideoCover`, null이면 플랫폼 색 블록) + 제목 2줄 말줄임 + `MM.DD`
   - 배지: 모먼트 있으면 `모먼트 N`(→ `/videos/:id`), 없으면 `보러가기`(→ 원본 새 탭)
   - 출처 태그: 위버스는 `{아이콘} LIVE`, 외부 출연은 `channel_name`(없으면 플랫폼 이름 — `detectVideoPlatform` 재사용)
5. 결과가 아예 없으면 "이 조건의 영상이 없어요"
6. 로딩 중엔 기존 `Skeleton` 컴포넌트

- [ ] **Step 4: 뷰어 연결** — 히어로에서 연 뷰어는 그 영상 모먼트 목록. `?m=<momentId>`로 열고, 어떤 영상의 모먼트인지는 `momentId`로 찾는다

- [ ] **Step 5: 확인·커밋** — `npm run build`, `npm test`, eslint(새 파일 0 에러) → `git commit -m "feat(moments): OTT식 모먼트 표지"`

---

### Task 6: 연결 정리 + 화면 확인

- [ ] **Step 1: 캘린더** — `src/pages/Calendar.tsx`에서 영상 항목 `path`를 `/videos/${v.id}`로(그러면 `?highlight=`가 붙어도 상세 페이지는 무시). 모먼트는 지금처럼 영상 없는 것만 표시하므로 그대로
- [ ] **Step 2: 내부 링크** — `Search.tsx`, `Home.tsx`, `episodeHelpers.ts`의 `/videos?highlight=X(&moment=Y)`를 `/videos/X(?m=Y)`로 직접 바꾼다(호환 리다이렉트는 외부 공유 링크용으로 남김). `OnThisDay.tsx`는 5단계에서 교체되므로 리다이렉트에 맡긴다
- [ ] **Step 3: 화면 확인 (사용자와)** — 개발 서버. 375px 휴대폰 실기기 우선
  1. 표지: 연도 탭·칩·멤버 칩 동작, 히어로 1초 뒤 음소거 미리보기 8초 → 표지 복귀, 레일 가로 스크롤
  2. 카드 배지: 모먼트 N → 상세, 보러가기 → 새 탭
  3. 상세: 3열 그리드, 버튼 두 개, 뒤로가기로 표지(필터 유지)
  4. 뷰어: 소리 켜고 시작(막히면 🔇), 위아래 넘김 한 장씩, 자동 다음, 마지막 정지, 탭 정지, 재생바 드래그, 저장(휴대폰 공유 시트), 첫 장에서 아래로 당겨 닫기, 마지막에서 위로 넘겨 닫기, ✕, 휴대폰 뒤로가기로 닫기, 첫 사용 안내 1회
  5. 옛 링크: 검색 결과·캘린더에서 영상 누르면 상세로
- [ ] **Step 4: 커밋** — 수정분 `fix(moments): …`

---

### Task 7: 문서

- [ ] `knowledge-vault/wiki/domains/videos-moments.md`: 표지(분류 칩 기준, 히어로, 레일), 상세 라우트, 뷰어(`?m=`), 옛 `?highlight=` 리다이렉트, `YOUTUBE_CATEGORIES` 제목 패턴 분류 제거 사실. CLAUDE.md의 "YouTube 카테고리 필터는 제목 문자열 매칭" 함정 문구가 사실이 아니게 되므로 함께 고친다
- [ ] `knowledge-vault/wiki/log.md` 최상단 항목
- [ ] 커밋 `docs: 모먼트 탭 개편 반영`
