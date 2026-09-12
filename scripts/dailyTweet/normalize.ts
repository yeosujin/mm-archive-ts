import type { Photo, Moment, Post, Video } from '../../src/lib/database';
import { photoText, postText, momentText, stripSubfix } from './text';

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
        text: photoText(p.date),
      };
    });
}

// 같은 MM-DD + 과거 연도만 (오늘 연도 제외). dailyPick.filterOnThisDay와 동일 규칙.
function isOnThisDay(date: string, todayString: string): boolean {
  if (!date || date.length < 10) return false;
  return date.slice(5, 10) === todayString.slice(5, 10) && date.slice(0, 4) !== todayString.slice(0, 4);
}

// 홈 "그해 오늘"과 동일하게, 상위 영상이 있으면 그 영상 날짜로 선정/라벨링하고,
// 독립 모먼트면 모먼트 자체 날짜를 쓴다.
export function normalizeMoments(
  moments: Moment[],
  videosById: Map<string, Video>,
  r2PublicUrl: string,
  todayString: string,
): MediaItem[] {
  // 클립 순서를 앱(getMoments)과 동일하게 position 오름차순으로 맞춘다.
  // (fetchAllRows는 페이지 안정성 때문에 id 순으로 가져오므로 여기서 재정렬)
  // 동률이면 created_at → id 로 안정화. 그룹핑이 뒤따르므로 영상 간 섞임은 무관하고,
  // 각 영상 내부의 상대 순서만 position 순으로 유지되면 된다.
  const sorted = [...moments].sort((a, b) => {
    const pa = a.position ?? 0;
    const pb = b.position ?? 0;
    if (pa !== pb) return pa - pb;
    const ca = (a as { created_at?: string }).created_at ?? '';
    const cb = (b as { created_at?: string }).created_at ?? '';
    if (ca !== cb) return ca.localeCompare(cb);
    return a.id.localeCompare(b.id);
  });
  return sorted
    .map(m => {
      const parent = m.video_id ? videosById.get(m.video_id) : undefined;
      const effDate = parent?.date || m.date; // 연결 영상 있으면 그 날짜
      return { m, parent, effDate };
    })
    .filter(({ effDate }) => isOnThisDay(effDate, todayString))
    .filter(({ m }) => isR2Url(m.tweet_url, r2PublicUrl))
    .map(({ m, parent, effDate }) => {
      // 영상 출처가 다르면 반드시 다른 트윗이어야 하므로 제목이 아니라 id로 묶는다.
      // 제목으로 묶으면 같은 날 제목이 같은 다른 영상이 한 스레드로 합쳐진다.
      // 상위 영상이 없는 독립 모먼트는 자기 id로 묶어 서로 섞이지 않게 한다.
      const groupId = parent ? parent.id : `solo:${m.id}`;
      return {
        contentType: 'moment' as const,
        mediaType: 'video' as const,
        url: m.tweet_url,
        date: effDate,
        groupKey: `moment|${groupId}|${effDate}`,
        text: momentText(effDate),
      };
    });
}

export function normalizePosts(posts: Post[], r2PublicUrl: string): MediaItem[] {
  const items: MediaItem[] = [];
  for (const post of posts) {
    if (!post.media || post.media.length === 0) continue;
    const text = postText(post.date);
    for (const media of post.media) {
      if (!isR2Url(media.url, r2PublicUrl)) continue;
      items.push({
        contentType: 'post',
        mediaType: media.type,
        url: media.url,
        date: post.date,
        // 모먼트와 같은 이유로 제목이 아니라 id로 묶는다
        // (같은 날 제목이 같은 다른 포스트가 한 스레드로 합쳐지는 것을 막는다)
        groupKey: `post|${post.id}|${post.date}`,
        text,
      });
    }
  }
  return items;
}
