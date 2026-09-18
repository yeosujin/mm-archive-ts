import { describe, it, expect } from 'vitest';
import { isR2Url, normalizePhotos, normalizeMoments, normalizePosts, normalizeEpisodes } from './normalize';
import type { Photo, Moment, Post, Video, Episode } from '../../src/lib/database';

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
      date: '2022-07-14', groupKey: 'photo|생일|2022-07-14', text: '220714',
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
    const items = normalizeMoments(moments, videos, R2, '2026-07-14');
    expect(items[0]).toMatchObject({
      contentType: 'moment', mediaType: 'video', url: `${R2}/m.mp4`,
      groupKey: 'moment|v1|2022-07-14', text: '220714',
    });
  });
  it('상위 영상 날짜로 선정 (모먼트 자체 날짜는 달라도 포함)', () => {
    const videos = new Map<string, Video>([
      ['v9', { id: 'v9', title: '럭키 피크닉', url: 'https://youtu.be/x', date: '2024-07-15' }],
    ]);
    const moments: Moment[] = [
      // 모먼트 자체 date는 07-15가 아니지만 상위 영상이 2024-07-15라 포함돼야 함
      { id: 'mm', title: '클립', tweet_url: `${R2}/c.mp4`, date: '2026-01-01', video_id: 'v9' },
    ];
    const items = normalizeMoments(moments, videos, R2, '2026-07-15');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      date: '2024-07-15', groupKey: 'moment|v9|2024-07-15', text: '240715',
    });
  });
  it('제목이 같아도 영상이 다르면 다른 그룹 (다른 트윗으로 나간다)', () => {
    const videos = new Map<string, Video>([
      ['v1', { id: 'v1', title: '같은제목', url: 'https://youtu.be/a', date: '2022-07-14' }],
      ['v2', { id: 'v2', title: '같은제목', url: 'https://youtu.be/b', date: '2022-07-14' }],
    ]);
    const moments: Moment[] = [
      { id: 'm1', title: 'A', tweet_url: `${R2}/a.mp4`, date: '2022-07-14', video_id: 'v1' },
      { id: 'm2', title: 'B', tweet_url: `${R2}/b.mp4`, date: '2022-07-14', video_id: 'v2' },
    ];
    const items = normalizeMoments(moments, videos, R2, '2026-07-14');
    expect(items).toHaveLength(2);
    // 제목으로 묶으면 둘이 합쳐져 한 스레드가 된다 — id로 묶어야 분리된다
    expect(items[0].groupKey).not.toBe(items[1].groupKey);
  });
  it('독립 모먼트는 제목이 같아도 서로 섞이지 않는다', () => {
    const moments: Moment[] = [
      { id: 'm1', title: '귀여워', tweet_url: `${R2}/a.mp4`, date: '2021-07-14' },
      { id: 'm2', title: '귀여워', tweet_url: `${R2}/b.mp4`, date: '2021-07-14' },
    ];
    const items = normalizeMoments(moments, new Map(), R2, '2026-07-14');
    expect(items[0].groupKey).not.toBe(items[1].groupKey);
  });
  it('상위 영상 없으면 자기 날짜 기준 (groupKey는 자기 id)', () => {
    const moments: Moment[] = [
      { id: 'm2', title: '독립순간', tweet_url: `${R2}/m2.mp4`, date: '2021-07-14' },
    ];
    const items = normalizeMoments(moments, new Map(), R2, '2026-07-14');
    expect(items[0]).toMatchObject({ text: '210714', groupKey: 'moment|solo:m2|2021-07-14' });
  });
  it('클립은 id 순이 아니라 position 순으로 정렬된다', () => {
    const videos = new Map<string, Video>([
      ['v1', { id: 'v1', title: '라이브', url: 'https://youtu.be/x', date: '2022-07-14' }],
    ]);
    // id 순(zeta, alpha)과 position 순(1, 0)이 어긋나게 구성
    const moments: Moment[] = [
      { id: 'zeta', title: '두번째', tweet_url: `${R2}/b.mp4`, date: '2022-07-14', video_id: 'v1', position: 1 },
      { id: 'alpha', title: '첫번째', tweet_url: `${R2}/a.mp4`, date: '2022-07-14', video_id: 'v1', position: 0 },
    ];
    const items = normalizeMoments(moments, videos, R2, '2026-07-14');
    // position 0(a.mp4)이 먼저, position 1(b.mp4)이 뒤여야 함
    expect(items.map(i => i.url)).toEqual([`${R2}/a.mp4`, `${R2}/b.mp4`]);
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
    expect(items[0]).toMatchObject({ mediaType: 'image', text: '251010', groupKey: 'post|po1|2025-10-10' });
    expect(items[1]).toMatchObject({ mediaType: 'video', text: '251010' });
  });
});

describe('normalizeEpisodes', () => {
  it('tweet_images가 있는 에피소드만, 순서 그대로 펼침', () => {
    const episodes: Episode[] = [
      { id: 'e1', date: '2024-07-14', episode_type: 'dm',
        tweet_images: [`${R2}/1.jpg`, `${R2}/2.jpg`] },
      { id: 'e2', date: '2024-07-14', episode_type: 'dm' },
      { id: 'e3', date: '2024-07-14', episode_type: 'comment', tweet_images: [] },
    ];
    const items = normalizeEpisodes(episodes, R2);
    expect(items.map(i => i.url)).toEqual([`${R2}/1.jpg`, `${R2}/2.jpg`]);
    expect(items[0]).toMatchObject({
      contentType: 'episode', mediaType: 'image',
      date: '2024-07-14', groupKey: 'episode|e1|2024-07-14', text: '240714',
    });
  });
  it('외부 URL은 제외', () => {
    const episodes: Episode[] = [
      { id: 'e1', date: '2024-07-14', episode_type: 'dm',
        tweet_images: ['https://weverse.io/a.jpg', `${R2}/ok.jpg`] },
    ];
    expect(normalizeEpisodes(episodes, R2).map(i => i.url)).toEqual([`${R2}/ok.jpg`]);
  });
  it('에피소드가 다르면 다른 그룹 (다른 트윗)', () => {
    const episodes: Episode[] = [
      { id: 'e1', date: '2024-07-14', episode_type: 'dm', tweet_images: [`${R2}/a.jpg`] },
      { id: 'e2', date: '2024-07-14', episode_type: 'dm', tweet_images: [`${R2}/b.jpg`] },
    ];
    const items = normalizeEpisodes(episodes, R2);
    expect(items[0].groupKey).not.toBe(items[1].groupKey);
  });
  it('본문 messages의 image는 트윗에 쓰지 않는다', () => {
    const episodes: Episode[] = [
      { id: 'e1', date: '2024-07-14', episode_type: 'dm',
        messages: [{ type: 'image', content: `${R2}/in-body.jpg`, time: '12:00' }] },
    ];
    expect(normalizeEpisodes(episodes, R2)).toHaveLength(0);
  });
});

describe('normalizePosts - 제목 충돌', () => {
  it('제목이 같아도 포스트가 다르면 다른 그룹', () => {
    const posts: Post[] = [
      { id: 'po1', title: '생일', platform: 'twitter', date: '2025-10-10',
        media: [{ type: 'image', url: `${R2}/1.jpg` }] },
      { id: 'po2', title: '생일', platform: 'weverse', date: '2025-10-10',
        media: [{ type: 'image', url: `${R2}/2.jpg` }] },
    ];
    const items = normalizePosts(posts, R2);
    expect(items).toHaveLength(2);
    expect(items[0].groupKey).not.toBe(items[1].groupKey);
  });
});
