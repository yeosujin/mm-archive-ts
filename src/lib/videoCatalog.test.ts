import { describe, it, expect } from 'vitest';
import { classifyVideo, videoYears, filterVideos, groupByMonth, momentsByVideo, pickHero, latestVideos } from './videoCatalog';
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
  it('연도 전체', () => expect(filterVideos(all, { year: 'all', category: 'all', member: 'all' })).toHaveLength(4));
  it('분류', () => expect(filterVideos(all, { year: 2025, category: 'external', member: 'all' }).map(x => x.id)).toEqual(['ig']));
  it('멤버는 라이브에서만', () => {
    expect(filterVideos(all, { year: 2025, category: 'live', member: '💙' }).map(x => x.id)).toEqual(['live']);
    expect(filterVideos(all, { year: 2025, category: 'live', member: '🤍' })).toEqual([]);
  });
});

describe('groupByMonth', () => {
  it('연·월 내림차순, 달 안은 날짜 내림차순', () => {
    const a = v('a', 'x', '2025-10-03'), b = v('b', 'x', '2025-10-20'), c = v('c', 'x', '2025-09-10'), d = v('d', 'x', '2024-10-01');
    expect(groupByMonth([a, d, c, b])).toEqual([
      { year: 2025, month: 10, videos: [b, a] },
      { year: 2025, month: 9, videos: [c] },
      { year: 2024, month: 10, videos: [d] },
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

describe('latestVideos', () => {
  it('created_at 내림차순 n개, 원본 불변', () => {
    const list = Array.from({ length: 12 }, (_, i) => v(`v${i}`, 'https://youtu.be/x', '2024-01-01', { created_at: `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` }));
    const before = list.map(x => x.id);
    expect(latestVideos(list).map(x => x.id)).toEqual(['v11', 'v10', 'v9', 'v8', 'v7', 'v6', 'v5', 'v4', 'v3']);
    expect(latestVideos(list, 2).map(x => x.id)).toEqual(['v11', 'v10']);
    expect(list.map(x => x.id)).toEqual(before);
  });
});
