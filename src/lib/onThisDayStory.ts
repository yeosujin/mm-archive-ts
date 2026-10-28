import type { Episode, Moment, Photo, Post, PostMedia, Video } from './database/types';
import { filterOnThisDay } from './dailyPick';
import { momentsByVideo } from './videoCatalog';

export type StoryFrame =
  | { kind: 'moment'; key: string; moment: Moment; video?: Video }
  | { kind: 'video'; key: string; video: Video }                       // 모먼트 없는 영상: 표지 + 제목 + 보러가기
  | { kind: 'photo'; key: string; photo: Photo; title: string }         // 장마다 1개, title은 -N 뗀 묶음 제목
  | { kind: 'post'; key: string; post: Post; media?: PostMedia }        // 미디어마다 1개, 없으면 media 없이 1개
  | { kind: 'episode'; key: string; episode: Episode };

export interface StoryYear {
  year: number;
  yearsAgo: number;
  frames: StoryFrame[];
  /** 있으면 해 머리·뷰어 위 이름을 'N년 전' 대신 이것으로 (대체 날짜) */
  label?: string;
}

export interface StoryData { videos: Video[]; moments: Moment[]; posts: Post[]; photos: Photo[]; episodes: Episode[] }

const yearOf = (date: string) => Number(date.slice(0, 4));
const photoGroupTitle = (title: string) => title.replace(/-\d+$/, '');

/** 상위 영상이 없는(또는 영상을 못 찾은) 모먼트 — 자기 날짜로 판정 */
function standaloneMoments(data: StoryData): Moment[] {
  const ids = new Set(data.videos.map(v => v.id));
  return data.moments.filter(m => !m.video_id || !ids.has(m.video_id));
}

type DateFilter = <T extends { date: string }>(items: T[]) => T[];

/** pick이 남긴 콘텐츠의 프레임을 연도별로 모은다. 모먼트는 상위 영상 날짜로 판정(X 봇과 같은 규칙) */
function framesByYear(data: StoryData, pick: DateFilter): Map<number, StoryFrame[]> {
  const byVideo = momentsByVideo(data.moments);
  const frames = new Map<number, StoryFrame[]>();
  const push = (date: string, ...fs: StoryFrame[]) => {
    const y = yearOf(date);
    frames.set(y, [...(frames.get(y) ?? []), ...fs]);
  };

  const videos = [...pick(data.videos)].sort((a, b) => a.date.localeCompare(b.date));
  for (const v of videos) {
    for (const m of byVideo.get(v.id) ?? []) push(v.date, { kind: 'moment', key: `moment:${m.id}`, moment: m, video: v });
  }
  for (const m of pick(standaloneMoments(data))) push(m.date, { kind: 'moment', key: `moment:${m.id}`, moment: m });
  for (const v of videos) {
    if (!byVideo.get(v.id)?.length) push(v.date, { kind: 'video', key: `video:${v.id}`, video: v });
  }

  // 사진: 같은 날·같은 묶음 제목끼리 모으고, 묶음 안은 제목(-1, -2 …) 순
  const photoGroups = new Map<string, Photo[]>();
  for (const p of pick(data.photos)) {
    const k = `${p.date}|${photoGroupTitle(p.title)}`;
    photoGroups.set(k, [...(photoGroups.get(k) ?? []), p]);
  }
  for (const group of photoGroups.values()) {
    group.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
    for (const p of group) push(p.date, { kind: 'photo', key: `photo:${p.id}`, photo: p, title: photoGroupTitle(p.title) });
  }

  for (const p of pick(data.posts)) {
    if (p.media?.length) p.media.forEach((media, i) => push(p.date, { kind: 'post', key: `post:${p.id}:${i}`, post: p, media }));
    else push(p.date, { kind: 'post', key: `post:${p.id}`, post: p });
  }

  for (const e of pick(data.episodes)) push(e.date, { kind: 'episode', key: `episode:${e.id}`, episode: e });
  return frames;
}

/** 연도별 그 해 오늘 프레임 (오늘과 MM-DD가 같은 과거 연도), 최신 연도 먼저 */
export function buildStoryYears(data: StoryData, today: string): StoryYear[] {
  const todayYear = yearOf(today);
  const frames = framesByYear(data, items => filterOnThisDay(items, today));
  return [...frames.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, list]) => ({ year, yearsAgo: todayYear - year, frames: list }));
}

/** 정확히 그 날짜(YYYY-MM-DD)의 프레임 한 해치(yearsAgo 0). 없으면 null */
export function buildStoryForDate(data: StoryData, date: string): StoryYear | null {
  const frames = framesByYear(data, items => items.filter(item => item.date?.slice(0, 10) === date)).get(yearOf(date));
  return frames?.length ? { year: yearOf(date), yearsAgo: 0, frames } : null;
}

/** 한 콘텐츠 기준: 같은 영상의 모먼트, 같은 묶음 사진, 같은 포스트의 미디어는 한 콘텐츠 */
export function contentKey(f: StoryFrame): string {
  switch (f.kind) {
    case 'moment': return f.moment.video_id ? `video:${f.moment.video_id}` : `moment:${f.moment.id}`;
    case 'video': return `video:${f.video.id}`;
    case 'photo': return `photo:${f.photo.date}|${f.title}`;
    case 'post': return `post:${f.post.id}`;
    case 'episode': return `episode:${f.episode.id}`;
  }
}

export interface StoryContent { key: string; startIndex: number; frames: StoryFrame[] }

/** 한 해의 프레임을 콘텐츠별로 묶는다. 같은 콘텐츠 프레임은 붙어 있다 */
export function groupStoryContents(year: StoryYear): StoryContent[] {
  const groups: StoryContent[] = [];
  year.frames.forEach((f, i) => {
    const key = contentKey(f);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.frames.push(f);
    else groups.push({ key, startIndex: i, frames: [f] });
  });
  return groups;
}

/** 스토리 쿼리 `YEAR` 또는 `YEAR.FRAMEINDEX`. 형식이 틀리면 null */
export function parseStoryParam(param: string | null): { year: number; frame: number } | null {
  const m = param?.match(/^(\d{4})(?:\.(\d+))?$/);
  if (!m) return null;
  return { year: Number(m[1]), frame: m[2] ? Number(m[2]) : 0 };
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

/**
 * 오늘 그 해 오늘이 없을 때 보여줄 날짜(YYYY-MM-DD). 올해 오늘 이전에 콘텐츠가 있는 날 중 하나,
 * 올해에 없으면 콘텐츠가 있는 가장 최근 연도의 날 중 하나. 날짜 문자열의 31-곱셈 해시로 고정 선택
 */
export function pickFallbackDate(data: StoryData, today: string): string | null {
  const dates = [...new Set([
    ...data.videos, ...standaloneMoments(data), ...data.photos, ...data.posts, ...data.episodes,
  ].map(item => item.date).filter(d => d && d.length >= 10).map(d => d.slice(0, 10)).filter(d => d < today))];
  if (!dates.length) return null;
  const year = Math.max(...dates.map(yearOf));
  const days = dates.filter(d => yearOf(d) === year).sort();
  let h = 0;
  for (const c of today) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return days[h % days.length];
}

/** 대체 날짜 이름: `올해 M월 D일` / `작년 M월 D일` / `YYYY년 M월 D일` */
export function fallbackLabel(date: string, today: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const diff = yearOf(today) - y;
  const prefix = diff === 0 ? '올해' : diff === 1 ? '작년' : `${y}년`;
  return `${prefix} ${m}월 ${d}일`;
}

export function shouldAutoOpen(lastShown: string | null, today: string, hasStory: boolean, isFallback: boolean): boolean {
  return hasStory && !isFallback && lastShown !== today;
}

/** `created_at` 최신순 n개 */
export function latestMoments(moments: Moment[], n = 9): Moment[] {
  return [...moments].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, n);
}
