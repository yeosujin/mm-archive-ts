# 1단계 미디어 인프라 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모먼트·포스트 영상의 첫 재생을 빠르게 한다 — r2.dev URL을 cdn 도메인으로 통일하고, 모든 R2 영상을 가벼운 H.264 mp4로 변환하고(빈 썸네일도 함께 채움), 새 업로드는 매시간 자동 변환한다. 배포 버전 1.21.3.

**Architecture:** 순수 로직(키 이름, ffmpeg 인자, 결과 판정, 대상 선별)은 `scripts/transcode/plan.ts`에 두고 vitest로 검증한다. 실행기 `scripts/transcode-r2-videos.ts`는 DB에서 `original_url`이 비어 있는 행을 골라 R2에서 받아 ffmpeg로 변환한 뒤 **새 키**(`videos/t/…mp4`)에 올리고 DB를 바꾼다. 원본 객체는 지우지 않는다. 어드민은 영상 교체·삭제 시 `original_url`도 같이 정리한다.

**Tech Stack:** Node(tsx) 스크립트, `@aws-sdk/client-s3` + `@aws-sdk/lib-storage`, `@supabase/supabase-js`(service role), ffmpeg(`h264_videotoolbox` 로컬 / `libx264` Actions), vitest, GitHub Actions, Supabase SQL.

**스펙:** `docs/superpowers/specs/2026-10-27-immersive-ui-design.md` §4

---

## 사전 사실 (2026-10-27 측정)

- 모먼트 1,414개, 전부 R2. 그중 `pub-e283cbe5050744f68f0725eaa678e156.r2.dev` 호스트 111개. 썸네일 빈 행 있음(첫 1,000행 중 40개)
- 포스트 영상 미디어 7개(전부 R2, mp4), 썸네일 빈 것 2개
- `videos` 테이블에는 R2 영상 0개 → 대상 아님
- Supabase 기본 조회 한도 1,000행 → 스크립트는 **페이지 단위로** 읽어야 한다
- 로컬 맥: `ffmpeg`에 `h264_videotoolbox`, `libx264` 둘 다 있음
- 로컬에서 Node HTTPS가 사내 인증서 때문에 실패하면 `NODE_OPTIONS=--use-system-ca`를 붙인다
- 스크립트는 `process.env.VITE_R2_*`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 읽는다(봇과 동일). `.env.local`의 R2 키는 1.21.2 이후 **새 키**여야 한다

## 파일 구조

| 파일 | 책임 |
|---|---|
| `supabase/sql/2026-10-27-r2-dev-to-cdn.sql` (생성) | r2.dev 호스트 → cdn 호스트 일괄 치환 |
| `supabase/sql/2026-10-27-add-moment-original-url.sql` (생성) | `moments.original_url` 컬럼 |
| `scripts/transcode/plan.ts` (생성) | 순수 함수: 키 이름, ffmpeg 인자, 결과 판정, 포스트 대상 선별 |
| `scripts/transcode/plan.test.ts` (생성) | 위 함수 테스트 |
| `scripts/transcode-r2-videos.ts` (생성) | 실행기: DB 조회 → 다운로드 → 변환 → 업로드 → DB 갱신 |
| `.github/workflows/transcode.yml` (생성) | 매시간 실행 |
| `src/lib/database/types.ts` (수정) | `Moment.original_url`, `PostMedia.original_url` |
| `src/pages/admin/AdminMoments.tsx` (수정) | 교체 시 `original_url` 초기화·원본 삭제, 삭제 시 원본도 삭제 |
| `src/pages/admin/AdminPosts.tsx` (수정) | 미디어 삭제 시 원본도 삭제 |
| `package.json` (수정) | `transcode` npm 스크립트, 버전 1.21.3 |
| vault 문서 (수정) | `patterns/r2-media-pipeline.md`, `log.md` |

---

### Task 1: r2.dev → cdn 치환 SQL

**Files:**
- Create: `supabase/sql/2026-10-27-r2-dev-to-cdn.sql`

- [ ] **Step 1: SQL 작성**

```sql
-- r2.dev 공개 주소를 cdn.mmemory.cloud로 통일 (같은 버킷, 키 경로 그대로)
--
-- r2.dev 주소는 Cloudflare 캐시를 타지 않는다. 호스트만 바꾸면 같은 객체가 cdn 캐시를 탄다.
-- jsonb 컬럼은 텍스트로 바꿔 치환한다 — 중첩 위치(media[].url/thumbnail, messages[].content)를 한 번에 처리한다.
-- 여러 번 실행해도 결과가 같다.

begin;

update moments set
  tweet_url = replace(tweet_url, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud'),
  thumbnail_url = replace(thumbnail_url, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud')
where tweet_url like '%r2.dev%' or thumbnail_url like '%r2.dev%';

update photos set
  image_url = replace(image_url, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud'),
  thumbnail_url = replace(thumbnail_url, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud')
where image_url like '%r2.dev%' or thumbnail_url like '%r2.dev%';

update posts set
  media = replace(media::text, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud')::jsonb
where media::text like '%r2.dev%';

update episodes set
  messages = replace(messages::text, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud')::jsonb
where messages::text like '%r2.dev%';

update episodes set
  tweet_images = replace(tweet_images::text, 'https://pub-e283cbe5050744f68f0725eaa678e156.r2.dev', 'https://cdn.mmemory.cloud')::jsonb
where tweet_images::text like '%r2.dev%';

-- 확인: 전부 0이어야 한다
select
  (select count(*) from moments  where tweet_url like '%r2.dev%' or thumbnail_url like '%r2.dev%') as moments_left,
  (select count(*) from photos   where image_url like '%r2.dev%' or thumbnail_url like '%r2.dev%') as photos_left,
  (select count(*) from posts    where media::text like '%r2.dev%') as posts_left,
  (select count(*) from episodes where messages::text like '%r2.dev%' or tweet_images::text like '%r2.dev%') as episodes_left;

commit;
```

- [ ] **Step 2: 실행 전 건수 확인 (읽기 전용)**

Supabase SQL Editor에서 실행:

```sql
select
  (select count(*) from moments  where tweet_url like '%r2.dev%' or thumbnail_url like '%r2.dev%') as moments,
  (select count(*) from photos   where image_url like '%r2.dev%' or thumbnail_url like '%r2.dev%') as photos,
  (select count(*) from posts    where media::text like '%r2.dev%') as posts,
  (select count(*) from episodes where messages::text like '%r2.dev%' or tweet_images::text like '%r2.dev%') as episodes;
```

Expected: moments ≈ 111, 나머지는 0 이상. 이 숫자를 기록한다.

- [ ] **Step 3: 커밋 (실행은 Task 9에서 사용자 확인 후)**

```bash
git add supabase/sql/2026-10-27-r2-dev-to-cdn.sql
git commit -m "chore(sql): r2.dev 공개 주소를 cdn 도메인으로 치환하는 SQL"
```

---

### Task 2: `moments.original_url` 컬럼 + 타입

**Files:**
- Create: `supabase/sql/2026-10-27-add-moment-original-url.sql`
- Modify: `src/lib/database/types.ts` (`Moment`, `PostMedia`)

- [ ] **Step 1: SQL 작성**

```sql
-- 트랜스코딩 전 원본 영상 URL
--
-- scripts/transcode-r2-videos.ts가 변환하면 tweet_url ← 변환본(videos/t/…mp4), original_url ← 원래 tweet_url.
-- original_url이 채워진 행 = 처리 완료(멱등 판정 기준). 원본 객체는 R2에 그대로 남는다.
-- 포스트 영상은 posts.media[] 항목의 original_url 필드로 같은 일을 한다(스키마 변경 없음).
alter table moments add column if not exists original_url text;
```

- [ ] **Step 2: 타입 추가**

`src/lib/database/types.ts`의 `Moment`와 `PostMedia`를 아래처럼 바꾼다.

```ts
export interface Moment {
  id: string;
  title: string;
  tweet_url: string;
  date: string;
  video_id?: string;
  position?: number;
  thumbnail_url?: string;
  /** 트랜스코딩 전 원본 URL. 채워져 있으면 변환 완료 */
  original_url?: string | null;
}

export interface PostMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  thumb_hash?: string;
  /** 트랜스코딩 전 원본 URL (영상만). 채워져 있으면 변환 완료 */
  original_url?: string;
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add supabase/sql/2026-10-27-add-moment-original-url.sql src/lib/database/types.ts
git commit -m "feat(moments): 트랜스코딩 원본 보관용 original_url 컬럼"
```

---

### Task 3: 순수 로직 `scripts/transcode/plan.ts` (TDD)

**Files:**
- Create: `scripts/transcode/plan.ts`
- Test: `scripts/transcode/plan.test.ts`

`isR2Url`(`scripts/dailyTweet/normalize.ts`)과 `urlToKey`(`scripts/dailyTweet/r2.ts`)는 이미 있으니 재사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`scripts/transcode/plan.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  transcodedKey,
  thumbKey,
  buildTranscodeArgs,
  buildThumbArgs,
  decideResult,
  pendingPostVideoIndexes,
} from './plan';

const R2 = 'https://cdn.mmemory.cloud';

describe('transcodedKey', () => {
  it('videos/ 아래 원본을 videos/t/ 아래 mp4로', () => {
    expect(transcodedKey('videos/1700-ab12-clip.MOV')).toBe('videos/t/1700-ab12-clip.mp4');
  });
  it('mp4도 같은 규칙', () => {
    expect(transcodedKey('videos/1700-ab12-clip.mp4')).toBe('videos/t/1700-ab12-clip.mp4');
  });
  it('하위 폴더가 있어도 basename만 쓴다', () => {
    expect(transcodedKey('videos/x/y/a.b.mov')).toBe('videos/t/a.b.mp4');
  });
});

describe('thumbKey', () => {
  it('변환본 키 옆에 _thumb.jpg', () => {
    expect(thumbKey('videos/t/1700-ab12-clip.mp4')).toBe('videos/t/1700-ab12-clip_thumb.jpg');
  });
});

describe('buildTranscodeArgs', () => {
  it('공통 규격: 1280 상한, 30fps 상한, AAC 128k, faststart', () => {
    const args = buildTranscodeArgs('in.mov', 'out.mp4', 'libx264');
    const s = args.join(' ');
    expect(args[args.length - 1]).toBe('out.mp4');
    expect(s).toContain('-i in.mov');
    expect(s).toContain("scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2");
    expect(s).toContain('-fpsmax 30');
    expect(s).toContain('-c:a aac -b:a 128k');
    expect(s).toContain('-movflags +faststart');
    expect(s).toContain('-pix_fmt yuv420p');
    expect(s).toContain('-maxrate 2500k');
  });
  it('libx264는 crf, videotoolbox는 비트레이트 지정', () => {
    expect(buildTranscodeArgs('i', 'o', 'libx264').join(' ')).toContain('-c:v libx264 -preset veryfast -crf 23');
    expect(buildTranscodeArgs('i', 'o', 'videotoolbox').join(' ')).toContain('-c:v h264_videotoolbox -b:v 2500k');
  });
});

describe('buildThumbArgs', () => {
  it('0.5초 지점 1프레임, 폭 640 상한 jpg', () => {
    expect(buildThumbArgs('in.mp4', 'out.jpg')).toEqual([
      '-y', '-ss', '0.5', '-i', 'in.mp4', '-frames:v', '1',
      '-vf', "scale=w='min(640,iw)':h=-2", '-q:v', '3', 'out.jpg',
    ]);
  });
});

describe('decideResult', () => {
  it('mov 원본은 크기와 상관없이 변환본을 쓴다 (컨테이너 통일)', () => {
    expect(decideResult('videos/a.mov', 1000, 2000)).toBe('use-transcoded');
  });
  it('mp4 원본보다 변환본이 작으면 변환본', () => {
    expect(decideResult('videos/a.mp4', 2000, 1000)).toBe('use-transcoded');
  });
  it('mp4 원본보다 변환본이 크거나 같으면 원본 유지', () => {
    expect(decideResult('videos/a.mp4', 1000, 1000)).toBe('keep-original');
  });
});

describe('pendingPostVideoIndexes', () => {
  it('R2 영상 중 original_url이 없는 것만', () => {
    const media = [
      { type: 'image' as const, url: `${R2}/videos/a.jpg` },
      { type: 'video' as const, url: `${R2}/videos/b.mp4` },
      { type: 'video' as const, url: `${R2}/videos/t/c.mp4`, original_url: `${R2}/videos/c.mov` },
      { type: 'video' as const, url: 'https://video.twimg.com/x.mp4' },
    ];
    expect(pendingPostVideoIndexes(media, R2)).toEqual([1]);
  });
  it('media가 없으면 빈 배열', () => {
    expect(pendingPostVideoIndexes(undefined, R2)).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run scripts/transcode/plan.test.ts`
Expected: FAIL — `Failed to resolve import "./plan"`

- [ ] **Step 3: 구현**

`scripts/transcode/plan.ts`:

```ts
import { isR2Url } from '../dailyTweet/normalize';

export type Encoder = 'videotoolbox' | 'libx264';

export const TRANSCODED_PREFIX = 'videos/t/';

/** 원본 키 → 변환본 키. 원본은 덮어쓰지 않는다(CDN 캐시 무효화가 필요 없도록) */
export function transcodedKey(originalKey: string): string {
  const base = originalKey.slice(originalKey.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '');
  return `${TRANSCODED_PREFIX}${base}.mp4`;
}

export function thumbKey(videoKey: string): string {
  return videoKey.replace(/\.[^.]+$/, '_thumb.jpg');
}

/** 긴 변 1280 이하, 30fps 이하, 약 2.5Mbps, AAC 128k, faststart */
export function buildTranscodeArgs(input: string, output: string, encoder: Encoder): string[] {
  const video = encoder === 'videotoolbox'
    ? ['-c:v', 'h264_videotoolbox', '-b:v', '2500k', '-maxrate', '2500k', '-bufsize', '5000k', '-profile:v', 'high', '-allow_sw', '1']
    : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-maxrate', '2500k', '-bufsize', '5000k', '-profile:v', 'high'];
  return [
    '-y', '-i', input,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    '-fpsmax', '30',
    ...video,
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-map_metadata', '-1',
    '-movflags', '+faststart',
    output,
  ];
}

export function buildThumbArgs(input: string, output: string): string[] {
  return ['-y', '-ss', '0.5', '-i', input, '-frames:v', '1', '-vf', "scale=w='min(640,iw)':h=-2", '-q:v', '3', output];
}

/** mov는 컨테이너 통일을 위해 항상 변환본. mp4는 변환본이 더 작을 때만 */
export function decideResult(originalKey: string, originalSize: number, outputSize: number): 'use-transcoded' | 'keep-original' {
  if (!originalKey.toLowerCase().endsWith('.mp4')) return 'use-transcoded';
  return outputSize < originalSize ? 'use-transcoded' : 'keep-original';
}

interface MediaLike {
  type: 'image' | 'video';
  url: string;
  original_url?: string;
}

export function pendingPostVideoIndexes(media: MediaLike[] | null | undefined, r2PublicUrl: string): number[] {
  return (media ?? []).flatMap((m, i) =>
    m.type === 'video' && !m.original_url && isR2Url(m.url, r2PublicUrl) ? [i] : []
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run scripts/transcode/plan.test.ts`
Expected: PASS (전부)

- [ ] **Step 5: ffmpeg 인자가 실제로 동작하는지 확인**

```bash
mkdir -p /tmp/tc && ffmpeg -y -f lavfi -i testsrc2=size=1920x1080:rate=60:duration=2 -f lavfi -i sine=duration=2 -c:v libx264 -c:a aac -shortest /tmp/tc/in.mov
npx tsx -e "import {buildTranscodeArgs,buildThumbArgs} from './scripts/transcode/plan'; console.log(JSON.stringify([buildTranscodeArgs('/tmp/tc/in.mov','/tmp/tc/out.mp4','videotoolbox'), buildThumbArgs('/tmp/tc/out.mp4','/tmp/tc/t.jpg')]))" > /tmp/tc/args.json
node -e "const [a,b]=require('/tmp/tc/args.json');const {execFileSync}=require('child_process');execFileSync('ffmpeg',a);execFileSync('ffmpeg',b)"
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate -of csv=p=0 /tmp/tc/out.mp4
ls -la /tmp/tc/t.jpg
```

Expected: `h264,1280,720,30/1` 와 jpg 파일 존재. (Actions용 `libx264`로도 한 번 같은 확인)

- [ ] **Step 6: 커밋**

```bash
git add scripts/transcode/plan.ts scripts/transcode/plan.test.ts
git commit -m "feat(transcode): 변환 키·ffmpeg 인자·결과 판정 순수 함수"
```

---

### Task 4: 실행기 `scripts/transcode-r2-videos.ts`

**Files:**
- Create: `scripts/transcode-r2-videos.ts`
- Modify: `package.json` (scripts에 `"transcode": "tsx scripts/transcode-r2-videos.ts"`)

- [ ] **Step 1: 실행기 작성**

```ts
/**
 * R2 영상(모먼트·포스트)을 가벼운 H.264 mp4로 변환한다. 매시간 Actions에서도 돈다.
 *
 * 동작:
 *  1. DB에서 original_url이 비어 있는 R2 영상을 고른다 (moments 페이지 단위, posts.media[])
 *  2. 다운로드 → ffmpeg 변환 → videos/t/{basename}.mp4 로 업로드 (원본 객체는 그대로 둔다)
 *  3. 썸네일이 비어 있으면 0.5초 프레임을 jpg로 올린다
 *  4. DB: tweet_url/url ← 변환본, original_url ← 원래 주소
 *
 * 안전성:
 *  - 멱등 — original_url이 채워진 행은 건너뛴다. 중간에 죽어도 다시 돌리면 된다
 *  - DB 갱신은 tweet_url이 그대로일 때만 (그 사이 어드민이 영상을 바꿨으면 손대지 않는다)
 *  - 롤백 — tweet_url ← original_url 로 되돌리면 끝
 *
 * 실행:
 *  NODE_OPTIONS=--use-system-ca npx tsx --env-file=.env.local scripts/transcode-r2-videos.ts --dry-run --limit 3
 *  NODE_OPTIONS=--use-system-ca npx tsx --env-file=.env.local scripts/transcode-r2-videos.ts --limit 5
 *  옵션: --dry-run(업로드·DB 변경 없음) --limit N --encoder libx264|videotoolbox
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createClient } from '@supabase/supabase-js';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { urlToKey } from './dailyTweet/r2';
import { isR2Url } from './dailyTweet/normalize';
import {
  type Encoder,
  transcodedKey,
  thumbKey,
  buildTranscodeArgs,
  buildThumbArgs,
  decideResult,
  pendingPostVideoIndexes,
} from './transcode/plan';

const execFileAsync = promisify(execFile);

const {
  VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_BUCKET_NAME, VITE_R2_PUBLIC_URL,
  VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!VITE_R2_ACCOUNT_ID || !VITE_R2_ACCESS_KEY_ID || !VITE_R2_SECRET_ACCESS_KEY || !VITE_R2_BUCKET_NAME || !VITE_R2_PUBLIC_URL
  || !VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경변수 누락: VITE_R2_*(5종), VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const encIdx = args.indexOf('--encoder');
const ENCODER: Encoder = encIdx >= 0
  ? (args[encIdx + 1] as Encoder)
  : process.platform === 'darwin' ? 'videotoolbox' : 'libx264';

const PUBLIC = VITE_R2_PUBLIC_URL.replace(/\/$/, '');
const BUCKET = VITE_R2_BUCKET_NAME;

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: VITE_R2_ACCESS_KEY_ID, secretAccessKey: VITE_R2_SECRET_ACCESS_KEY },
});
const sb = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Converted {
  url: string;          // 최종 재생 URL (변환본 또는 원본 유지)
  thumbnailUrl?: string; // 새로 만든 썸네일 (요청했을 때만)
  note: string;
}

async function download(key: string, dest: string): Promise<void> {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`empty body: ${key}`);
  await pipeline(res.Body as Readable, createWriteStream(dest));
}

async function upload(key: string, src: string, contentType: string): Promise<void> {
  await new Upload({
    client: r2,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: createReadStream(src),
      ContentType: contentType,
      // 새 키에만 쓰고 덮어쓰지 않으므로 오래 캐시해도 안전하다
      CacheControl: 'public, max-age=31536000, immutable',
    },
  }).done();
}

/** 영상 하나 변환. 업로드까지 하고 최종 URL을 돌려준다 (DB는 호출 쪽에서) */
async function convert(tmp: string, url: string, needThumb: boolean): Promise<Converted> {
  const key = urlToKey(url, PUBLIC);
  const inPath = join(tmp, 'in' + key.slice(key.lastIndexOf('.')));
  const outPath = join(tmp, 'out.mp4');
  const thumbPath = join(tmp, 'thumb.jpg');
  try {
    await download(key, inPath);
    await execFileAsync('ffmpeg', buildTranscodeArgs(inPath, outPath, ENCODER), { maxBuffer: 100 * 1024 * 1024 });
    const inSize = (await stat(inPath)).size;
    const outSize = (await stat(outPath)).size;
    const result = decideResult(key, inSize, outSize);
    const newKey = transcodedKey(key);
    const finalUrl = result === 'use-transcoded' ? `${PUBLIC}/${newKey}` : url;
    const note = `${(inSize / 1048576).toFixed(1)}MB → ${(outSize / 1048576).toFixed(1)}MB ${result}`;

    let thumbnailUrl: string | undefined;
    if (needThumb) {
      await execFileAsync('ffmpeg', buildThumbArgs(outPath, thumbPath));
      thumbnailUrl = `${PUBLIC}/${thumbKey(newKey)}`;
    }

    if (!DRY_RUN) {
      if (result === 'use-transcoded') await upload(newKey, outPath, 'video/mp4');
      if (thumbnailUrl) await upload(thumbKey(newKey), thumbPath, 'image/jpeg');
    }
    return { url: finalUrl, thumbnailUrl, note };
  } finally {
    await Promise.all([inPath, outPath, thumbPath].map(p => rm(p, { force: true })));
  }
}

interface MomentRow { id: string; tweet_url: string; thumbnail_url: string | null }

async function pendingMoments(): Promise<MomentRow[]> {
  const rows: MomentRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('moments')
      .select('id,tweet_url,thumbnail_url')
      .is('original_url', null)
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data.filter(r => isR2Url(r.tweet_url, PUBLIC)));
    if (data.length < 1000) return rows;
  }
}

interface MediaRow { type: 'image' | 'video'; url: string; thumbnail?: string; original_url?: string }
interface PostRow { id: string; media: MediaRow[] | null }

async function pendingPosts(): Promise<PostRow[]> {
  const { data, error } = await sb.from('posts').select('id,media').not('media', 'is', null);
  if (error) throw error;
  return (data as PostRow[]).filter(p => pendingPostVideoIndexes(p.media, PUBLIC).length > 0);
}

async function main() {
  console.log(`🎬 트랜스코딩 (encoder=${ENCODER}${DRY_RUN ? ', DRY RUN' : ''}${LIMIT !== Infinity ? `, LIMIT ${LIMIT}` : ''})`);
  const tmp = await mkdtemp(join(tmpdir(), 'r2-transcode-'));
  const stats = { done: 0, failed: 0 };
  let budget = LIMIT;

  const moments = await pendingMoments();
  console.log(`📦 대기 모먼트 ${moments.length}개`);
  for (const m of moments) {
    if (budget-- <= 0) break;
    try {
      const c = await convert(tmp, m.tweet_url, !m.thumbnail_url);
      console.log(`   ✅ moment ${m.id} ${c.note}${c.thumbnailUrl ? ' +thumb' : ''}`);
      if (!DRY_RUN) {
        const { error } = await sb.from('moments')
          .update({
            tweet_url: c.url,
            original_url: m.tweet_url,
            ...(c.thumbnailUrl ? { thumbnail_url: c.thumbnailUrl } : {}),
          })
          .eq('id', m.id)
          .eq('tweet_url', m.tweet_url)
          .is('original_url', null);
        if (error) throw error;
      }
      stats.done++;
    } catch (err) {
      stats.failed++;
      console.error(`   ❌ moment ${m.id} ${m.tweet_url}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const posts = await pendingPosts();
  console.log(`📦 대기 포스트 ${posts.length}개`);
  for (const p of posts) {
    if (budget <= 0) break;
    const media = [...(p.media ?? [])];
    let changed = false;
    for (const i of pendingPostVideoIndexes(media, PUBLIC)) {
      if (budget-- <= 0) break;
      try {
        const item = media[i];
        const c = await convert(tmp, item.url, !item.thumbnail);
        console.log(`   ✅ post ${p.id}[${i}] ${c.note}${c.thumbnailUrl ? ' +thumb' : ''}`);
        media[i] = { ...item, url: c.url, original_url: item.url, ...(c.thumbnailUrl ? { thumbnail: c.thumbnailUrl } : {}) };
        changed = true;
        stats.done++;
      } catch (err) {
        stats.failed++;
        console.error(`   ❌ post ${p.id}[${i}]: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (changed && !DRY_RUN) {
      const { error } = await sb.from('posts').update({ media }).eq('id', p.id);
      if (error) console.error(`   ❌ post ${p.id} DB 갱신 실패: ${error.message}`);
    }
  }

  await rm(tmp, { recursive: true, force: true });
  console.log(`📊 완료 ${stats.done} · 실패 ${stats.failed}`);
  if (stats.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('💥 치명적 오류:', err);
  process.exit(1);
});
```

- [ ] **Step 2: npm 스크립트 추가**

`package.json`의 `"scripts"`에 `"tweet:dry"` 다음 줄로 추가:

```json
    "transcode": "tsx scripts/transcode-r2-videos.ts"
```

- [ ] **Step 3: 린트·기동 확인**

`scripts/`는 tsconfig 대상이 아니라 타입 검사는 tsx 실행으로 대신한다(실제 변환은 Task 8).

Run: `npx eslint scripts/transcode-r2-videos.ts scripts/transcode/ && env -u VITE_R2_PUBLIC_URL npx tsx scripts/transcode-r2-videos.ts; echo "exit=$?"`
Expected: 린트 에러 없음, `❌ 환경변수 누락` 출력 후 `exit=1` (import·문법 오류 없이 기동됨)

- [ ] **Step 4: 커밋**

```bash
git add scripts/transcode-r2-videos.ts package.json
git commit -m "feat(transcode): R2 모먼트·포스트 영상 H.264 변환 스크립트"
```

---

### Task 5: 어드민이 `original_url`을 정리

**Files:**
- Modify: `src/pages/admin/AdminMoments.tsx` (`handleSubmit` 수정 분기, `handleDelete`)
- Modify: `src/pages/admin/AdminPosts.tsx` (`handleRemoveMedia`, 포스트 삭제 루프)

영상을 교체했는데 `original_url`이 남아 있으면 스크립트가 "이미 변환됨"으로 보고 새 영상을 건너뛴다. 삭제할 때는 원본 객체도 지워야 고아 파일이 안 생긴다.

- [ ] **Step 1: AdminMoments — 교체 시**

`handleSubmit`의 수정 분기(현재 `if (originalMoment && originalMoment.tweet_url !== formData.tweet_url) {` 블록과 이어지는 `updateMoment` 호출)를 아래로 바꾼다.

```tsx
        const originalMoment = moments.find(m => m.id === editingId);
        const videoChanged = !!originalMoment && originalMoment.tweet_url !== formData.tweet_url;
        if (originalMoment && videoChanged) {
          deleteFileFromR2(originalMoment.tweet_url).catch(err => console.error('Cleanup failed:', err));
          if (originalMoment.original_url) {
            deleteFileFromR2(originalMoment.original_url).catch(err => console.error('Original cleanup failed:', err));
          }
          if (originalMoment.thumbnail_url) {
            deleteFileFromR2(originalMoment.thumbnail_url).catch(err => console.error('Thumb cleanup failed:', err));
          }
        }

        await updateMoment(editingId, {
          title: formData.title,
          date: formData.date,
          video_id: formData.video_id || undefined,
          position: Number(formData.position) || 0,
          thumbnail_url: formData.thumbnail_url || undefined,
          // 영상이 바뀐 경우에만 주소를 쓴다 — 그 사이 변환 스크립트가 바꾼 tweet_url을 낡은 값으로 덮지 않도록
          ...(videoChanged ? { tweet_url: formData.tweet_url, original_url: null } : {}),
        });
```

- [ ] **Step 2: AdminMoments — 삭제 시**

`handleDelete`의 `if (moment?.thumbnail_url) {` 바로 앞에 추가:

```tsx
      if (moment?.original_url) {
        deleteFileFromR2(moment.original_url).catch(err => console.error('Original delete failed:', err));
      }
```

- [ ] **Step 3: AdminPosts — 미디어 하나 삭제**

`handleRemoveMedia`의 `if (item.data.thumbnail) {` 블록 다음에 추가:

```tsx
        if (item.data.original_url) {
          await deleteFileFromR2(item.data.original_url);
        }
```

- [ ] **Step 4: AdminPosts — 포스트 삭제**

포스트 삭제 루프의 `if (media.thumbnail) {` 블록 다음에 추가:

```tsx
          if (media.original_url) {
            await deleteFileFromR2(media.original_url);
          }
```

- [ ] **Step 5: 빌드·린트**

Run: `npm run build && npx eslint src/pages/admin/AdminMoments.tsx src/pages/admin/AdminPosts.tsx`
Expected: 성공, 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add src/pages/admin/AdminMoments.tsx src/pages/admin/AdminPosts.tsx
git commit -m "feat(admin): 영상 교체·삭제 시 트랜스코딩 원본도 정리"
```

---

### Task 6: 매시간 자동 변환 워크플로

**Files:**
- Create: `.github/workflows/transcode.yml`

- [ ] **Step 1: 워크플로 작성**

```yaml
name: Transcode R2 Videos

# 어드민이 새로 올린 모먼트·포스트 영상을 가벼운 mp4로 바꾼다.
# 올린 직후 잠깐은 원본이 재생되고, 다음 실행 때 변환본으로 바뀐다.
# 대기 행이 없으면 DB 조회만 하고 끝난다.
on:
  schedule:
    - cron: '17 * * * *'
  workflow_dispatch:
    inputs:
      limit:
        description: '최대 처리 개수'
        default: '30'

# 두 실행이 같은 행을 동시에 처리하지 않도록
concurrency:
  group: transcode
  cancel-in-progress: false

jobs:
  transcode:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    env:
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      VITE_R2_ACCOUNT_ID: ${{ secrets.VITE_R2_ACCOUNT_ID }}
      VITE_R2_ACCESS_KEY_ID: ${{ secrets.VITE_R2_ACCESS_KEY_ID }}
      VITE_R2_SECRET_ACCESS_KEY: ${{ secrets.VITE_R2_SECRET_ACCESS_KEY }}
      VITE_R2_BUCKET_NAME: ${{ secrets.VITE_R2_BUCKET_NAME }}
      VITE_R2_PUBLIC_URL: ${{ secrets.VITE_R2_PUBLIC_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: sudo apt-get update && sudo apt-get install -y ffmpeg
      - run: npm ci
      - run: npx tsx scripts/transcode-r2-videos.ts --encoder libx264 --limit ${{ inputs.limit || '30' }}
```

- [ ] **Step 2: 다른 워크플로와 같은 스타일인지 확인**

Run: `diff <(grep -E "node-version|actions/checkout|setup-node" .github/workflows/daily-tweet.yml) <(grep -E "node-version|actions/checkout|setup-node" .github/workflows/transcode.yml)`
Expected: 차이 없음. 다르면 daily-tweet.yml 쪽 버전에 맞춘다.

- [ ] **Step 3: 커밋**

```bash
git add .github/workflows/transcode.yml
git commit -m "ci: 새 업로드 영상 매시간 트랜스코딩"
```

---

### Task 7: 문서·버전

**Files:**
- Modify: `knowledge-vault/wiki/patterns/r2-media-pipeline.md`
- Modify: `knowledge-vault/wiki/log.md`
- Modify: `package.json`, `package-lock.json`(3·9번째 줄 version), `CLAUDE.md`(현재 버전 표기)

- [ ] **Step 1: r2-media-pipeline.md `## 주의` 위에 섹션 추가**

```markdown
## 트랜스코딩 (1.21.3~)

업로드 원본(대부분 iPhone .mov, 8~12Mbps, 60~120fps)은 첫 재생이 느리다. `scripts/transcode-r2-videos.ts`가 H.264 mp4(긴 변 1280, 30fps, 약 2.5Mbps, AAC 128k, faststart)로 바꿔 **새 키** `videos/t/{basename}.mp4`에 올린다.

- `moments.original_url` / `posts.media[].original_url` = 원래 주소. 채워져 있으면 처리 완료
- 원본 객체는 지우지 않는다. 롤백은 `tweet_url ← original_url`
- 썸네일이 비어 있으면 0.5초 프레임 jpg(`…_thumb.jpg`)도 채운다
- `.github/workflows/transcode.yml`이 매시간 새 업로드를 처리한다(libx264). 대량 처리는 로컬 맥(videotoolbox)
- 어드민에서 영상을 교체하면 `original_url`을 비워 다시 변환 대상이 되게 하고, 삭제 시 원본도 지운다
```

- [ ] **Step 2: log.md 최상단(첫 `---` 다음)에 항목 추가**

```markdown
## 2026-10-27 — 영상 트랜스코딩 + r2.dev 주소 정리 (1.21.3)

모먼트·포스트 영상을 H.264 mp4로 변환해 `videos/t/`에 두고 `original_url`에 원래 주소를 남긴다.
r2.dev 주소는 cdn 도메인으로 치환했다(캐시를 타도록). 매시간 Actions가 새 업로드를 처리한다
→ [[r2-media-pipeline]] · [[cloudflare-r2]]

---
```

- [ ] **Step 3: 버전 1.21.2 → 1.21.3**

`package.json` `"version"`, `package-lock.json` 3·9번째 줄, `CLAUDE.md`의 `(현재 1.21.2)`를 모두 1.21.3으로.

- [ ] **Step 4: 전체 검증 후 커밋**

Run: `npm run build && npm run lint && npm test`
Expected: 빌드 성공, 린트 에러 0, 테스트 전부 통과(새 plan.test.ts 포함)

```bash
git add knowledge-vault package.json package-lock.json CLAUDE.md
git commit -m "docs: 트랜스코딩 파이프라인 문서화, 버전 1.21.3"
```

---

### Task 8: 소규모 실제 실행 (사용자 확인 필요 지점 포함)

DB 스키마 변경과 운영 데이터 변경이 들어간다. **각 SQL 실행 전 사용자에게 확인받는다.**

- [ ] **Step 1: (사용자 확인) `original_url` 컬럼 추가** — Supabase SQL Editor에서 `supabase/sql/2026-10-27-add-moment-original-url.sql` 실행. 컬럼이 늘 뿐 기존 화면에 영향 없음.

- [ ] **Step 2: 드라이런**

Run: `NODE_OPTIONS=--use-system-ca npx tsx --env-file=.env.local scripts/transcode-r2-videos.ts --dry-run --limit 3`
Expected: `대기 모먼트 1414개`(±), 3줄의 `✅ moment … XX.XMB → X.XMB use-transcoded`, DB·R2 변화 없음

- [ ] **Step 3: 5개 실제 변환**

Run: `NODE_OPTIONS=--use-system-ca npx tsx --env-file=.env.local scripts/transcode-r2-videos.ts --limit 5`
Expected: `완료 5 · 실패 0`

- [ ] **Step 4: 결과 확인**

방금 바뀐 5개(`original_url is not null`)의 `tweet_url`에 대해:

```bash
curl -sI "<tweet_url>" | grep -iE "content-type|content-length|cache-control"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate -of csv=p=0 "<tweet_url>"
```

Expected: `video/mp4`, 긴 변 ≤ 1280, `30/1` 이하, `cache-control: public, max-age=31536000, immutable`. 그리고 사이트에서 해당 모먼트가 재생되는지(소리 포함, 색 이상 없음) 휴대폰으로 확인. **색이 바래 보이면(HDR 원본)** 멈추고 보고한다.

---

### Task 9: 전체 실행·배포 (사용자 작업 포함)

- [ ] **Step 1: (사용자 확인) r2.dev 치환 SQL 실행** — Task 1 Step 2의 건수를 보여 주고 승인받은 뒤 `supabase/sql/2026-10-27-r2-dev-to-cdn.sql` 실행. 마지막 확인 쿼리가 전부 0인지 본다.

- [ ] **Step 2: (사용자) Vercel `VITE_R2_PUBLIC_URL`이 `https://cdn.mmemory.cloud`인지 확인** — 아니면 새 r2.dev 주소가 계속 생긴다.

- [ ] **Step 3: (사용자) Cloudflare 캐시 규칙** — `cdn.mmemory.cloud` 대상 Cache Rule: Eligible for cache, Edge TTL 1개월 이상, Browser TTL 1일 이상.

- [ ] **Step 4: 전체 변환 (로컬, 2~3시간 예상)**

Run: `NODE_OPTIONS=--use-system-ca npx tsx --env-file=.env.local scripts/transcode-r2-videos.ts 2>&1 | tee transcode-run.log`
Expected: 끝에 `실패 0`. 실패가 있으면 로그의 행을 보고 원인 확인 후 같은 명령을 다시 실행(멱등).

- [ ] **Step 5: 완료 기준 확인 (스펙 §4.4)**

```sql
select
  (select count(*) from moments where tweet_url not like 'https://cdn.mmemory.cloud/%.mp4') as not_cdn_mp4,
  (select count(*) from moments where thumbnail_url is null or thumbnail_url = '') as no_thumb,
  (select count(*) from posts, jsonb_array_elements(media) m where m->>'type' = 'video' and m->>'url' not like 'https://cdn.mmemory.cloud/%.mp4') as post_not_cdn_mp4;
```

Expected: 전부 0. 그리고 샘플 10개 URL에 `curl -sI` 두 번 → 두 번째 `cf-cache-status: HIT`.

- [ ] **Step 6: 배포** — deploy-guard 확인 후 develop → main. 배포 뒤 홈 영상, 모먼트 펼치기, 포스트 모달 재생을 휴대폰으로 확인.

- [ ] **Step 7: (사용자) GitHub Actions에서 `Transcode R2 Videos`를 workflow_dispatch로 한 번 돌려** `대기 모먼트 0개`로 끝나는지 확인.
