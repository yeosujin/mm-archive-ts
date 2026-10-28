import { describe, it, expect } from 'vitest';
import {
  buildStoryYears, frameDurationMs, frameMedia, storyDays, fallbackDay, shouldAutoOpen, latestMoments,
  contentKey, groupStoryContents, parseStoryParam,
  type StoryData, type StoryFrame,
} from './onThisDayStory';
import type { Video, Moment, Photo, Post, Episode } from './database/types';

const video = (id: string, date: string): Video => ({ id, title: id, url: `https://youtu.be/${id}`, date });
const moment = (id: string, date: string, video_id?: string, position = 0, created_at = '2025-01-01T00:00:00Z'): Moment =>
  ({ id, title: id, tweet_url: `https://cdn/${id}.mp4`, date, video_id, position, created_at });
const photo = (id: string, title: string, date: string): Photo => ({ id, title, date, tags: [], image_url: `https://r2/${id}.jpg` });
const post = (id: string, date: string, media?: Post['media']): Post => ({ id, title: id, url: `https://x.com/${id}`, platform: 'twitter', date, media });
const episode = (id: string, date: string, count = 0): Episode => ({
  id, date, episode_type: 'dm',
  messages: Array.from({ length: count }, (_, i) => ({ type: 'text' as const, content: String(i), time: '00:00' })),
});

const empty: StoryData = { videos: [], moments: [], posts: [], photos: [], episodes: [] };
const keys = (frames: StoryFrame[]) => frames.map(f => f.key);

describe('buildStoryYears', () => {
  const data: StoryData = {
    videos: [video('v1', '2024-10-28'), video('v2', '2024-10-28'), video('vEmpty', '2024-10-28'), video('vOther', '2024-03-01')],
    moments: [
      moment('m1b', '2024-11-02', 'v1', 2),
      moment('m1a', '2024-11-01', 'v1', 1), // 자기 날짜는 다르지만 영상이 그날 → 포함
      moment('m2', '2024-10-28', 'v2'),
      moment('mOther', '2024-10-28', 'vOther'), // 자기 날짜는 그날이지만 영상 날짜가 다름 → 제외
      moment('mSolo', '2024-10-28'), // 영상 없음 → 자기 날짜
    ],
    photos: [photo('p2', '앨범-2', '2024-10-28'), photo('p1', '앨범-1', '2024-10-28')],
    posts: [
      post('post1', '2024-10-28', [{ type: 'image', url: 'a' }, { type: 'video', url: 'b' }]),
      post('post2', '2024-10-28'),
    ],
    episodes: [episode('e1', '2024-10-28', 2)],
  };

  it('한 해 안 순서: 영상별 모먼트 → 독립 모먼트 → 모먼트 없는 영상 → 사진 → 포스트(미디어마다) → 에피소드', () => {
    const years = buildStoryYears(data, '2026-10-28');
    expect(years).toHaveLength(1);
    expect(years[0].year).toBe(2024);
    expect(years[0].yearsAgo).toBe(2);
    expect(keys(years[0].frames)).toEqual([
      'moment:m1a', 'moment:m1b', 'moment:m2', 'moment:mSolo',
      'video:vEmpty',
      'photo:p1', 'photo:p2',
      'post:post1:0', 'post:post1:1', 'post:post2',
      'episode:e1',
    ]);
  });

  it('모먼트는 자기 날짜가 아니라 상위 영상 날짜로 판정', () => {
    const frames = buildStoryYears(data, '2026-10-28')[0].frames;
    expect(keys(frames)).not.toContain('moment:mOther');
    const m1a = frames.find(f => f.key === 'moment:m1a');
    expect(m1a?.kind === 'moment' && m1a.video?.id).toBe('v1');
    // 3월 1일에는 mOther가 영상 날짜로 들어온다
    expect(keys(buildStoryYears(data, '2026-03-01')[0].frames)).toEqual(['moment:mOther']);
  });

  it('사진 묶음 제목에서 끝 -N 제거', () => {
    const frames = buildStoryYears(data, '2026-10-28')[0].frames;
    const titles = frames.flatMap(f => (f.kind === 'photo' ? [f.title] : []));
    expect(titles).toEqual(['앨범', '앨범']);
  });

  it('미디어 없는 포스트는 media 없이 1프레임', () => {
    const frames = buildStoryYears(data, '2026-10-28')[0].frames;
    const p2 = frames.filter(f => f.kind === 'post' && f.post.id === 'post2');
    expect(p2).toHaveLength(1);
    expect(p2[0].kind === 'post' && p2[0].media).toBeUndefined();
  });

  it('연도 내림차순, 오늘 연도 제외, 빈 해 없음', () => {
    const d: StoryData = {
      ...empty,
      videos: [video('a', '2023-05-05'), video('b', '2025-05-05'), video('c', '2026-05-05')],
      photos: [photo('p', 'x', '2024-05-06')],
    };
    const years = buildStoryYears(d, '2026-05-05');
    expect(years.map(y => y.year)).toEqual([2025, 2023]);
    expect(years.map(y => y.yearsAgo)).toEqual([1, 3]);
    expect(buildStoryYears(empty, '2026-05-05')).toEqual([]);
  });
});

describe('frameDurationMs', () => {
  const v = video('v', '2024-01-01');
  it('타입별 길이', () => {
    expect(frameDurationMs({ kind: 'moment', key: 'm', moment: moment('m', '2024-01-01') })).toBeNull();
    expect(frameDurationMs({ kind: 'video', key: 'v', video: v })).toBe(5000);
    expect(frameDurationMs({ kind: 'photo', key: 'p', photo: photo('p', 'x', '2024-01-01'), title: 'x' })).toBe(5000);
    expect(frameDurationMs({ kind: 'post', key: 'p', post: post('p', '2024-01-01') })).toBe(5000);
    expect(frameDurationMs({ kind: 'post', key: 'p', post: post('p', '2024-01-01'), media: { type: 'image', url: 'a' } })).toBe(5000);
    expect(frameDurationMs({ kind: 'post', key: 'p', post: post('p', '2024-01-01'), media: { type: 'video', url: 'a' } })).toBeNull();
    expect(frameDurationMs({ kind: 'episode', key: 'e', episode: episode('e', '2024-01-01', 10) })).toBe(10000);
    expect(frameDurationMs({ kind: 'episode', key: 'e', episode: { ...episode('e', '2024-01-01'), messages: undefined } })).toBe(3000);
  });
  it('에피소드 상한 20초', () => {
    expect(frameDurationMs({ kind: 'episode', key: 'e', episode: episode('e', '2024-01-01', 100) })).toBe(20000);
  });
});

describe('storyDays', () => {
  it('MM-DD 정렬·중복 없음, 모먼트는 영상 날짜', () => {
    const d: StoryData = {
      videos: [video('v', '2024-12-01')],
      moments: [moment('m', '2024-12-05', 'v'), moment('solo', '2023-02-14'), moment('orphan', '2023-07-07', 'missing')],
      photos: [photo('p', 'x', '2022-12-01')],
      posts: [post('post', '2021-01-03')],
      episodes: [episode('e', '2020-08-15')],
    };
    expect(storyDays(d)).toEqual(['01-03', '02-14', '07-07', '08-15', '12-01']);
  });
  it('buildStoryYears와 같은 기준 — 각 날마다 다른 해 기준으로 스토리가 있다', () => {
    const d: StoryData = { ...empty, videos: [video('v', '2024-12-01')], moments: [moment('m', '2024-12-05', 'v')] };
    for (const day of storyDays(d)) expect(buildStoryYears(d, `2030-${day}`).length).toBeGreaterThan(0);
  });
});

describe('fallbackDay', () => {
  const days = ['01-01', '02-02', '03-03', '04-04', '05-05'];
  it('결정적 — 같은 날 같은 결과, 목록 안의 값', () => {
    const a = fallbackDay('2026-10-28', days);
    expect(a).toBe(fallbackDay('2026-10-28', days));
    expect(days).toContain(a);
  });
  it('빈 목록이면 null', () => {
    expect(fallbackDay('2026-10-28', [])).toBeNull();
  });
});

describe('shouldAutoOpen', () => {
  it('스토리 있고 대체 날짜 아니고 오늘 처음일 때만', () => {
    expect(shouldAutoOpen(null, '2026-10-28', true, false)).toBe(true);
    expect(shouldAutoOpen('2026-10-28', '2026-10-28', true, false)).toBe(false);
    expect(shouldAutoOpen('2026-10-27', '2026-10-28', false, false)).toBe(false);
    expect(shouldAutoOpen('2026-10-27', '2026-10-28', true, true)).toBe(false);
  });
});

describe('latestMoments', () => {
  it('created_at 내림차순 n개, 원본 불변', () => {
    const list = Array.from({ length: 12 }, (_, i) => moment(`m${i}`, '2024-01-01', undefined, 0, `2025-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`));
    const before = list.map(m => m.id);
    expect(latestMoments(list).map(m => m.id)).toEqual(['m11', 'm10', 'm9', 'm8', 'm7', 'm6', 'm5', 'm4', 'm3']);
    expect(latestMoments(list, 2).map(m => m.id)).toEqual(['m11', 'm10']);
    expect(list.map(m => m.id)).toEqual(before);
  });
});

describe('frameMedia', () => {
  it('모먼트는 영상 + 썸네일, 사진·이미지 포스트는 이미지, 영상 포스트는 영상 + 썸네일', () => {
    const m = { ...moment('m1', '2024-10-28'), thumbnail_url: 'https://cdn/m1.jpg' };
    expect(frameMedia({ kind: 'moment', key: 'k', moment: m })).toEqual({ video: 'https://cdn/m1.mp4', image: 'https://cdn/m1.jpg' });
    expect(frameMedia({ kind: 'photo', key: 'k', photo: photo('p', 't', '2024-10-28'), title: 't' })).toEqual({ image: 'https://r2/p.jpg' });
    const p = post('x', '2024-10-28');
    expect(frameMedia({ kind: 'post', key: 'k', post: p, media: { type: 'image', url: 'https://i.jpg' } })).toEqual({ image: 'https://i.jpg' });
    expect(frameMedia({ kind: 'post', key: 'k', post: p, media: { type: 'video', url: 'https://v.mp4', thumbnail: 'https://t.jpg' } }))
      .toEqual({ video: 'https://v.mp4', image: 'https://t.jpg' });
  });
  it('미디어 없는 프레임·없음은 빈 객체', () => {
    expect(frameMedia({ kind: 'post', key: 'k', post: post('x', '2024-10-28') })).toEqual({});
    expect(frameMedia({ kind: 'episode', key: 'k', episode: episode('e', '2024-10-28') })).toEqual({});
    expect(frameMedia(undefined)).toEqual({});
  });
});

describe('contentKey', () => {
  it('같은 영상의 모먼트와 모먼트 없는 영상은 영상 기준, 독립 모먼트는 자기 기준', () => {
    const v = video('v1', '2024-10-28');
    expect(contentKey({ kind: 'moment', key: 'k', moment: moment('m1', '2024-10-28', 'v1'), video: v })).toBe('video:v1');
    expect(contentKey({ kind: 'moment', key: 'k', moment: moment('m2', '2024-10-28') })).toBe('moment:m2');
    expect(contentKey({ kind: 'video', key: 'k', video: v })).toBe('video:v1');
  });

  it('사진은 날짜+묶음 제목, 포스트는 포스트 id, 에피소드는 id', () => {
    expect(contentKey({ kind: 'photo', key: 'k', photo: photo('p1', '앨범-1', '2024-10-28'), title: '앨범' })).toBe('photo:2024-10-28|앨범');
    expect(contentKey({ kind: 'post', key: 'k', post: post('a', '2024-10-28'), media: { type: 'image', url: 'x' } })).toBe('post:a');
    expect(contentKey({ kind: 'episode', key: 'k', episode: episode('e1', '2024-10-28') })).toBe('episode:e1');
  });
});

describe('groupStoryContents', () => {
  it('붙어 있는 같은 콘텐츠 프레임을 한 묶음으로, 시작 위치와 함께', () => {
    const data: StoryData = {
      ...empty,
      videos: [video('v1', '2024-10-28')],
      moments: [moment('m1', '2024-10-28', 'v1', 1), moment('m2', '2024-10-28', 'v1', 2), moment('solo', '2024-10-28')],
      photos: [photo('p1', '앨범-1', '2024-10-28'), photo('p2', '앨범-2', '2024-10-28')],
      posts: [post('post1', '2024-10-28', [{ type: 'image', url: 'a' }, { type: 'image', url: 'b' }]), post('post2', '2024-10-28')],
      episodes: [episode('e1', '2024-10-28')],
    };
    const [year] = buildStoryYears(data, '2026-10-28');
    const groups = groupStoryContents(year);
    expect(groups.map(g => [g.key, g.startIndex, g.frames.length])).toEqual([
      ['video:v1', 0, 2],
      ['moment:solo', 2, 1],
      ['photo:2024-10-28|앨범', 3, 2],
      ['post:post1', 5, 2],
      ['post:post2', 7, 1],
      ['episode:e1', 8, 1],
    ]);
    expect(groups.flatMap(g => g.frames)).toEqual(year.frames);
  });

  it('프레임이 없으면 빈 목록', () => {
    expect(groupStoryContents({ year: 2024, yearsAgo: 2, frames: [] })).toEqual([]);
  });
});

describe('parseStoryParam', () => {
  it('YEAR는 첫 프레임, YEAR.N은 N번째 프레임', () => {
    expect(parseStoryParam('2025')).toEqual({ year: 2025, frame: 0 });
    expect(parseStoryParam('2025.3')).toEqual({ year: 2025, frame: 3 });
  });

  it('없거나 형식이 틀리면 null', () => {
    expect(parseStoryParam(null)).toBeNull();
    expect(parseStoryParam('')).toBeNull();
    expect(parseStoryParam('abc')).toBeNull();
    expect(parseStoryParam('2025.')).toBeNull();
    expect(parseStoryParam('2025.-1')).toBeNull();
  });
});
