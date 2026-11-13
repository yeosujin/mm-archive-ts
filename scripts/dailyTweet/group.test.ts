import { describe, it, expect } from 'vitest';
import { planTweets, MAX_MEDIA_PER_TWEET } from './group';
import type { MediaItem } from './normalize';

function img(url: string, key: string, date: string, text: string): MediaItem {
  return { contentType: 'photo', mediaType: 'image', url, date, groupKey: key, text };
}
function vid(url: string, key: string, date: string, text: string): MediaItem {
  return { contentType: 'moment', mediaType: 'video', url, date, groupKey: key, text };
}

describe('planTweets', () => {
  it('미디어 5개는 더 이상 쪼개지 않고 한 트윗에 들어간다 (상한 20)', () => {
    const items: MediaItem[] = ['a', 'b', 'c', 'd', 'e'].map(u =>
      img(u, 'g1', '2022-07-14', '220714 생일'));
    const tweets = planTweets(items);
    expect(tweets).toHaveLength(1);
    expect(tweets[0].mediaUrls).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(tweets[0].text).toBe('220714 생일\n\n#그해오늘');
  });

  it('상한을 넘으면 그때 나눈다 (21개 → 20 + 1)', () => {
    const urls = Array.from({ length: 21 }, (_, i) => `u${i}`);
    const items: MediaItem[] = urls.map(u => img(u, 'g1', '2022-07-14', '220714 생일'));
    const tweets = planTweets(items);
    expect(tweets).toHaveLength(2);
    expect(tweets[0].mediaUrls).toHaveLength(MAX_MEDIA_PER_TWEET);
    expect(tweets[1].mediaUrls).toEqual(['u20']);
    // 나뉘어도 같은 그룹이라 스레드로 이어진다
    expect(tweets[0].groupKey).toBe(tweets[1].groupKey);
  });

  it('maxMedia를 넘기면 그 값으로 나눈다', () => {
    const items: MediaItem[] = ['a', 'b', 'c'].map(u => img(u, 'g1', '2022-07-14', '220714 생일'));
    const tweets = planTweets(items, 2);
    expect(tweets.map(t => t.mediaUrls)).toEqual([['a', 'b'], ['c']]);
  });

  it('영상 4개도 한 트윗에 들어간다', () => {
    const items: MediaItem[] = ['v1', 'v2', 'v3', 'v4'].map(u =>
      vid(u, 'g1', '2024-07-15', '240715 유튜브'));
    const tweets = planTweets(items);
    expect(tweets).toHaveLength(1);
    expect(tweets[0].mediaUrls).toEqual(['v1', 'v2', 'v3', 'v4']);
    expect(tweets[0].text).toBe('240715 유튜브\n\n#그해오늘');
  });

  it('이미지+영상 혼합도 한 그룹이면 함께 묶는다', () => {
    const items: MediaItem[] = [
      img('i1', 'g1', '2025-10-10', '251010 생일'),
      vid('v1', 'g1', '2025-10-10', '251010 생일'),
      img('i2', 'g1', '2025-10-10', '251010 생일'),
    ];
    const tweets = planTweets(items);
    expect(tweets).toHaveLength(1);
    expect(tweets[0].mediaUrls).toEqual(['i1', 'v1', 'i2']);
  });

  it('오래된 날짜 그룹이 먼저 온다', () => {
    const items: MediaItem[] = [
      img('new', 'g2022', '2022-07-14', '220714 A'),
      img('old', 'g2020', '2020-07-14', '200714 B'),
    ];
    const tweets = planTweets(items);
    expect(tweets[0].text).toBe('200714 B\n\n#그해오늘');
    expect(tweets[1].text).toBe('220714 A\n\n#그해오늘');
  });

  it('각 트윗에 groupKey가 실려 그룹 구분이 유지된다', () => {
    const items: MediaItem[] = [
      img('a', 'g2020', '2020-07-14', '200714 A'),
      img('b', 'g2022', '2022-07-14', '220714 B'),
    ];
    const tweets = planTweets(items);
    expect(tweets[0].groupKey).toBe('g2020');
    expect(tweets[1].groupKey).toBe('g2022');
  });
});
