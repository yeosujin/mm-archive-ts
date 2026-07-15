# "그해 오늘" X 자동 게시 봇 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매일 한국시간 자정에 오늘과 같은 월/일의 과거 콘텐츠(모먼트·사진·포스트)를 X에 쓰레드로 자동 게시하는 봇을 만든다.

**Architecture:** `scripts/dailyTweet/` 아래 순수 로직 모듈(날짜·텍스트·그룹핑·정규화)과 I/O 모듈(R2 다운로드·X 업로드·Supabase dedup)을 분리한다. 순수 로직은 vitest로 TDD하고, I/O는 `--dry-run`으로 검증한다. GitHub Actions 크론이 매일 KST 00:00에 `npx tsx scripts/dailyTweet/index.ts`를 실행한다.

**Tech Stack:** TypeScript + tsx, `twitter-api-v2`(X API), `@aws-sdk/client-s3`(R2), `@supabase/supabase-js`, vitest, GitHub Actions.

**전제(사용자 준비물):** 실제 게시/테스트 전에 X 개발자 계정 + OAuth 1.0a 키 4개(App Key/Secret, Access Token/Secret) + 크레딧 선불 충전이 필요하다. 코드 작성/순수 로직 테스트/`--dry-run`은 키 없이 가능하다.

**참조 문서:** `docs/superpowers/specs/2026-07-15-onthisday-x-bot-design.md`

---

## 파일 구조

| 파일 | 책임 |
|------|------|
| `scripts/dailyTweet/date.ts` | KST 오늘 날짜 계산 (순수) |
| `scripts/dailyTweet/text.ts` | `YYMMDD 제목` 텍스트 규칙 (순수) |
| `scripts/dailyTweet/platform.ts` | 모먼트 상위 영상 플랫폼 라벨 (순수) |
| `scripts/dailyTweet/normalize.ts` | 모먼트/사진/포스트 → 공통 `MediaItem` 변환 (순수) |
| `scripts/dailyTweet/group.ts` | `MediaItem[]` → `PlannedTweet[]` 그룹/배칭 (순수) |
| `scripts/dailyTweet/mime.ts` | URL 확장자 → MIME (순수) |
| `scripts/dailyTweet/r2.ts` | R2 클라이언트 + 다운로드 (I/O) |
| `scripts/dailyTweet/x.ts` | X 클라이언트 + 미디어 업로드 + 쓰레드 게시 (I/O) |
| `scripts/dailyTweet/dedup.ts` | Supabase 클라이언트 + 중복 방지 로그 (I/O) |
| `scripts/dailyTweet/index.ts` | 오케스트레이터 (전체 흐름) |
| `supabase/sql/2026-07-15-tweet-bot-log.sql` | `tweet_bot_log` 테이블 |
| `.github/workflows/daily-tweet.yml` | 일일 크론 워크플로 |
| `vitest.config.ts` | 테스트 설정 |

재사용: `src/lib/dailyPick.ts`의 `filterOnThisDay`, `src/lib/platformUtils.ts`의 `detectVideoPlatform`/`getPlatformName`, `src/lib/database/types.ts`의 타입. (모두 순수 함수/타입이라 tsx/node에서 import 가능)

---

## Task 0: 프로젝트 셋업 (의존성 + vitest)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: 런타임/개발 의존성 설치**

Run:
```bash
npm install twitter-api-v2
npm install -D vitest
```
Expected: `package.json`에 `twitter-api-v2`(dependencies), `vitest`(devDependencies) 추가됨.

- [ ] **Step 2: `test` 스크립트 추가**

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run",
"tweet:dry": "tsx scripts/dailyTweet/index.ts --dry-run"
```

- [ ] **Step 3: vitest 설정 생성**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: 빈 테스트로 러너 동작 확인**

Run: `npm test`
Expected: "No test files found" 또는 0 tests — 에러 없이 종료(러너 정상).

- [ ] **Step 5: 커밋**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(bot): vitest + twitter-api-v2 설치, test 스크립트 추가"
```

---

## Task 1: DB 마이그레이션 (`tweet_bot_log`)

**Files:**
- Create: `supabase/sql/2026-07-15-tweet-bot-log.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

Create `supabase/sql/2026-07-15-tweet-bot-log.sql`:
```sql
-- 봇 중복 게시 방지 로그. run_date(YYYY-MM-DD)를 PK로 하여
-- 같은 날 재실행 시 스킵. 내년 같은 MM-DD는 다른 키라 정상 게시된다.
create table if not exists public.tweet_bot_log (
  run_date    date primary key,
  posted_at   timestamptz not null default now(),
  tweet_count integer not null default 0
);
```

- [ ] **Step 2: Supabase에 적용**

Supabase 대시보드 → SQL Editor에 위 SQL을 붙여 실행. (봇은 service role 키로 접근하므로 RLS 정책 불필요)
Expected: `tweet_bot_log` 테이블 생성됨.

- [ ] **Step 3: 커밋**

```bash
git add supabase/sql/2026-07-15-tweet-bot-log.sql
git commit -m "feat(bot): tweet_bot_log 테이블 마이그레이션"
```

---

## Task 2: KST 날짜 유틸 (`date.ts`)

**Files:**
- Create: `scripts/dailyTweet/date.ts`
- Test: `scripts/dailyTweet/date.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `scripts/dailyTweet/date.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getKstDateString } from './date';

describe('getKstDateString', () => {
  it('UTC 15:00은 KST 다음날 자정이므로 다음날 날짜', () => {
    expect(getKstDateString(new Date('2026-07-14T15:00:00Z'))).toBe('2026-07-15');
  });
  it('UTC 14:59는 아직 KST 같은날 23:59', () => {
    expect(getKstDateString(new Date('2026-07-14T14:59:00Z'))).toBe('2026-07-14');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run scripts/dailyTweet/date.test.ts`
Expected: FAIL — `getKstDateString`가 없음(모듈 해석 실패).

- [ ] **Step 3: 최소 구현**

Create `scripts/dailyTweet/date.ts`:
```ts
// 한국시간(KST) 기준 오늘 날짜를 'YYYY-MM-DD'로 반환한다.
export function getKstDateString(now: Date = new Date()): string {
  // en-CA 로케일은 'YYYY-MM-DD' 형식을 준다.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run scripts/dailyTweet/date.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: 커밋**

```bash
git add scripts/dailyTweet/date.ts scripts/dailyTweet/date.test.ts
git commit -m "feat(bot): KST 날짜 유틸 getKstDateString"
```

---

## Task 3: 텍스트 규칙 (`text.ts`)

**Files:**
- Create: `scripts/dailyTweet/text.ts`
- Test: `scripts/dailyTweet/text.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `scripts/dailyTweet/text.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toYYMMDD, stripSubfix, stripYearPrefix, photoText, postText, momentText } from './text';

describe('toYYMMDD', () => {
  it('YYYY-MM-DD를 YYMMDD로', () => {
    expect(toYYMMDD('2022-07-14')).toBe('220714');
  });
});

describe('stripSubfix', () => {
  it('끝의 -숫자 제거', () => {
    expect(stripSubfix('생일-1')).toBe('생일');
    expect(stripSubfix('생일-12')).toBe('생일');
  });
  it('subfix 없으면 그대로', () => {
    expect(stripSubfix('생일')).toBe('생일');
  });
});

describe('stripYearPrefix', () => {
  it('날짜 연도와 같은 prefix 제거', () => {
    expect(stripYearPrefix('2025 생일', '2025-10-10')).toBe('생일');
  });
  it('다른 연도 prefix는 유지', () => {
    expect(stripYearPrefix('2024 생일', '2025-10-10')).toBe('2024 생일');
  });
  it('prefix 없으면 그대로', () => {
    expect(stripYearPrefix('생일', '2025-10-10')).toBe('생일');
  });
});

describe('photoText', () => {
  it('subfix 제거 + YYMMDD', () => {
    expect(photoText('생일-2', '2022-07-14')).toBe('220714 생일');
  });
});

describe('postText', () => {
  it('제목 없으면 날짜만', () => {
    expect(postText(undefined, '2029-01-11')).toBe('290111');
    expect(postText('', '2029-01-11')).toBe('290111');
  });
  it('연도 prefix 제거', () => {
    expect(postText('2025 생일', '2025-10-10')).toBe('251010 생일');
  });
});

describe('momentText', () => {
  it('플랫폼 있으면 YYMMDD 플랫폼', () => {
    expect(momentText('Weverse', '2022-07-14')).toBe('220714 Weverse');
  });
  it('플랫폼 없으면 날짜만', () => {
    expect(momentText(null, '2022-07-14')).toBe('220714');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run scripts/dailyTweet/text.test.ts`
Expected: FAIL — `text` 모듈 없음.

- [ ] **Step 3: 최소 구현**

Create `scripts/dailyTweet/text.ts`:
```ts
// 'YYYY-MM-DD' -> 'YYMMDD'
export function toYYMMDD(date: string): string {
  return date.slice(2, 4) + date.slice(5, 7) + date.slice(8, 10);
}

// 사진 제목 끝의 '-1', '-12' 같은 subfix 제거
export function stripSubfix(title: string): string {
  return title.replace(/-\d+$/, '');
}

// 제목 앞에 콘텐츠 연도와 같은 prefix가 있으면 제거 ('2025 생일' + 2025 -> '생일')
export function stripYearPrefix(title: string, date: string): string {
  const year = date.slice(0, 4);
  return title.replace(new RegExp('^' + year + '\\s*'), '').trim();
}

// 'YYMMDD' + 나머지(있으면 공백으로 join)
function join(yymmdd: string, rest: string): string {
  const r = rest.trim();
  return r ? `${yymmdd} ${r}` : yymmdd;
}

export function photoText(title: string, date: string): string {
  return join(toYYMMDD(date), stripSubfix(title));
}

export function postText(title: string | undefined, date: string): string {
  const t = (title ?? '').trim();
  return join(toYYMMDD(date), t ? stripYearPrefix(t, date) : '');
}

export function momentText(platformLabel: string | null, date: string): string {
  return join(toYYMMDD(date), platformLabel ?? '');
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run scripts/dailyTweet/text.test.ts`
Expected: PASS (모든 테스트).

- [ ] **Step 5: 커밋**

```bash
git add scripts/dailyTweet/text.ts scripts/dailyTweet/text.test.ts
git commit -m "feat(bot): 텍스트 규칙(사진/모먼트/포스트) 구현"
```

---

## Task 4: 모먼트 플랫폼 라벨 (`platform.ts`)

**Files:**
- Create: `scripts/dailyTweet/platform.ts`
- Test: `scripts/dailyTweet/platform.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `scripts/dailyTweet/platform.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { momentPlatformLabel } from './platform';
import type { Video } from '../../src/lib/database';

const base: Video = { id: 'v1', title: 't', url: '', date: '2022-07-14' };

describe('momentPlatformLabel', () => {
  it('상위 영상 없으면 null', () => {
    expect(momentPlatformLabel(undefined)).toBeNull();
  });
  it('YouTube URL이면 YouTube', () => {
    expect(momentPlatformLabel({ ...base, url: 'https://youtu.be/abc' })).toBe('YouTube');
  });
  it('Weverse URL이면 Weverse', () => {
    expect(momentPlatformLabel({ ...base, url: 'https://weverse.io/x' })).toBe('Weverse');
  });
  it('기타 플랫폼이면 platform_name', () => {
    expect(momentPlatformLabel({ ...base, url: 'https://example.com/x', platform_name: '네이버' })).toBe('네이버');
  });
  it('기타인데 platform_name 없으면 null', () => {
    expect(momentPlatformLabel({ ...base, url: 'https://example.com/x' })).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run scripts/dailyTweet/platform.test.ts`
Expected: FAIL — `platform` 모듈 없음.

- [ ] **Step 3: 최소 구현**

Create `scripts/dailyTweet/platform.ts`:
```ts
import type { Video } from '../../src/lib/database';
import { detectVideoPlatform, getPlatformName } from '../../src/lib/platformUtils';

// 모먼트의 상위 영상 플랫폼 라벨. 기타면 platform_name, 상위 영상 없으면 null.
export function momentPlatformLabel(parentVideo: Video | undefined): string | null {
  if (!parentVideo) return null;
  const platform = detectVideoPlatform(parentVideo.url);
  if (platform === 'other') {
    return parentVideo.platform_name?.trim() || null;
  }
  return getPlatformName(platform);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run scripts/dailyTweet/platform.test.ts`
Expected: PASS.

> 주의: `getPlatformName`이 twitter/instagram 케이스를 반환하는지 `src/lib/platformUtils.ts`에서 확인. 만약 특정 플랫폼이 빈 문자열/undefined를 반환하면 `getPlatformName(platform) || null`로 감싼다.

- [ ] **Step 5: 커밋**

```bash
git add scripts/dailyTweet/platform.ts scripts/dailyTweet/platform.test.ts
git commit -m "feat(bot): 모먼트 상위 영상 플랫폼 라벨"
```

---

## Task 5: 정규화 (`normalize.ts`)

**Files:**
- Create: `scripts/dailyTweet/normalize.ts`
- Test: `scripts/dailyTweet/normalize.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `scripts/dailyTweet/normalize.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isR2Url, normalizePhotos, normalizeMoments, normalizePosts } from './normalize';
import type { Photo, Moment, Post, Video } from '../../src/lib/database';

const R2 = 'https://cdn.example.r2.dev';

describe('isR2Url', () => {
  it('R2 퍼블릭 URL이면 true', () => {
    expect(isR2Url(`${R2}/photos/a.jpg`, R2)).toBe(true);
  });
  it('외부 URL이면 false', () => {
    expect(isR2Url('https://twitter.com/x/status/1', R2)).toBe(false);
  });
});

describe('normalizePhotos', () => {
  it('R2 사진을 image MediaItem으로 변환', () => {
    const photos: Photo[] = [
      { id: 'p1', title: '생일-1', date: '2022-07-14', tags: [], image_url: `${R2}/a.jpg` },
      { id: 'p2', title: '외부', date: '2022-07-14', tags: [], image_url: 'https://x.com/a.jpg' },
    ];
    const items = normalizePhotos(photos, R2);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      contentType: 'photo', mediaType: 'image', url: `${R2}/a.jpg`,
      date: '2022-07-14', groupKey: 'photo|생일|2022-07-14', text: '220714 생일',
    });
  });
});

describe('normalizeMoments', () => {
  it('상위 영상 있는 R2 모먼트', () => {
    const videos = new Map<string, Video>([
      ['v1', { id: 'v1', title: '위버스 라이브', url: 'https://weverse.io/x', date: '2022-07-14' }],
    ]);
    const moments: Moment[] = [
      { id: 'm1', title: '순간', tweet_url: `${R2}/m.mp4`, date: '2022-07-14', video_id: 'v1' },
    ];
    const items = normalizeMoments(moments, videos, R2);
    expect(items[0]).toMatchObject({
      contentType: 'moment', mediaType: 'video', url: `${R2}/m.mp4`,
      groupKey: 'moment|위버스 라이브|2022-07-14', text: '220714 Weverse',
    });
  });
  it('상위 영상 없으면 날짜만 텍스트 + 자기 title로 그룹', () => {
    const moments: Moment[] = [
      { id: 'm2', title: '독립순간', tweet_url: `${R2}/m2.mp4`, date: '2021-07-14' },
    ];
    const items = normalizeMoments(moments, new Map(), R2);
    expect(items[0]).toMatchObject({ text: '210714', groupKey: 'moment|독립순간|2021-07-14' });
  });
});

describe('normalizePosts', () => {
  it('media[] 있는 포스트만, 미디어별로 펼침', () => {
    const posts: Post[] = [
      { id: 'po1', title: '2025 생일', platform: 'twitter', date: '2025-10-10',
        media: [
          { type: 'image', url: `${R2}/1.jpg` },
          { type: 'video', url: `${R2}/2.mp4` },
          { type: 'image', url: 'https://x.com/ext.jpg' },
        ] },
      { id: 'po2', title: '임베드만', platform: 'twitter', date: '2025-10-10' },
    ];
    const items = normalizePosts(posts, R2);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ mediaType: 'image', text: '251010 생일', groupKey: 'post|2025 생일|2025-10-10' });
    expect(items[1]).toMatchObject({ mediaType: 'video', text: '251010 생일' });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run scripts/dailyTweet/normalize.test.ts`
Expected: FAIL — `normalize` 모듈 없음.

- [ ] **Step 3: 최소 구현**

Create `scripts/dailyTweet/normalize.ts`:
```ts
import type { Photo, Moment, Post, Video } from '../../src/lib/database';
import { photoText, postText, momentText, stripSubfix } from './text';
import { momentPlatformLabel } from './platform';

export type MediaItem = {
  contentType: 'photo' | 'moment' | 'post';
  mediaType: 'image' | 'video';
  url: string;
  date: string;
  groupKey: string; // contentType|그룹제목|date
  text: string;     // 트윗 본문 캡션
};

// URL이 R2 파일인지 (퍼블릭 도메인 or r2.dev/cloudflarestorage)
export function isR2Url(url: string, r2PublicUrl: string): boolean {
  if (!url) return false;
  const base = (r2PublicUrl || '').replace(/\/$/, '');
  return url.includes('.r2.dev') ||
    url.includes('r2.cloudflarestorage.com') ||
    (base !== '' && url.startsWith(base));
}

export function normalizePhotos(photos: Photo[], r2PublicUrl: string): MediaItem[] {
  return photos
    .filter(p => isR2Url(p.image_url, r2PublicUrl))
    .map(p => {
      const groupTitle = stripSubfix(p.title).trim();
      return {
        contentType: 'photo' as const,
        mediaType: 'image' as const,
        url: p.image_url,
        date: p.date,
        groupKey: `photo|${groupTitle}|${p.date}`,
        text: photoText(p.title, p.date),
      };
    });
}

export function normalizeMoments(
  moments: Moment[],
  videosById: Map<string, Video>,
  r2PublicUrl: string,
): MediaItem[] {
  return moments
    .filter(m => isR2Url(m.tweet_url, r2PublicUrl))
    .map(m => {
      const parent = m.video_id ? videosById.get(m.video_id) : undefined;
      const label = momentPlatformLabel(parent);
      const groupTitle = (parent?.title?.trim() || m.title.trim());
      return {
        contentType: 'moment' as const,
        mediaType: 'video' as const,
        url: m.tweet_url,
        date: m.date,
        groupKey: `moment|${groupTitle}|${m.date}`,
        text: momentText(label, m.date),
      };
    });
}

export function normalizePosts(posts: Post[], r2PublicUrl: string): MediaItem[] {
  const items: MediaItem[] = [];
  for (const post of posts) {
    if (!post.media || post.media.length === 0) continue;
    const groupTitle = (post.title ?? '').trim();
    const text = postText(post.title, post.date);
    for (const media of post.media) {
      if (!isR2Url(media.url, r2PublicUrl)) continue;
      items.push({
        contentType: 'post',
        mediaType: media.type,
        url: media.url,
        date: post.date,
        groupKey: `post|${groupTitle}|${post.date}`,
        text,
      });
    }
  }
  return items;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run scripts/dailyTweet/normalize.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/dailyTweet/normalize.ts scripts/dailyTweet/normalize.test.ts
git commit -m "feat(bot): 콘텐츠 -> MediaItem 정규화"
```

---

## Task 6: 그룹/배칭 (`group.ts`)

**Files:**
- Create: `scripts/dailyTweet/group.ts`
- Test: `scripts/dailyTweet/group.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `scripts/dailyTweet/group.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { planTweets } from './group';
import type { MediaItem } from './normalize';

function img(url: string, key: string, date: string, text: string): MediaItem {
  return { contentType: 'photo', mediaType: 'image', url, date, groupKey: key, text };
}
function vid(url: string, key: string, date: string, text: string): MediaItem {
  return { contentType: 'moment', mediaType: 'video', url, date, groupKey: key, text };
}

describe('planTweets', () => {
  it('같은 그룹 이미지는 4장씩 묶는다', () => {
    const items: MediaItem[] = ['a', 'b', 'c', 'd', 'e'].map(u =>
      img(u, 'g1', '2022-07-14', '220714 생일'));
    const tweets = planTweets(items);
    expect(tweets).toHaveLength(2);
    expect(tweets[0].mediaUrls).toEqual(['a', 'b', 'c', 'd']);
    expect(tweets[1].mediaUrls).toEqual(['e']);
    expect(tweets[0].text).toBe('220714 생일');
  });

  it('영상은 1개당 1트윗, 이미지와 안 섞인다', () => {
    const items: MediaItem[] = [
      img('i1', 'g1', '2022-07-14', '220714 생일'),
      img('i2', 'g1', '2022-07-14', '220714 생일'),
      vid('v1', 'g1', '2022-07-14', '220714 생일'),
    ];
    const tweets = planTweets(items);
    // 이미지 2장 -> 1트윗, 영상 1개 -> 1트윗
    expect(tweets).toHaveLength(2);
    expect(tweets[0].mediaUrls).toEqual(['i1', 'i2']);
    expect(tweets[1].mediaUrls).toEqual(['v1']);
  });

  it('오래된 날짜 그룹이 먼저 온다', () => {
    const items: MediaItem[] = [
      img('new', 'g2022', '2022-07-14', '220714 A'),
      img('old', 'g2020', '2020-07-14', '200714 B'),
    ];
    const tweets = planTweets(items);
    expect(tweets[0].text).toBe('200714 B');
    expect(tweets[1].text).toBe('220714 A');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run scripts/dailyTweet/group.test.ts`
Expected: FAIL — `group` 모듈 없음.

- [ ] **Step 3: 최소 구현**

Create `scripts/dailyTweet/group.ts`:
```ts
import type { MediaItem } from './normalize';

export type PlannedTweet = {
  text: string;
  mediaUrls: string[]; // 이미지 1~4장 또는 영상 1개
};

// MediaItem[] -> 게시할 트윗 목록.
// 규칙: 같은 groupKey끼리 묶어 이미지는 4장/트윗, 영상은 1개/트윗.
//       영상+이미지 혼합 금지. 그룹은 오래된 날짜부터.
export function planTweets(items: MediaItem[]): PlannedTweet[] {
  const groups = new Map<string, MediaItem[]>();
  for (const it of items) {
    const arr = groups.get(it.groupKey);
    if (arr) arr.push(it);
    else groups.set(it.groupKey, [it]);
  }

  const ordered = [...groups.values()].sort((a, b) => a[0].date.localeCompare(b[0].date));

  const tweets: PlannedTweet[] = [];
  for (const group of ordered) {
    const text = group[0].text;
    const images = group.filter(i => i.mediaType === 'image');
    const videos = group.filter(i => i.mediaType === 'video');
    for (let i = 0; i < images.length; i += 4) {
      tweets.push({ text, mediaUrls: images.slice(i, i + 4).map(x => x.url) });
    }
    for (const v of videos) {
      tweets.push({ text, mediaUrls: [v.url] });
    }
  }
  return tweets;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run scripts/dailyTweet/group.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/dailyTweet/group.ts scripts/dailyTweet/group.test.ts
git commit -m "feat(bot): 그룹/배칭 planTweets"
```

---

## Task 7: MIME 유틸 (`mime.ts`)

**Files:**
- Create: `scripts/dailyTweet/mime.ts`
- Test: `scripts/dailyTweet/mime.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `scripts/dailyTweet/mime.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mimeFromUrl } from './mime';

describe('mimeFromUrl', () => {
  it('이미지 확장자', () => {
    expect(mimeFromUrl('https://x.r2.dev/a.jpg')).toBe('image/jpeg');
    expect(mimeFromUrl('https://x.r2.dev/a.png')).toBe('image/png');
  });
  it('영상 확장자', () => {
    expect(mimeFromUrl('https://x.r2.dev/a.mp4')).toBe('video/mp4');
  });
  it('쿼리스트링 무시', () => {
    expect(mimeFromUrl('https://x.r2.dev/a.mp4?v=2')).toBe('video/mp4');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run scripts/dailyTweet/mime.test.ts`
Expected: FAIL.

- [ ] **Step 3: 최소 구현**

Create `scripts/dailyTweet/mime.ts`:
```ts
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
};

export function mimeFromUrl(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return MIME[ext] ?? 'application/octet-stream';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run scripts/dailyTweet/mime.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/dailyTweet/mime.ts scripts/dailyTweet/mime.test.ts
git commit -m "feat(bot): URL -> MIME 유틸"
```

---

## Task 8: R2 다운로드 (`r2.ts`)

**Files:**
- Create: `scripts/dailyTweet/r2.ts`
- Test: `scripts/dailyTweet/r2.test.ts` (순수 함수 `urlToKey`만 테스트)

- [ ] **Step 1: `urlToKey` 실패 테스트 작성**

Create `scripts/dailyTweet/r2.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { urlToKey } from './r2';

describe('urlToKey', () => {
  it('퍼블릭 URL에서 키 추출', () => {
    expect(urlToKey('https://cdn.x.r2.dev/photos/a.jpg', 'https://cdn.x.r2.dev'))
      .toBe('photos/a.jpg');
  });
  it('끝 슬래시 정규화', () => {
    expect(urlToKey('https://cdn.x.r2.dev/videos/b.mp4', 'https://cdn.x.r2.dev/'))
      .toBe('videos/b.mp4');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run scripts/dailyTweet/r2.test.ts`
Expected: FAIL — `r2` 모듈 없음.

- [ ] **Step 3: 구현**

Create `scripts/dailyTweet/r2.ts`:
```ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export function makeR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY!,
    },
  });
}

// R2 퍼블릭 URL -> 버킷 키
export function urlToKey(url: string, r2PublicUrl: string): string {
  const base = r2PublicUrl.replace(/\/$/, '');
  if (url.startsWith(base)) return url.slice(base.length).replace(/^\/+/, '');
  return new URL(url).pathname.replace(/^\/+/, '');
}

export async function downloadFromR2(client: S3Client, bucket: string, key: string): Promise<Buffer> {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`R2 객체 비어있음: ${key}`);
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run scripts/dailyTweet/r2.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add scripts/dailyTweet/r2.ts scripts/dailyTweet/r2.test.ts
git commit -m "feat(bot): R2 다운로드 + urlToKey"
```

---

## Task 9: X 클라이언트 (`x.ts`)

**Files:**
- Create: `scripts/dailyTweet/x.ts`

I/O 모듈이라 단위 테스트 대신 Task 12의 실측 테스트로 검증한다.

- [ ] **Step 1: 구현**

Create `scripts/dailyTweet/x.ts`:
```ts
import { TwitterApi } from 'twitter-api-v2';

export function makeXClient(): TwitterApi {
  return new TwitterApi({
    appKey: process.env.X_APP_KEY!,
    appSecret: process.env.X_APP_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessSecret: process.env.X_ACCESS_SECRET!,
  });
}

// 미디어 업로드. 영상은 라이브러리가 청크 업로드/처리 폴링을 자동 처리한다.
export async function uploadMedia(client: TwitterApi, buffer: Buffer, mimeType: string): Promise<string> {
  return client.v1.uploadMedia(buffer, { mimeType });
}

export type PreparedTweet = { text: string; mediaIds: string[] };

// 쓰레드 게시. 각 트윗을 직전 트윗에 답글로 연결. 게시된 트윗 id 배열 반환.
export async function postThread(client: TwitterApi, tweets: PreparedTweet[]): Promise<string[]> {
  const ids: string[] = [];
  let replyTo: string | undefined;
  for (const t of tweets) {
    const payload: Parameters<typeof client.v2.tweet>[1] = {
      media: { media_ids: t.mediaIds as [string] },
    };
    if (replyTo) payload.reply = { in_reply_to_tweet_id: replyTo };
    const res = await client.v2.tweet(t.text, payload);
    replyTo = res.data.id;
    ids.push(res.data.id);
  }
  return ids;
}
```

> 참고: `media_ids` 타입은 twitter-api-v2에서 1~4개 튜플을 기대한다. `planTweets`가 이미 이미지 ≤4, 영상 1개를 보장하므로 런타임상 안전하며, 타입 단언(`as [string]`)으로 컴파일을 통과시킨다.

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit -p tsconfig.json` (또는 프로젝트 빌드 `npm run build` 전 단계)
Expected: `scripts/dailyTweet/x.ts` 관련 타입 에러 없음.

> tsconfig가 `scripts/`를 포함하지 않으면 이 단계는 스킵하고 Task 10 실행 시 tsx가 컴파일한다.

- [ ] **Step 3: 커밋**

```bash
git add scripts/dailyTweet/x.ts
git commit -m "feat(bot): X 미디어 업로드 + 쓰레드 게시"
```

---

## Task 10: 중복 방지 (`dedup.ts`)

**Files:**
- Create: `scripts/dailyTweet/dedup.ts`

- [ ] **Step 1: 구현**

Create `scripts/dailyTweet/dedup.ts`:
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 봇은 service role 키로 접근한다 (RLS 우회, tweet_bot_log 쓰기 필요).
export function makeSupabase(): SupabaseClient {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function alreadyPosted(sb: SupabaseClient, runDate: string): Promise<boolean> {
  const { data, error } = await sb
    .from('tweet_bot_log')
    .select('run_date')
    .eq('run_date', runDate)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function recordRun(sb: SupabaseClient, runDate: string, tweetCount: number): Promise<void> {
  const { error } = await sb
    .from('tweet_bot_log')
    .insert({ run_date: runDate, tweet_count: tweetCount });
  if (error) throw error;
}
```

- [ ] **Step 2: 커밋**

```bash
git add scripts/dailyTweet/dedup.ts
git commit -m "feat(bot): tweet_bot_log 중복 방지"
```

---

## Task 11: 오케스트레이터 (`index.ts`)

**Files:**
- Create: `scripts/dailyTweet/index.ts`

- [ ] **Step 1: 구현**

Create `scripts/dailyTweet/index.ts`:
```ts
import 'dotenv/config';
import { filterOnThisDay } from '../../src/lib/dailyPick';
import type { Moment, Photo, Post, Video } from '../../src/lib/database';
import { getKstDateString } from './date';
import { normalizeMoments, normalizePhotos, normalizePosts } from './normalize';
import { planTweets } from './group';
import { mimeFromUrl } from './mime';
import { makeR2Client, urlToKey, downloadFromR2 } from './r2';
import { makeXClient, uploadMedia, postThread, type PreparedTweet } from './x';
import { makeSupabase, alreadyPosted, recordRun } from './dedup';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const runDate = getKstDateString();
  console.log(`[bot] 실행일(KST)=${runDate}${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const sb = makeSupabase();

  if (!DRY_RUN && (await alreadyPosted(sb, runDate))) {
    console.log('[bot] 이미 오늘 게시함 → 스킵');
    return;
  }

  // 콘텐츠 조회
  const [momentsRes, photosRes, postsRes, videosRes] = await Promise.all([
    sb.from('moments').select('*'),
    sb.from('photos').select('*'),
    sb.from('posts').select('*'),
    sb.from('videos').select('*'),
  ]);
  for (const r of [momentsRes, photosRes, postsRes, videosRes]) {
    if (r.error) throw r.error;
  }
  const moments = (momentsRes.data ?? []) as Moment[];
  const photos = (photosRes.data ?? []) as Photo[];
  const posts = (postsRes.data ?? []) as Post[];
  const videos = (videosRes.data ?? []) as Video[];

  // 그해 오늘 필터 (KST)
  const fMoments = filterOnThisDay(moments, runDate);
  const fPhotos = filterOnThisDay(photos, runDate);
  const fPosts = filterOnThisDay(posts, runDate);

  const videosById = new Map(videos.map(v => [v.id, v]));
  const r2Public = process.env.VITE_R2_PUBLIC_URL!;

  const items = [
    ...normalizeMoments(fMoments, videosById, r2Public),
    ...normalizePhotos(fPhotos, r2Public),
    ...normalizePosts(fPosts, r2Public),
  ];
  const tweets = planTweets(items);

  console.log(`[bot] 계획된 트윗 ${tweets.length}개:`);
  tweets.forEach((t, i) => console.log(`  ${i + 1}. "${t.text}" (${t.mediaUrls.length}개 미디어)`));

  if (DRY_RUN) {
    console.log('[bot] DRY RUN 종료 (게시 안 함)');
    return;
  }
  if (tweets.length === 0) {
    console.log('[bot] 오늘 게시할 콘텐츠 없음');
    return;
  }

  // 미디어 다운로드 + 업로드
  const r2 = makeR2Client();
  const x = makeXClient();
  const bucket = process.env.VITE_R2_BUCKET_NAME!;

  const prepared: PreparedTweet[] = [];
  for (const tw of tweets) {
    const mediaIds: string[] = [];
    for (const url of tw.mediaUrls) {
      try {
        const buf = await downloadFromR2(r2, bucket, urlToKey(url, r2Public));
        const id = await uploadMedia(x, buf, mimeFromUrl(url));
        mediaIds.push(id);
      } catch (e) {
        console.error(`[bot] 미디어 스킵: ${url}`, e);
      }
    }
    if (mediaIds.length > 0) prepared.push({ text: tw.text, mediaIds });
  }

  if (prepared.length === 0) {
    console.log('[bot] 업로드 성공한 미디어 없음 → 게시 안 함');
    return;
  }

  const posted = await postThread(x, prepared);
  console.log(`[bot] ${posted.length}개 트윗 게시 완료`);

  await recordRun(sb, runDate, posted.length);
  console.log('[bot] tweet_bot_log 기록 완료');
}

main().catch(err => {
  console.error('[bot] 실패:', err);
  process.exit(1);
});
```

- [ ] **Step 2: DRY RUN 로컬 실행 (키 없이 Supabase/R2만 필요)**

`.env.local`에 `SUPABASE_SERVICE_ROLE_KEY`, `VITE_R2_PUBLIC_URL` 등이 있는지 확인 후:
Run: `npm run tweet:dry`
Expected: 오늘(또는 `filterOnThisDay` 대상) 계획된 트윗 목록이 출력되고 게시 없이 종료. Supabase 조회가 정상 동작.

> `SUPABASE_SERVICE_ROLE_KEY`가 없으면 dedup/조회에서 인증 에러가 난다. Supabase 대시보드 → Settings → API에서 service_role 키를 `.env.local`에 추가.

- [ ] **Step 3: 커밋**

```bash
git add scripts/dailyTweet/index.ts
git commit -m "feat(bot): 오케스트레이터 (조회->계획->게시)"
```

---

## Task 12: 실측 검증 — X 게시 + mixed media 테스트

**전제:** X 개발자 앱(Read+Write) + OAuth 1.0a 키 4개 + 크레딧 충전 완료. 키를 `.env.local`에 추가.

- [ ] **Step 1: 오늘치 실제 1회 게시**

Run: `npx tsx scripts/dailyTweet/index.ts`
Expected: 계획된 트윗이 실제로 X에 쓰레드로 올라가고, `tweet_bot_log`에 오늘 날짜 기록. X 계정에서 쓰레드 육안 확인.

- [ ] **Step 2: 중복 방지 확인**

Run: `npx tsx scripts/dailyTweet/index.ts` (같은 날 재실행)
Expected: "이미 오늘 게시함 → 스킵" 출력, 중복 게시 안 됨.

- [ ] **Step 3: mixed media / 다중 영상 실측 (설계 §5 open item)**

임시 스크립트나 REPL로 영상 2개 또는 영상+이미지 `media_id`를 한 트윗에 첨부 시도:
```ts
// 예: 영상 media_id 2개를 한 트윗에
await client.v2.tweet('mixed test', { media: { media_ids: [id1, id2] } });
```
- **성공**하면 → `group.ts`의 `planTweets`를 "그룹당 미디어 4개까지 채우기(영상 포함)"로 완화하는 후속 태스크를 연다.
- **실패(에러)**하면 → 엄격 규칙 유지. 결과를 설계 문서 §5 open item에 기록.

- [ ] **Step 4: 결과 기록 커밋 (문서 업데이트)**

```bash
git add docs/superpowers/specs/2026-07-15-onthisday-x-bot-design.md
git commit -m "docs(bot): mixed media 실측 결과 반영"
```

---

## Task 13: GitHub Actions 크론

**Files:**
- Create: `.github/workflows/daily-tweet.yml`

- [ ] **Step 1: 워크플로 작성**

Create `.github/workflows/daily-tweet.yml`:
```yaml
name: Daily Tweet

on:
  schedule:
    - cron: '0 15 * * *' # UTC 15:00 = KST 00:00
  workflow_dispatch: {} # 수동 실행 허용

jobs:
  post:
    runs-on: ubuntu-latest
    env:
      TZ: Asia/Seoul
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      VITE_R2_ACCOUNT_ID: ${{ secrets.VITE_R2_ACCOUNT_ID }}
      VITE_R2_ACCESS_KEY_ID: ${{ secrets.VITE_R2_ACCESS_KEY_ID }}
      VITE_R2_SECRET_ACCESS_KEY: ${{ secrets.VITE_R2_SECRET_ACCESS_KEY }}
      VITE_R2_BUCKET_NAME: ${{ secrets.VITE_R2_BUCKET_NAME }}
      VITE_R2_PUBLIC_URL: ${{ secrets.VITE_R2_PUBLIC_URL }}
      X_APP_KEY: ${{ secrets.X_APP_KEY }}
      X_APP_SECRET: ${{ secrets.X_APP_SECRET }}
      X_ACCESS_TOKEN: ${{ secrets.X_ACCESS_TOKEN }}
      X_ACCESS_SECRET: ${{ secrets.X_ACCESS_SECRET }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx tsx scripts/dailyTweet/index.ts
```

- [ ] **Step 2: GitHub Secrets 등록**

GitHub 저장소 → Settings → Secrets and variables → Actions에 위 `env`의 12개 시크릿을 등록.
(Supabase URL/service_role, R2 5개, X 4개)

- [ ] **Step 3: 수동 실행 테스트**

GitHub → Actions → "Daily Tweet" → "Run workflow"로 수동 실행.
Expected: 로그에 계획/게시 출력, 성공 종료. (같은 날 재실행이면 스킵 로그)

- [ ] **Step 4: 커밋**

```bash
git add .github/workflows/daily-tweet.yml
git commit -m "feat(bot): GitHub Actions 일일 크론 (KST 자정)"
```

---

## 자체 검토 결과 (writing-plans self-review)

- **스펙 커버리지**: §2 스코프→Task 5, §3 선정→Task 11(filterOnThisDay), §4 텍스트→Task 3, 모먼트 플랫폼→Task 4, §5 그룹/배칭→Task 6, §6 미디어 업로드→Task 8·9, §7 중복 방지→Task 1·10, §8 스케줄→Task 13, §9 인증→Task 9·13, §10 에러 처리→Task 11(try/skip), §11 open item(mixed media)→Task 12. 누락 없음.
- **placeholder**: 모든 코드 스텝에 실제 코드 포함. "적절한 에러 처리" 류 표현 없음.
- **타입 일관성**: `MediaItem`(normalize) / `PlannedTweet`(group) / `PreparedTweet`(x) 이름·필드 일관. `planTweets`가 이미지≤4·영상1을 보장 → `x.ts`의 media_ids 안전.

## 나중에 확인/후속 (설계 open item)

1. mixed media/다중 영상 완화 (Task 12 결과에 따라).
2. 쓰레드 길이 상한 — 실제 게시 결과 보고 판단(현재 상한 없음).
3. X 영상 스펙 한도 초과 시 스킵 — 업로드 실패가 Task 11 try/catch로 이미 스킵되나, 사전 필터가 필요하면 후속.
4. 최소 크레딧 충전액 — X 개발자 콘솔 확인.
