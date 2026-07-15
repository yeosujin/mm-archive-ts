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
  it('상위 영상 있는 R2 모먼트 (한글 플랫폼)', () => {
    const videos = new Map<string, Video>([
      ['v1', { id: 'v1', title: '위버스 라이브', url: 'https://weverse.io/x', date: '2022-07-14' }],
    ]);
    const moments: Moment[] = [
      { id: 'm1', title: '순간', tweet_url: `${R2}/m.mp4`, date: '2022-07-14', video_id: 'v1' },
    ];
    const items = normalizeMoments(moments, videos, R2, '2026-07-14');
    expect(items[0]).toMatchObject({
      contentType: 'moment', mediaType: 'video', url: `${R2}/m.mp4`,
      groupKey: 'moment|위버스 라이브|2022-07-14', text: '220714 위버스',
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
      date: '2024-07-15', groupKey: 'moment|럭키 피크닉|2024-07-15', text: '240715 유튜브',
    });
  });
  it('상위 영상 없으면 자기 날짜만 텍스트 + 자기 title로 그룹', () => {
    const moments: Moment[] = [
      { id: 'm2', title: '독립순간', tweet_url: `${R2}/m2.mp4`, date: '2021-07-14' },
    ];
    const items = normalizeMoments(moments, new Map(), R2, '2026-07-14');
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
