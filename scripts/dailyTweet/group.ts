import type { MediaItem } from './normalize';
import { withHashtags } from './text';

export type PlannedTweet = {
  text: string;
  mediaUrls: string[]; // 이미지/영상 혼합 가능, 트윗당 MAX_MEDIA_PER_TWEET개까지
  groupKey: string;    // 같은 그룹끼리만 쓰레드로 이어짐(다른 그룹은 독립 트윗)
};

/**
 * 한 트윗에 실을 수 있는 미디어 개수.
 *
 * X가 2026-11-12에 게시물당 미디어 상한을 4개 → 20개로 올렸다(사진·영상 합산).
 * 다만 docs.x.com은 아직 "4 photos, 1 GIF, 1 video"로 남아 있어서 API가 정말
 * 20개를 받는지는 문서로 확인되지 않는다. 그래서 여기서는 20개로 묶되,
 * 실제 게시가 거절되면 x.ts의 postThread가 4개씩 쪼개 재시도한다.
 */
export const MAX_MEDIA_PER_TWEET = 20;

// MediaItem[] -> 게시할 트윗 목록.
// 규칙: 같은 groupKey끼리 묶어 종류(이미지/영상) 상관없이 한 트윗에 maxMedia개까지.
//       그룹은 오래된 날짜부터.
export function planTweets(
  items: MediaItem[],
  maxMedia: number = MAX_MEDIA_PER_TWEET,
): PlannedTweet[] {
  const groups = new Map<string, MediaItem[]>();
  for (const it of items) {
    const arr = groups.get(it.groupKey);
    if (arr) arr.push(it);
    else groups.set(it.groupKey, [it]);
  }

  const ordered = [...groups.values()].sort((a, b) => a[0].date.localeCompare(b[0].date));

  const tweets: PlannedTweet[] = [];
  for (const group of ordered) {
    const text = withHashtags(group[0].text);
    const groupKey = group[0].groupKey;
    for (let i = 0; i < group.length; i += maxMedia) {
      tweets.push({ text, mediaUrls: group.slice(i, i + maxMedia).map(x => x.url), groupKey });
    }
  }
  return tweets;
}
