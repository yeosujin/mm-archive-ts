import type { MediaItem } from './normalize';

export type PlannedTweet = {
  text: string;
  mediaUrls: string[]; // 이미지 1~4장 또는 영상 1개
};

// MediaItem[] -> 게시할 트윗 목록.
// 규칙: 같은 groupKey끼리 묶어 이미지는 4장/트윗, 영상은 1개/트윗.
//       영상+이미지 혼합 금지. 그룹은 오래된 날짜부터.
export function planTweets(items: MediaItem[]): PlannedTweet[] {
  const groups = new Map<string, MediaItem[]>();
  for (const it of items) {
    const arr = groups.get(it.groupKey);
    if (arr) arr.push(it);
    else groups.set(it.groupKey, [it]);
  }

  const ordered = [...groups.values()].sort((a, b) => a[0].date.localeCompare(b[0].date));

  const tweets: PlannedTweet[] = [];
  for (const group of ordered) {
    const text = group[0].text;
    const images = group.filter(i => i.mediaType === 'image');
    const videos = group.filter(i => i.mediaType === 'video');
    for (let i = 0; i < images.length; i += 4) {
      tweets.push({ text, mediaUrls: images.slice(i, i + 4).map(x => x.url) });
    }
    for (const v of videos) {
      tweets.push({ text, mediaUrls: [v.url] });
    }
  }
  return tweets;
}
