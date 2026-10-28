import type { Episode, Moment, Photo, Post, PostMedia, Video } from './database/types';
import { filterOnThisDay } from './dailyPick';
import { momentsByVideo } from './videoCatalog';

export type StoryFrame =
  | { kind: 'moment'; key: string; moment: Moment; video?: Video }
  | { kind: 'video'; key: string; video: Video }                       // 모먼트 없는 영상: 표지 + 제목 + 보러가기
  | { kind: 'photo'; key: string; photo: Photo; title: string }         // 장마다 1개, title은 -N 뗀 묶음 제목
  | { kind: 'post'; key: string; post: Post; media?: PostMedia }        // 미디어마다 1개, 없으면 media 없이 1개
  | { kind: 'episode'; key: string; episode: Episode };

export interface StoryYear { year: number; yearsAgo: number; frames: StoryFrame[] }

export interface StoryData { videos: Video[]; moments: Moment[]; posts: Post[]; photos: Photo[]; episodes: Episode[] }

const yearOf = (date: string) => Number(date.slice(0, 4));
const photoGroupTitle = (title: string) => title.replace(/-\d+$/, '');

/** 상위 영상이 없는(또는 영상을 못 찾은) 모먼트 — 자기 날짜로 판정 */
function standaloneMoments(data: StoryData): Moment[] {
  const ids = new Set(data.videos.map(v => v.id));
  return data.moments.filter(m => !m.video_id || !ids.has(m.video_id));
}

/** 연도별 그 해 오늘 프레임. 모먼트는 상위 영상 날짜로 판정(X 봇과 같은 규칙), 최신 연도 먼저 */
export function buildStoryYears(data: StoryData, today: string): StoryYear[] {
  const byVideo = momentsByVideo(data.moments);
  const frames = new Map<number, StoryFrame[]>();
  const push = (date: string, ...fs: StoryFrame[]) => {
    const y = yearOf(date);
    frames.set(y, [...(frames.get(y) ?? []), ...fs]);
  };

  const videos = [...filterOnThisDay(data.videos, today)].sort((a, b) => a.date.localeCompare(b.date));
  for (const v of videos) {
    for (const m of byVideo.get(v.id) ?? []) push(v.date, { kind: 'moment', key: `moment:${m.id}`, moment: m, video: v });
  }
  for (const m of filterOnThisDay(standaloneMoments(data), today)) push(m.date, { kind: 'moment', key: `moment:${m.id}`, moment: m });
  for (const v of videos) {
    if (!byVideo.get(v.id)?.length) push(v.date, { kind: 'video', key: `video:${v.id}`, video: v });
  }

  // 사진: 같은 날·같은 묶음 제목끼리 모으고, 묶음 안은 제목(-1, -2 …) 순
  const photoGroups = new Map<string, Photo[]>();
  for (const p of filterOnThisDay(data.photos, today)) {
    const k = `${p.date}|${photoGroupTitle(p.title)}`;
    photoGroups.set(k, [...(photoGroups.get(k) ?? []), p]);
  }
  for (const group of photoGroups.values()) {
    group.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
    for (const p of group) push(p.date, { kind: 'photo', key: `photo:${p.id}`, photo: p, title: photoGroupTitle(p.title) });
  }

  for (const p of filterOnThisDay(data.posts, today)) {
    if (p.media?.length) p.media.forEach((media, i) => push(p.date, { kind: 'post', key: `post:${p.id}:${i}`, post: p, media }));
    else push(p.date, { kind: 'post', key: `post:${p.id}`, post: p });
  }

  for (const e of filterOnThisDay(data.episodes, today)) push(e.date, { kind: 'episode', key: `episode:${e.id}`, episode: e });

  const todayYear = yearOf(today);
  return [...frames.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, list]) => ({ year, yearsAgo: todayYear - year, frames: list }));
}

/** 프레임이 보여줄 미디어 주소 (영상·이미지). 미리 받기에 쓴다 */
export function frameMedia(f: StoryFrame | undefined): { video?: string; image?: string } {
  if (!f) return {};
  if (f.kind === 'moment') return { video: f.moment.tweet_url, image: f.moment.thumbnail_url };
  if (f.kind === 'photo') return { image: f.photo.image_url };
  if (f.kind === 'post' && f.media) {
    return f.media.type === 'video' ? { video: f.media.url, image: f.media.thumbnail } : { image: f.media.url };
  }
  return {};
}

/** 프레임 표시 길이(ms). null이면 영상 길이를 따른다 */
export function frameDurationMs(frame: StoryFrame): number | null {
  switch (frame.kind) {
    case 'moment': return null;
    case 'post': return frame.media?.type === 'video' ? null : 5000;
    case 'episode': return Math.min(20000, 3000 + 700 * (frame.episode.messages?.length ?? 0));
    default: return 5000;
  }
}

/** 그 해 오늘이 있는 `MM-DD` 목록(정렬, 중복 없음). buildStoryYears와 같은 기준 */
export function storyDays(data: StoryData): string[] {
  const dates = [
    ...data.videos, ...standaloneMoments(data), ...data.photos, ...data.posts, ...data.episodes,
  ].map(item => item.date).filter(d => d && d.length >= 10);
  return [...new Set(dates.map(d => d.slice(5, 10)))].sort();
}

/** 오늘 그 해 오늘이 없을 때 쓸 `MM-DD`. 날짜 문자열의 31-곱셈 해시 % 개수로 고정 선택 */
export function fallbackDay(today: string, days: string[]): string | null {
  if (!days.length) return null;
  let h = 0;
  for (const c of today) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return days[h % days.length];
}

export function shouldAutoOpen(lastShown: string | null, today: string, hasStory: boolean, isFallback: boolean): boolean {
  return hasStory && !isFallback && lastShown !== today;
}

/** `created_at` 최신순 n개 */
export function latestMoments(moments: Moment[], n = 9): Moment[] {
  return [...moments].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, n);
}
