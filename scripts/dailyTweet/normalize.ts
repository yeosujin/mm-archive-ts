import type { Photo, Moment, Post, Video } from '../../src/lib/database';
import { photoText, postText, momentText, stripSubfix } from './text';
import { momentPlatformLabel } from './platform';

export type MediaItem = {
  contentType: 'photo' | 'moment' | 'post';
  mediaType: 'image' | 'video';
  url: string;
  date: string;
  groupKey: string; // contentType|그룹제목|date
  text: string;     // 트윗 본문 캡션
};

// URL이 R2 파일인지 (퍼블릭 도메인 or r2.dev/cloudflarestorage)
export function isR2Url(url: string, r2PublicUrl: string): boolean {
  if (!url) return false;
  const base = (r2PublicUrl || '').replace(/\/$/, '');
  return url.includes('.r2.dev') ||
    url.includes('r2.cloudflarestorage.com') ||
    (base !== '' && url.startsWith(base));
}

export function normalizePhotos(photos: Photo[], r2PublicUrl: string): MediaItem[] {
  return photos
    .filter(p => isR2Url(p.image_url, r2PublicUrl))
    .map(p => {
      const groupTitle = stripSubfix(p.title).trim();
      return {
        contentType: 'photo' as const,
        mediaType: 'image' as const,
        url: p.image_url,
        date: p.date,
        groupKey: `photo|${groupTitle}|${p.date}`,
        text: photoText(p.title, p.date),
      };
    });
}

export function normalizeMoments(
  moments: Moment[],
  videosById: Map<string, Video>,
  r2PublicUrl: string,
): MediaItem[] {
  return moments
    .filter(m => isR2Url(m.tweet_url, r2PublicUrl))
    .map(m => {
      const parent = m.video_id ? videosById.get(m.video_id) : undefined;
      const label = momentPlatformLabel(parent);
      const groupTitle = (parent?.title?.trim() || m.title.trim());
      return {
        contentType: 'moment' as const,
        mediaType: 'video' as const,
        url: m.tweet_url,
        date: m.date,
        groupKey: `moment|${groupTitle}|${m.date}`,
        text: momentText(label, m.date),
      };
    });
}

export function normalizePosts(posts: Post[], r2PublicUrl: string): MediaItem[] {
  const items: MediaItem[] = [];
  for (const post of posts) {
    if (!post.media || post.media.length === 0) continue;
    const groupTitle = (post.title ?? '').trim();
    const text = postText(post.title, post.date);
    for (const media of post.media) {
      if (!isR2Url(media.url, r2PublicUrl)) continue;
      items.push({
        contentType: 'post',
        mediaType: media.type,
        url: media.url,
        date: post.date,
        groupKey: `post|${groupTitle}|${post.date}`,
        text,
      });
    }
  }
  return items;
}
