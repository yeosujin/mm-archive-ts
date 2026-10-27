# 2단계 영상 표지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 영상에 표지 이미지를 정할 수 있게 한다 — 표시 우선순위 헬퍼 `getVideoCover`와, 위버스 공식 썸네일을 PC 브라우저 북마클릿으로 채우는 어드민 도구(`/admin/covers`). 단독 배포 1.22.0.

**Architecture:** 표지 결정은 순수 함수(`src/lib/videoCover.ts`)로 두고 vitest로 검증한다. 위버스 썸네일은 서버가 수집하지 않는다(스펙 §5.1). 사용자가 PC 크롬으로 연 위버스 페이지에서 북마클릿이 썸네일 주소를 읽어 어드민 `/admin/covers?url=&image=`를 새 탭으로 열고, 그 페이지가 `/api/r2`의 새 `import` 액션(호스트 허용 목록)으로 이미지를 R2에 복사한 뒤 `videos.thumbnail_url`을 갱신한다.

**Tech Stack:** React 19 + TS, vitest, Vercel Function(`api/r2.ts`, `@aws-sdk/client-s3`), Supabase(anon, 기존 어드민 쓰기 경로).

**스펙:** `docs/superpowers/specs/2026-10-27-immersive-ui-design.md` §5

---

## 사전 사실 (2026-10-28)

- 영상 332개: YouTube 263(모먼트 있음 242), Weverse 58(전부 모먼트 있음), 기타 11(7). `videos.thumbnail_url`은 전부 비어 있다
- 위버스 라이브 URL 예: `https://weverse.io/illit/live/4-217834450?hl=ko`
- 위버스 라이브 표지: 광고가 끝난 뒤 플레이어 배경 이미지 `https://video-phinf.pstatic.net/…_JPEG/…jpg` (Task 1)
- `extractYouTubeId`가 `src/pages/admin/AdminVideos.tsx:23`에 지역 함수로 있다 → 공용으로 옮긴다
- `vitest.config.ts`는 `scripts/**/*.test.ts`만 포함 → `src/**/*.test.ts` 추가
- 어드민 비밀번호는 `src/lib/r2Upload.ts`의 `ADMIN_PASSWORD_STORAGE_KEY`로 `sessionStorage`에 있다(`AdminAuth.tsx`도 사용)
- React 19는 `href="javascript:…"`를 막는다 → 북마클릿 링크는 ref로 `setAttribute('href', …)`
- 모먼트 정렬 규칙: `position` 오름차순 → `created_at` 오름차순 (영상 안에서 첫 모먼트)

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/videoCover.ts` (생성) | `extractYouTubeId`, `getVideoCover` |
| `src/lib/videoCover.test.ts` (생성) | 위 테스트 |
| `src/lib/weverseCover.ts` (생성) | `weverseLiveKey`(라이브 주소 정규화), `buildCoverBookmarklet(origin)` |
| `src/lib/weverseCover.test.ts` (생성) | 위 테스트 |
| `api/r2.ts` (수정) | `import` 액션: 허용 호스트 이미지를 받아 R2에 저장 |
| `src/lib/r2Upload.ts` (수정) | `importImageToR2(sourceUrl, key)`, 비밀번호 보관 `localStorage` |
| `src/components/AdminAuth.tsx` (수정) | `localStorage` 사용 |
| `src/pages/admin/AdminVideos.tsx` (수정) | `extractYouTubeId`를 공용 모듈에서 import |
| `src/pages/admin/AdminCovers.tsx` (생성) | 표지 없는 위버스 목록 + 북마클릿 + 가져오기 처리 |
| `src/routes/index.tsx`, `src/components/AdminLayout.tsx` (수정) | 라우트·메뉴 |
| `vitest.config.ts` (수정) | `src/**/*.test.ts` 포함 |
| vault, `package.json`, `package-lock.json`, `CLAUDE.md` | 문서·버전 1.22.0 |

---

### Task 1: (관문) 위버스 화면에 썸네일 주소가 있는지 확인 — 2026-10-28 완료

결과: og 메타·video poster(빈 `data:` svg)·`<img>`에는 라이브 표지가 없다(`<img>`의 `phinf.wevpstatic.net` 670×374는 추천 목록). **광고가 끝난 뒤** 플레이어 요소의 CSS 배경 이미지로 `https://video-phinf.pstatic.net/…_JPEG/…jpg`가 뜬다 → 이것을 쓴다. 아래 단계는 기록용.

- [ ] **Step 1: 사용자에게 PC 크롬에서 실행 요청**

위버스 라이브 페이지(예: `https://weverse.io/illit/live/4-217834450`)를 PC 크롬으로 열고, 화면이 다 뜬 뒤 개발자 도구 콘솔(⌥⌘J)에 붙여 넣는다.

```js
(() => {
  const og = document.querySelector('meta[property="og:image"]')?.content;
  const poster = document.querySelector('video[poster]')?.poster;
  const imgs = [...document.images].filter(i => /wevpstatic\.net/.test(i.currentSrc || i.src))
    .map(i => ({ src: i.currentSrc || i.src, w: i.naturalWidth, h: i.naturalHeight }))
    .sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 5);
  const bg = [...document.querySelectorAll('*')].map(e => getComputedStyle(e).backgroundImage)
    .filter(b => /wevpstatic\.net/.test(b)).slice(0, 5);
  console.log(JSON.stringify({ og, poster, imgs, bg }, null, 2));
})();
```

- [ ] **Step 2: 결과 판정**

- `og`, `poster`, `imgs[0]` 중 하나가 라이브 썸네일(`…/thumb.jpg` 류)이면 → 진행. 어느 것이 맞았는지 기록하고, Task 3의 탐색 순서를 그에 맞게 둔다
- `bg`에만 있으면 → Task 3 `buildCoverBookmarklet`에 배경 이미지 탐색을 추가한다(`url("…")` 추출)
- 아무 데도 없으면 → **멈추고 사용자와 방식을 다시 정한다**(스펙 §5.2 마지막 문단)

---

### Task 2: 표지 우선순위 헬퍼 (TDD)

**Files:**
- Create: `src/lib/videoCover.ts`, `src/lib/videoCover.test.ts`
- Modify: `vitest.config.ts`, `src/pages/admin/AdminVideos.tsx:23-37`

- [ ] **Step 1: vitest가 src 테스트도 돌게**

`vitest.config.ts`의 include를 바꾼다.

```ts
    include: ['scripts/**/*.test.ts', 'src/**/*.test.ts'],
```

- [ ] **Step 2: 실패하는 테스트**

`src/lib/videoCover.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { extractYouTubeId, getVideoCover } from './videoCover';

const video = (url: string, thumbnail_url?: string) => ({ id: 'v1', title: 't', date: '2025-01-01', url, thumbnail_url });
const moment = (id: string, thumbnail_url: string | undefined, position: number, created_at: string) =>
  ({ id, title: '', tweet_url: '', date: '2025-01-01', video_id: 'v1', position, thumbnail_url, created_at });

describe('extractYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=abcdefghijk&t=3', 'abcdefghijk'],
    ['https://youtu.be/abcdefghijk?si=x', 'abcdefghijk'],
    ['https://youtube.com/shorts/abcdefghijk', 'abcdefghijk'],
    ['https://www.youtube.com/live/abcdefghijk', 'abcdefghijk'],
    ['https://www.youtube.com/embed/abcdefghijk', 'abcdefghijk'],
  ])('%s', (url, id) => expect(extractYouTubeId(url)).toBe(id));
  it('유튜브가 아니면 null', () => expect(extractYouTubeId('https://weverse.io/illit/live/4-1')).toBeNull());
});

describe('getVideoCover', () => {
  const ms = [
    moment('b', 'https://cdn/b.jpg', 1, '2025-01-01T00:00:00Z'),
    moment('a', 'https://cdn/a.jpg', 0, '2025-01-02T00:00:00Z'),
    moment('c', undefined, 0, '2025-01-01T00:00:00Z'),
  ];
  it('thumbnail_url이 최우선', () => {
    expect(getVideoCover(video('https://youtu.be/abcdefghijk', 'https://cdn/cover.jpg'), ms)).toBe('https://cdn/cover.jpg');
  });
  it('유튜브는 계산한 썸네일', () => {
    expect(getVideoCover(video('https://youtu.be/abcdefghijk'), ms)).toBe('https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
  });
  it('그 외에는 position·created_at 순 첫 모먼트 중 썸네일 있는 것', () => {
    expect(getVideoCover(video('https://weverse.io/illit/live/4-1'), ms)).toBe('https://cdn/a.jpg');
  });
  it('아무것도 없으면 null', () => {
    expect(getVideoCover(video('https://weverse.io/illit/live/4-1'), [])).toBeNull();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run src/lib/videoCover.test.ts`
Expected: FAIL — `./videoCover`를 찾을 수 없음

- [ ] **Step 4: 구현**

`src/lib/videoCover.ts`:

```ts
import type { Moment, Video } from './database/types';

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

type CoverMoment = Pick<Moment, 'thumbnail_url' | 'position'> & { created_at?: string };

/**
 * 영상 표지 이미지. 우선순위: 직접 지정(thumbnail_url) → 유튜브 썸네일 → 첫 모먼트 썸네일 → null
 * moments는 이 영상의 모먼트만 넘긴다.
 */
export function getVideoCover(video: Pick<Video, 'url' | 'thumbnail_url'>, moments: CoverMoment[]): string | null {
  if (video.thumbnail_url) return video.thumbnail_url;
  const youtubeId = extractYouTubeId(video.url);
  if (youtubeId) return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  const first = [...moments]
    .filter(m => m.thumbnail_url)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || (a.created_at ?? '').localeCompare(b.created_at ?? ''))[0];
  return first?.thumbnail_url ?? null;
}
```

- [ ] **Step 5: AdminVideos가 공용 함수를 쓰게**

`src/pages/admin/AdminVideos.tsx`에서 지역 `function extractYouTubeId(…) { … }`(23~37줄)를 지우고, import 목록에 추가한다.

```ts
import { extractYouTubeId } from '../../lib/videoCover';
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run src/lib/videoCover.test.ts && npm test && npm run build`
Expected: 전부 PASS, 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add vitest.config.ts src/lib/videoCover.ts src/lib/videoCover.test.ts src/pages/admin/AdminVideos.tsx
git commit -m "feat(videos): 표지 우선순위 헬퍼 getVideoCover"
```

---

### Task 3: 위버스 주소 정규화 + 북마클릿 (TDD)

**Files:**
- Create: `src/lib/weverseCover.ts`, `src/lib/weverseCover.test.ts`

- [ ] **Step 1: 실패하는 테스트**

`src/lib/weverseCover.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { weverseLiveKey, buildCoverBookmarklet } from './weverseCover';

describe('weverseLiveKey', () => {
  it('쿼리·해시·끝 슬래시와 상관없이 같은 키', () => {
    const k = weverseLiveKey('https://weverse.io/illit/live/4-217834450?hl=ko');
    expect(k).toBe('illit/live/4-217834450');
    expect(weverseLiveKey('https://weverse.io/illit/live/4-217834450/')).toBe(k);
    expect(weverseLiveKey('https://m.weverse.io/illit/live/4-217834450#x')).toBe(k);
  });
  it('위버스 라이브가 아니면 null', () => {
    expect(weverseLiveKey('https://youtu.be/abcdefghijk')).toBeNull();
    expect(weverseLiveKey('https://weverse.io/illit/feed')).toBeNull();
    expect(weverseLiveKey('not a url')).toBeNull();
  });
});

describe('buildCoverBookmarklet', () => {
  it('javascript: 링크이고 어드민 주소로 연다', () => {
    const b = buildCoverBookmarklet('https://mmemory.cloud');
    expect(b.startsWith('javascript:')).toBe(true);
    expect(decodeURIComponent(b)).toContain('"https://mmemory.cloud"+\'/admin/covers?url=\'');
    expect(decodeURIComponent(b)).toContain('og:image');
    expect(decodeURIComponent(b)).toContain('video-phinf');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/weverseCover.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/lib/weverseCover.ts` (탐색 순서는 Task 1 결과: 플레이어 배경 `video-phinf.pstatic.net` → og:image → `data:`가 아닌 poster. 추천 목록 `<img>`는 보지 않는다):

```ts
/** 위버스 라이브 주소 → 비교용 키 `{아티스트}/live/{id}`. 라이브가 아니면 null */
export function weverseLiveKey(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)weverse\.io$/.test(u.hostname)) return null;
    const m = u.pathname.match(/^\/([^/]+)\/live\/([^/]+)\/?$/);
    return m ? `${m[1]}/live/${m[2]}` : null;
  } catch {
    return null;
  }
}

/**
 * 위버스 라이브 페이지에서 누르는 북마클릿.
 * 사용자가 보고 있는 화면에서 썸네일 주소를 읽어 어드민 표지 화면을 새 탭으로 연다. 서버는 위버스에 요청하지 않는다.
 */
export function buildCoverBookmarklet(adminOrigin: string): string {
  const code = `(()=>{
    const bg=[...document.querySelectorAll('*')].map(e=>getComputedStyle(e).backgroundImage)
      .map(b=>(b.match(/url\\("?(https:\\/\\/video-phinf\\.pstatic\\.net\\/[^")]+)"?\\)/)||[])[1]).find(Boolean);
    const og=document.querySelector('meta[property="og:image"]')?.content;
    const poster=[...document.querySelectorAll('video[poster]')].map(v=>v.poster).find(p=>p&&!p.startsWith('data:'));
    const src=bg||og||poster;
    if(!src){alert('썸네일을 찾지 못했어요. 광고가 끝나고 영상 화면이 뜬 뒤 다시 눌러 주세요');return;}
    window.open(${JSON.stringify(adminOrigin)}+'/admin/covers?url='+encodeURIComponent(location.href)+'&image='+encodeURIComponent(src),'_blank');
  })()`;
  return 'javascript:' + encodeURIComponent(code.replace(/\n\s*/g, ''));
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run src/lib/weverseCover.test.ts`
Expected: PASS

- [ ] **Step 5: 북마클릿 문법 확인**

Run: `npx tsx -e "import {buildCoverBookmarklet} from './src/lib/weverseCover.ts'; new Function(decodeURIComponent(buildCoverBookmarklet('https://mmemory.cloud').slice(11))); console.log('syntax ok')"`
Expected: `syntax ok`

- [ ] **Step 6: 커밋**

```bash
git add src/lib/weverseCover.ts src/lib/weverseCover.test.ts
git commit -m "feat(covers): 위버스 라이브 주소 정규화와 표지 북마클릿"
```

---

### Task 4: `/api/r2` 이미지 가져오기 액션

**Files:**
- Modify: `api/r2.ts`, `src/lib/r2Upload.ts`

- [ ] **Step 1: 서버 액션 추가**

`api/r2.ts`:
- 상단 주석 목록에 `- { action: 'import', key, sourceUrl } → 허용 호스트 이미지를 받아 R2에 저장` 추가
- 구조분해에 `sourceUrl` 추가: `const { action, key, contentType, sourceUrl } = …`
- 파일 상단(함수 밖)에 추가:

```ts
// 서버가 대신 받아 올 수 있는 이미지 호스트. 임의 주소를 받으면 SSRF가 된다
const IMPORT_HOSTS = /(^|\.)(wevpstatic|pstatic)\.net$/;
const IMPORT_MAX_BYTES = 10 * 1024 * 1024;
```

- `if (action === 'delete')` 블록 앞에 추가:

```ts
    if (action === 'import') {
      let src: URL;
      try {
        src = new URL(String(sourceUrl));
      } catch {
        return res.status(400).json({ error: 'Invalid sourceUrl' });
      }
      if (src.protocol !== 'https:' || !IMPORT_HOSTS.test(src.hostname)) {
        return res.status(400).json({ error: 'Host not allowed' });
      }
      const img = await fetch(src);
      const type = img.headers.get('content-type') ?? '';
      if (!img.ok || !type.startsWith('image/')) return res.status(502).json({ error: `Fetch failed (${img.status})` });
      const body = Buffer.from(await img.arrayBuffer());
      if (body.length > IMPORT_MAX_BYTES) return res.status(413).json({ error: 'Too large' });
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: type,
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      return res.status(200).json({ ok: true });
    }
```

- [ ] **Step 2: 클라이언트 헬퍼**

`src/lib/r2Upload.ts`의 `verifyAdminPassword` 아래에 추가:

```ts
/** 허용된 외부 이미지(위버스 썸네일)를 서버가 받아 R2에 저장. 공개 URL 반환 */
export async function importImageToR2(sourceUrl: string, key: string): Promise<string> {
  await callR2Api({ action: 'import', key, sourceUrl });
  return `${import.meta.env.VITE_R2_PUBLIC_URL}/${key}`;
}
```

- [ ] **Step 3: 로컬에서 핸들러 직접 검증**

1.21.2 때와 같은 방식(핸들러를 tsx로 직접 호출). 서버 환경변수는 `.env.local` 값으로 임시 export한다:

```bash
set -a; source .env.local; set +a
export R2_ACCOUNT_ID=$VITE_R2_ACCOUNT_ID R2_ACCESS_KEY_ID=$VITE_R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY=$VITE_R2_SECRET_ACCESS_KEY R2_BUCKET_NAME=$VITE_R2_BUCKET_NAME ADMIN_PASSWORD=$VITE_ADMIN_PASSWORD
```

(로컬 `.env.local`에 `VITE_ADMIN_PASSWORD`가 없으면 아무 값이나 `ADMIN_PASSWORD`로 export하고 그 값으로 호출)

스크래치 디렉터리에 `.mts`를 만들어 `api/r2.ts`의 default export를 가짜 req/res로 호출해 확인:
- `sourceUrl: 'https://example.com/a.jpg'` → 400 `Host not allowed`
- `sourceUrl: 'http://video-phinf.pstatic.net/x.jpg'` → 400 (https만)
- 실제 썸네일 `https://video-phinf.pstatic.net/20260107_17/1767788774828VFpLE_JPEG/3mGwyL5WmU_03.jpg`, `key: 'covers/_test-<시각>.jpg'` → 200, 이어서 `${VITE_R2_PUBLIC_URL}/covers/_test-….jpg` GET 200 `image/*`, 그다음 `action: 'delete'`로 정리 → 다시 GET 404

필요하면 `NODE_OPTIONS=--use-system-ca`.

- [ ] **Step 4: 빌드·린트 후 커밋**

Run: `npm run build && npx eslint api/r2.ts src/lib/r2Upload.ts`

```bash
git add api/r2.ts src/lib/r2Upload.ts
git commit -m "feat(r2): 위버스 썸네일을 서버가 받아 R2에 저장하는 import 액션"
```

---

### Task 5: 어드민 로그인 유지 (`localStorage`)

북마클릿이 여는 새 탭마다 다시 로그인하지 않도록. `sessionStorage`는 탭마다 따로라 새 탭에서 비어 있다.

**Files:**
- Modify: `src/lib/r2Upload.ts`, `src/components/AdminAuth.tsx`

- [ ] **Step 1: 저장소 교체**

두 파일에서 `sessionStorage`를 `localStorage`로 바꾼다(`ADMIN_PASSWORD_STORAGE_KEY`를 쓰는 곳만 — `getItem`/`setItem`/`removeItem`). `r2Upload.ts`의 상단 주석 끝에 한 줄 추가:

```ts
// 비밀번호는 localStorage에 둔다 — 북마클릿이 여는 새 탭에서도 로그인이 유지되도록. 로그아웃 시 지운다
```

`AdminAuth.tsx`의 `typeof window` 가드 아래 주석은 그대로 둔다.

- [ ] **Step 2: 확인**

Run: `grep -n "sessionStorage" src/lib/r2Upload.ts src/components/AdminAuth.tsx; npm run build`
Expected: grep 결과 없음, 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add src/lib/r2Upload.ts src/components/AdminAuth.tsx
git commit -m "feat(admin): 로그인을 탭 사이에 유지 (localStorage)"
```

---

### Task 6: 어드민 표지 화면 `/admin/covers`

**Files:**
- Create: `src/pages/admin/AdminCovers.tsx`
- Modify: `src/routes/index.tsx` (asks 라우트 뒤), `src/components/AdminLayout.tsx` (질문 메뉴 뒤)

- [ ] **Step 1: 페이지 작성**

`src/pages/admin/AdminCovers.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getVideos, updateVideo } from '../../lib/database/videos';
import { getMoments } from '../../lib/database/moments';
import type { Moment, Video } from '../../lib/database/types';
import { getVideoCover } from '../../lib/videoCover';
import { weverseLiveKey, buildCoverBookmarklet } from '../../lib/weverseCover';
import { importImageToR2 } from '../../lib/r2Upload';

type ImportState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; video: Video; cover: string }
  | { kind: 'error'; message: string };

/**
 * 위버스 영상 표지 채우기.
 * - 목록: thumbnail_url이 없는 위버스 영상 (그동안은 첫 모먼트 썸네일이 대신 표지가 된다)
 * - ?url=&image= 로 열리면(북마클릿) 그 영상의 표지로 저장
 */
export default function AdminCovers() {
  const [params, setParams] = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ImportState>({ kind: 'idle' });
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);
  const handled = useRef(false);

  useEffect(() => {
    Promise.all([getVideos(), getMoments()])
      .then(([v, m]) => { setVideos(v); setMoments(m); })
      .finally(() => setLoading(false));
  }, []);

  // React 19는 javascript: href를 막는다 → DOM에 직접 넣는다
  useEffect(() => {
    bookmarkletRef.current?.setAttribute('href', buildCoverBookmarklet(window.location.origin));
  }, [loading]);

  const pending = useMemo(
    () => videos.filter(v => weverseLiveKey(v.url) && !v.thumbnail_url),
    [videos]
  );

  useEffect(() => {
    const url = params.get('url');
    const image = params.get('image');
    if (loading || !url || !image || handled.current) return;
    handled.current = true;

    const key = weverseLiveKey(url);
    const video = key ? videos.find(v => weverseLiveKey(v.url) === key) : undefined;
    if (!video) {
      setState({ kind: 'error', message: `등록된 위버스 영상에서 이 라이브를 찾지 못했어요: ${url}` });
      return;
    }
    setState({ kind: 'saving' });
    (async () => {
      try {
        const cover = await importImageToR2(image, `covers/${video.id}-${Date.now()}.jpg`);
        await updateVideo(video.id, { thumbnail_url: cover });
        setVideos(prev => prev.map(v => (v.id === video.id ? { ...v, thumbnail_url: cover } : v)));
        setState({ kind: 'saved', video, cover });
        setParams({}, { replace: true });
      } catch (err) {
        setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      }
    })();
  }, [loading, params, videos, setParams]);

  const momentsOf = (videoId: string) => moments.filter(m => m.video_id === videoId);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>위버스 표지</h1>

      {state.kind === 'saving' && <p>표지 저장 중...</p>}
      {state.kind === 'error' && <p className="login-error">{state.message}</p>}
      {state.kind === 'saved' && (
        <div className="admin-section">
          <p>✅ 저장됨 — {state.video.title}</p>
          <img src={state.cover} alt="" style={{ width: 240, borderRadius: 8 }} />
          {pending[0] && (
            <p>
              <a href={pending[0].url} target="_blank" rel="noreferrer">다음: {pending[0].title} 열기 →</a>
            </p>
          )}
        </div>
      )}

      <div className="admin-section">
        <h2>사용법 (PC 크롬)</h2>
        <ol>
          <li>
            이 버튼을 북마크바로 끌어다 놓아요:{' '}
            <a ref={bookmarkletRef} className="admin-header-link" onClick={e => e.preventDefault()}>위버스 표지 가져오기</a>
          </li>
          <li>아래 목록에서 라이브를 열고, <b>광고가 끝나 영상 화면이 뜨면</b> 북마크바의 버튼을 눌러요</li>
          <li>새 탭에 "저장됨"이 뜨면 끝이에요</li>
        </ol>
      </div>

      <div className="admin-section">
        <h2>표지 없는 위버스 영상 ({pending.length}개)</h2>
        {pending.length === 0 ? (
          <p className="empty-text">모두 채웠어요</p>
        ) : (
          <div className="admin-list">
            {pending.map(v => {
              const fallback = getVideoCover(v, momentsOf(v.id));
              return (
                <div key={v.id} className="admin-list-item">
                  {fallback && <img src={fallback} alt="" style={{ width: 96, borderRadius: 6 }} />}
                  <div className="admin-list-info">
                    <a href={v.url} target="_blank" rel="noreferrer">{v.title}</a>
                    <span> · {v.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

(`src/lib/database.ts` 배럴 주석이 새 코드는 도메인 모듈에서 직접 import하라고 한다)

- [ ] **Step 2: 라우트·메뉴**

`src/routes/index.tsx`: 다른 어드민 lazy import 옆에

```tsx
const AdminCovers = lazy(() => import('../pages/admin/AdminCovers'));
```

`path: 'asks'` 항목 다음에

```tsx
          {
            path: 'covers',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminCovers />
              </Suspense>
            ),
          },
```

`src/components/AdminLayout.tsx`: 질문(`/admin/asks`) NavLink 다음에

```tsx
            <NavLink
              to="/admin/covers"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminCovers')}
            >
              <PhotoIcon size={16} /> 위버스 표지
            </NavLink>
```

- [ ] **Step 3: 빌드·린트·테스트**

Run: `npm run build && npx eslint src/pages/admin/AdminCovers.tsx src/routes/index.tsx src/components/AdminLayout.tsx && npm test`
Expected: 성공, 에러 없음

- [ ] **Step 4: 화면 확인 (`vercel dev` 불필요 — 목록만)**

`npm run dev` 후 `/admin/covers`에서 목록 58개 근처 숫자와 대체 표지 미리보기가 보이는지. (로그인·가져오기는 `/api/r2`가 필요해 로컬 vite에서는 안 된다 → Task 8에서 운영 확인)

- [ ] **Step 5: 커밋**

```bash
git add src/pages/admin/AdminCovers.tsx src/routes/index.tsx src/components/AdminLayout.tsx
git commit -m "feat(admin): 위버스 표지 채우기 화면과 북마클릿"
```

---

### Task 7: 문서·버전 1.22.0

**Files:**
- Modify: `knowledge-vault/wiki/domains/videos-moments.md`, `knowledge-vault/wiki/log.md`, `package.json`, `package-lock.json`(3·9번째 줄), `CLAUDE.md`(git에서는 `claude.md`)

- [ ] **Step 1: videos-moments.md에 섹션 추가** (`## 관련` 바로 위)

```markdown
## 표지 이미지 (1.22.0~)

`getVideoCover(video, moments)` (`src/lib/videoCover.ts`): `thumbnail_url` → 유튜브 `i.ytimg.com/vi/{id}/hqdefault.jpg` → 첫 모먼트 썸네일 → null.

위버스 공식 썸네일은 서버가 수집하지 않는다(일반 요청에는 og:image가 없고, 봇 흉내는 하지 않기로 함). 어드민 `/admin/covers`의 북마클릿을 PC 크롬에서 위버스 라이브 화면 위에 누르면, 화면의 썸네일 주소를 읽어 `/api/r2`의 `import`(허용 호스트 `pstatic.net`·`wevpstatic.net`)로 R2 `covers/`에 복사하고 `thumbnail_url`을 채운다.
```

- [ ] **Step 2: log.md 최상단 항목**

```markdown
## 2026-10-28 — 영상 표지 (1.22.0)

`getVideoCover`로 표지 우선순위를 정했다(직접 지정 → 유튜브 → 첫 모먼트). 위버스 공식 썸네일은 어드민 `/admin/covers` 북마클릿으로 채운다.
`/api/r2`에 허용 호스트 전용 `import` 액션 추가, 어드민 로그인은 `localStorage`로 유지 → [[videos-moments]] · [[r2-media-pipeline]]

---
```

- [ ] **Step 3: 버전 1.21.3 → 1.22.0** (`package.json`, `package-lock.json` 두 곳, `claude.md`의 `(현재 1.21.3)`)

- [ ] **Step 4: 전체 검증 후 커밋**

Run: `npm run build && npm run lint && npm test`

```bash
git add knowledge-vault package.json package-lock.json claude.md
git commit -m "docs: 영상 표지 문서화, 버전 1.22.0"
```

---

### Task 8: 배포와 운영 확인 (사용자 작업 포함)

- [ ] **Step 1:** deploy-guard 확인 후 develop → main 배포
- [ ] **Step 2: (사용자, PC 크롬)** `mmemory.cloud/admin/covers` 로그인 → 북마클릿을 북마크바로 끌어다 놓기 → 목록 첫 라이브 열기 → 버튼 누르기 → 새 탭에 "저장됨"과 썸네일이 보이는지
- [ ] **Step 3:** 저장된 영상의 `thumbnail_url`이 `cdn.mmemory.cloud/covers/…jpg`이고 열리는지 확인
- [ ] **Step 4: (사용자)** 나머지 위버스 영상은 원할 때 같은 방법으로 채운다. 안 채운 것은 첫 모먼트 썸네일이 표지가 된다
