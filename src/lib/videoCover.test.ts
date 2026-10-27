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
