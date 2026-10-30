import { describe, it, expect } from 'vitest';
import { buildCalendarDays, dayCover, monthStrip } from './calendarDays';
import type { CalendarData } from './calendarDays';
import type { Moment, Photo, Post, Video } from './database/types';

const video = (id: string, date: string, url = 'https://weverse.io/illit/live/1', thumbnail_url?: string): Video =>
  ({ id, title: id, url, date, thumbnail_url });
const moment = (id: string, date: string, video_id?: string, thumbnail_url?: string): Moment =>
  ({ id, title: id, tweet_url: '', date, video_id, thumbnail_url });
const photo = (id: string, date: string, title: string): Photo =>
  ({ id, title, date, tags: [], image_url: `img-${id}`, thumbnail_url: `thumb-${id}` });
const post = (id: string, date: string, media?: Post['media']): Post =>
  ({ id, title: id, url: '', platform: 'twitter', date, media });

const data = (over: Partial<CalendarData>): CalendarData =>
  ({ videos: [], moments: [], posts: [], photos: [], episodes: [], memberSettings: null, ...over });

describe('buildCalendarDays', () => {
  it('상위 영상과 날짜가 같은 모먼트는 영상에 묶고, 다르면 자기 날짜에 영상 상세 링크로 둔다', () => {
    const days = buildCalendarDays(data({
      videos: [video('v1', '2026-10-14')],
      moments: [moment('m1', '2026-10-14', 'v1'), moment('m2', '2026-10-15', 'v1'), moment('m3', '2026-10-16')],
    }));
    expect(days.get('2026-10-14')?.map(e => e.kind)).toEqual(['video']);
    expect(days.get('2026-10-15')).toEqual([expect.objectContaining({ kind: 'moment', path: '/videos/v1?m=m2' })]);
    expect(days.get('2026-10-16')).toEqual([expect.objectContaining({ kind: 'moment', path: '/moments?highlight=m3' })]);
  });

  it('같은 날 같은 제목(-N 제외) 사진은 한 묶음, 안은 번호순', () => {
    const days = buildCalendarDays(data({
      photos: [photo('p2', '2026-10-09', '공식 사진-2'), photo('p1', '2026-10-09', '공식 사진-1'), photo('p3', '2026-10-09', '화보')],
    }));
    const first = days.get('2026-10-09')?.[0];
    expect(first?.kind === 'photo' && first.photos.map(p => p.id)).toEqual(['p1', 'p2']);
    expect(days.get('2026-10-09')?.map(e => (e.kind === 'photo' ? [e.title, e.count] : null))).toEqual([['공식 사진', 2], ['화보', 1]]);
  });
});

describe('dayCover', () => {
  it('이미지 있는 영상 표지가 먼저 (유튜브는 띠 없는 mqdefault)', () => {
    const days = buildCalendarDays(data({
      videos: [video('v1', '2026-10-14', 'https://youtu.be/abcdefghijk')],
      photos: [photo('p1', '2026-10-14', '사진')],
    }));
    expect(dayCover(days.get('2026-10-14')!)).toEqual({ src: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg' });
  });

  it('영상에 이미지가 없으면 사진을 쓰고, 그것도 없으면 플랫폼 색', () => {
    const withPhoto = buildCalendarDays(data({ videos: [video('v1', '2026-10-14')], photos: [photo('p1', '2026-10-14', '사진')] }));
    expect(dayCover(withPhoto.get('2026-10-14')!)).toEqual({ src: 'thumb-p1' });
    const alone = buildCalendarDays(data({ videos: [video('v1', '2026-10-14')] }));
    expect(dayCover(alone.get('2026-10-14')!)).toEqual({ platform: 'weverse' });
  });

  it('이미지가 없고 에피소드가 있으면 그 종류 — 댓글은 회색, DM은 보낸 멤버 색', () => {
    const days = buildCalendarDays(data({
      episodes: [{ id: 'e1', date: '2026-10-26', episode_type: 'comment', sender: 'member2', comment_text: '보고 싶어' }],
      memberSettings: { member1_name: '모카', member2_name: '민주' },
    }));
    const entries = days.get('2026-10-26')!;
    expect(dayCover(entries)).toEqual({ chat: 'gray', type: 'comment' });
    expect(entries[0]).toEqual(expect.objectContaining({ sender: '민주', lines: [{ type: 'text', content: '보고 싶어' }] }));
    const dm = buildCalendarDays(data({ episodes: [{ id: 'e2', date: '2026-10-27', episode_type: 'dm', sender: 'member2', messages: [] }] }));
    expect(dayCover(dm.get('2026-10-27')!)).toEqual({ chat: 'member2', type: 'dm' });
  });

  it('글만 있는 날은 표지 없음, 포스트 이미지는 표지', () => {
    const days = buildCalendarDays(data({
      posts: [post('a', '2026-10-07'), post('b', '2026-10-08', [{ type: 'video', url: 'v.mp4', thumbnail: 'poster.jpg' }])],
    }));
    expect(dayCover(days.get('2026-10-07')!)).toBeNull();
    expect(dayCover(days.get('2026-10-08')!)).toEqual({ src: 'poster.jpg' });
  });
});

describe('monthStrip', () => {
  it('첫 기록 달부터 이번 달까지, 기록 없는 달은 0', () => {
    const days = buildCalendarDays(data({ videos: [video('a', '2026-07-02'), video('b', '2026-07-03'), video('c', '2026-09-01')] }));
    expect(monthStrip(days, '2026-10-30')).toEqual([
      { year: 2026, month: 7, days: 2 },
      { year: 2026, month: 8, days: 0 },
      { year: 2026, month: 9, days: 1 },
      { year: 2026, month: 10, days: 0 },
    ]);
  });

  it('해를 넘긴다', () => {
    const days = buildCalendarDays(data({ videos: [video('a', '2025-12-31')] }));
    expect(monthStrip(days, '2026-01-05').map(m => `${m.year}.${m.month}`)).toEqual(['2025.12', '2026.1']);
  });
});
