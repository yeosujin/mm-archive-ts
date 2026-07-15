import type { MediaItem } from './normalize';

export type PlannedTweet = {
  text: string;
  mediaUrls: string[]; // 미디어 1~4개 (이미지/영상 혼합 가능)
  groupKey: string;    // 같은 그룹끼리만 쓰레드로 이어짐(다른 그룹은 독립 트윗)
};

const MAX_MEDIA_PER_TWEET = 4;

// MediaItem[] -> 게시할 트윗 목록.
// 규칙: 같은 groupKey끼리 묶어 종류(이미지/영상) 상관없이 최대 4개 미디어/트윗.
//       그룹은 오래된 날짜부터.
// 주의: 영상 다중/이미지+영상 혼합이 한 트윗에 되는지는 X API가 실제 허용해야 하며,
//       실측(Task 12)에서 확인한다. 미지원이면 이 배칭을 종류별로 되돌린다.
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
    const groupKey = group[0].groupKey;
    for (let i = 0; i < group.length; i += MAX_MEDIA_PER_TWEET) {
      tweets.push({ text, mediaUrls: group.slice(i, i + MAX_MEDIA_PER_TWEET).map(x => x.url), groupKey });
    }
  }
  return tweets;
}
