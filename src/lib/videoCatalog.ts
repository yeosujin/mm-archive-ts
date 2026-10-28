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
  year: number;
  category: 'all' | VideoCategory;
  /** 위버스 멤버 아이콘. 라이브 분류에서만 적용 */
  member: string;
}

export function filterVideos<T extends Video>(videos: T[], f: CatalogFilter): T[] {
  return videos.filter(v =>
    Number(v.date.slice(0, 4)) === f.year &&
    (f.category === 'all' || classifyVideo(v) === f.category) &&
    (f.category !== 'live' || f.member === 'all' || v.icon === f.member)
  );
}

export function groupByMonth<T extends Pick<Video, 'date'>>(videos: T[]): { month: number; videos: T[] }[] {
  const byMonth = new Map<number, T[]>();
  for (const v of videos) {
    const month = Number(v.date.slice(5, 7));
    byMonth.set(month, [...(byMonth.get(month) ?? []), v]);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => b - a)
    .map(([month, list]) => ({ month, videos: list.sort((a, b) => b.date.localeCompare(a.date)) }));
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

export function pickHero<T extends Pick<Video, 'id'>>(videos: T[], moments: Map<string, Moment[]>, random = Math.random): T | null {
  const candidates = videos.filter(v => (moments.get(v.id)?.length ?? 0) > 0);
  return candidates.length ? candidates[Math.floor(random() * candidates.length)] : null;
}
