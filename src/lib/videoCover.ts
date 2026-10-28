import type { Moment, Video } from './database/types';

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

type CoverMoment = Pick<Moment, 'thumbnail_url' | 'position'> & { created_at?: string };

/**
 * 영상 표지 이미지. 우선순위: 직접 지정(thumbnail_url) → 유튜브 썸네일 → 첫 모먼트 썸네일 → null
 * moments는 이 영상의 모먼트만 넘긴다.
 */
export function getVideoCover(video: Pick<Video, 'url' | 'thumbnail_url'>, moments: CoverMoment[]): string | null {
  if (video.thumbnail_url) return video.thumbnail_url;
  const youtubeId = extractYouTubeId(video.url);
  if (youtubeId) return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  const first = [...moments]
    .filter(m => m.thumbnail_url)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || (a.created_at ?? '').localeCompare(b.created_at ?? ''))[0];
  return first?.thumbnail_url ?? null;
}
