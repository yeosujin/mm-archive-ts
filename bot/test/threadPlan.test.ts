// 순수 로직(buildThreads) 검증 — 네트워크/토큰 불필요.
// 실행: npm run test:plan
import assert from 'node:assert/strict';
import { buildThreads } from '../src/threadPlan.js';
import type { OnThisDayContent } from '../src/threadPlan.js';

const R2 = 'https://cdn.mmemory.cloud';
const opts = { r2PublicUrl: R2, yymmdd: '260714' };

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
}

// 헬퍼
const vid = (id: string, platform: string, date = '2024-07-14') => ({
  id,
  title: id,
  url: 'https://youtu.be/x',
  date,
  platform_name: platform,
});
const mom = (id: string, videoId: string, url: string, pos = 0) => ({
  id,
  title: id,
  tweet_url: url,
  date: '2024-07-14',
  video_id: videoId,
  position: pos,
});
const photo = (id: string, tags: string[], url: string) => ({
  id,
  title: id,
  date: '2024-07-14',
  tags,
  image_url: url,
});

console.log('threadPlan.buildThreads');

test('빈 콘텐츠 → 스레드 0개', () => {
  const c: OnThisDayContent = { momentGroups: [], photos: [], posts: [] };
  assert.equal(buildThreads(c, opts).length, 0);
});

test('영상 출처 2개 → 모먼트 스레드 2개로 분리', () => {
  const c: OnThisDayContent = {
    momentGroups: [
      { video: vid('v1', '위버스'), moments: [mom('m1', 'v1', `${R2}/a.mp4`)] },
      { video: vid('v2', '유튜브'), moments: [mom('m2', 'v2', `${R2}/b.mp4`)] },
    ],
    photos: [],
    posts: [],
  };
  const threads = buildThreads(c, opts);
  assert.equal(threads.length, 2);
  assert.equal(threads[0]!.tweets[0]!.text, '260714 위버스');
  assert.equal(threads[1]!.tweets[0]!.text, '260714 유튜브');
});

test('외부 링크 모먼트는 스킵, R2 영상만', () => {
  const c: OnThisDayContent = {
    momentGroups: [
      {
        video: vid('v1', '위버스'),
        moments: [
          mom('m1', 'v1', 'https://youtu.be/abc'), // 외부 → 스킵
          mom('m2', 'v1', `${R2}/a.mp4`), // R2 → 포함
        ],
      },
    ],
    photos: [],
    posts: [],
  };
  const threads = buildThreads(c, opts);
  assert.equal(threads.length, 1);
  assert.equal(threads[0]!.tweets[0]!.media.length, 1);
  assert.equal(threads[0]!.tweets[0]!.media[0]!.kind, 'video');
});

test('모먼트가 전부 외부 링크면 그 출처 스레드 없음', () => {
  const c: OnThisDayContent = {
    momentGroups: [
      { video: vid('v1', '위버스'), moments: [mom('m1', 'v1', 'https://x.com/i/status/1')] },
    ],
    photos: [],
    posts: [],
  };
  assert.equal(buildThreads(c, opts).length, 0);
});

test('사진 11장 → 4+4+3 (한 스레드, 트윗 3개)', () => {
  const photos = Array.from({ length: 11 }, (_, i) => photo(`p${i}`, ['셀카'], `${R2}/p${i}.jpg`));
  const c: OnThisDayContent = { momentGroups: [], photos, posts: [] };
  const threads = buildThreads(c, opts);
  assert.equal(threads.length, 1);
  assert.deepEqual(
    threads[0]!.tweets.map((t) => t.media.length),
    [4, 4, 3],
  );
});

test('사진 caption = 날짜 + 태그 합집합(#)', () => {
  const c: OnThisDayContent = {
    momentGroups: [],
    photos: [photo('p1', ['셀카', '무대'], `${R2}/p1.jpg`), photo('p2', ['무대'], `${R2}/p2.jpg`)],
    posts: [],
  };
  const threads = buildThreads(c, opts);
  assert.equal(threads[0]!.tweets[0]!.text, '260714 #셀카 #무대');
});

test('포스트는 포스트마다 독립 스레드, caption = 날짜+제목', () => {
  const c: OnThisDayContent = {
    momentGroups: [],
    photos: [],
    posts: [
      {
        id: 'po1',
        title: '생일 축하',
        url: 'x',
        platform: 'twitter',
        date: '2024-07-14',
        media: [
          { type: 'image', url: `${R2}/1.jpg` },
          { type: 'video', url: `${R2}/2.mp4` },
        ],
      },
      {
        id: 'po2',
        title: '컴백',
        url: 'x',
        platform: 'weverse',
        date: '2024-07-14',
        media: [{ type: 'image', url: `${R2}/3.jpg` }],
      },
    ],
  };
  const threads = buildThreads(c, opts);
  assert.equal(threads.length, 2);
  assert.equal(threads[0]!.label, 'post:생일 축하');
  assert.equal(threads[0]!.tweets[0]!.text, '260714 생일 축하');
  assert.equal(threads[0]!.tweets[0]!.media.length, 2); // 이미지+영상 혼합 (fallback 은 게시 단계에서)
  assert.equal(threads[1]!.tweets[0]!.text, '260714 컴백');
});

test('순서: 모먼트 → 사진 → 포스트', () => {
  const c: OnThisDayContent = {
    momentGroups: [{ video: vid('v1', '위버스'), moments: [mom('m1', 'v1', `${R2}/a.mp4`)] }],
    photos: [photo('p1', ['x'], `${R2}/p1.jpg`)],
    posts: [
      { id: 'po1', title: 'T', url: 'x', platform: 'twitter', date: '2024-07-14', media: [{ type: 'image', url: `${R2}/1.jpg` }] },
    ],
  };
  const labels = buildThreads(c, opts).map((t) => t.label);
  assert.deepEqual(labels, ['moment:위버스', 'photos', 'post:T']);
});

console.log(`\n✅ ${passed} passed`);
