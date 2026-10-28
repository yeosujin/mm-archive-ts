import type { Moment, Video } from './database/types';

export type VideoCategory = 'live' | 'official' | 'external';

/** 표지 분류 — 틀릴 수 없는 기준만 쓴다(제목 패턴 분류는 쓰지 않음) */
export function classifyVideo(video: Pick<Video, 'url' | 'channel_name'>): VideoCategory {
  if (video.url.includes('weverse')) return 'live';
  const youtube = video.url.includes('youtube.com') || video.url.includes('youtu.be');
  return youtube && video.channel_name === 'ILLIT' ? 'official' : 'external';
}

export function videoYears(videos: Pick<Video, 'date'>[]): number[] {
  return [...new Set(videos.map(v => Number(v.date.slice(0, 4))))].sort((a, b) => b - a);
}

export interface CatalogFilter {
  year: number | 'all';
  category: 'all' | VideoCategory;
  /** 위버스 멤버 아이콘. 라이브 분류에서만 적용 */
  member: string;
}

export function filterVideos<T extends Video>(videos: T[], f: CatalogFilter): T[] {
  return videos.filter(v =>
    (f.year === 'all' || Number(v.date.slice(0, 4)) === f.year) &&
    (f.category === 'all' || classifyVideo(v) === f.category) &&
    (f.category !== 'live' || f.member === 'all' || v.icon === f.member)
  );
}

/** 연·월 내림차순 묶음. 연도 '전체'일 때도 같은 달끼리 연도가 섞이지 않게 연·월로 묶는다 */
export function groupByMonth<T extends Pick<Video, 'date'>>(videos: T[]): { year: number; month: number; videos: T[] }[] {
  const byMonth = new Map<string, T[]>();
  for (const v of videos) {
    const key = v.date.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), v]);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => ({
      year: Number(key.slice(0, 4)),
      month: Number(key.slice(5, 7)),
      videos: list.sort((a, b) => b.date.localeCompare(a.date)),
    }));
}

/** 영상 id → 모먼트(position → created_at 오름차순) */
export function momentsByVideo(moments: Moment[]): Map<string, Moment[]> {
  const map = new Map<string, Moment[]>();
  for (const m of moments) {
    if (!m.video_id) continue;
    map.set(m.video_id, [...(map.get(m.video_id) ?? []), m]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || (a.created_at ?? '').localeCompare(b.created_at ?? ''));
  }
  return map;
}

/** 새로 올라온 순(`created_at` 내림차순) n개 */
export function latestVideos<T extends Pick<Video, 'created_at'>>(videos: T[], n = 9): T[] {
  return [...videos].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, n);
}

export function pickHero<T extends Pick<Video, 'id'>>(videos: T[], moments: Map<string, Moment[]>, random = Math.random): T | null {
  const candidates = videos.filter(v => (moments.get(v.id)?.length ?? 0) > 0);
  return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
}

export const CATEGORY_LABEL: Record<VideoCategory, string> = {
  live: 'Weverse',
  official: 'YouTube',
  external: '외부 출연',
};

/** 'YYYY-MM-DD…' → 'YYYY.MM.DD' */
export function formatDotDate(date: string): string {
  return date.slice(0, 10).replaceAll('-', '.');
}
