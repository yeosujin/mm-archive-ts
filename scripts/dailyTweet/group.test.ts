import { describe, it, expect } from 'vitest';
import { planTweets } from './group';
import type { MediaItem } from './normalize';

function img(url: string, key: string, date: string, text: string): MediaItem {
  return { contentType: 'photo', mediaType: 'image', url, date, groupKey: key, text };
}
function vid(url: string, key: string, date: string, text: string): MediaItem {
  return { contentType: 'moment', mediaType: 'video', url, date, groupKey: key, text };
}

describe('planTweets', () => {
  it('같은 그룹은 종류 상관없이 4개씩 묶는다', () => {
    const items: MediaItem[] = ['a', 'b', 'c', 'd', 'e'].map(u =>
      img(u, 'g1', '2022-07-14', '220714 생일'));
    const tweets = planTweets(items);
    expect(tweets).toHaveLength(2);
    expect(tweets[0].mediaUrls).toEqual(['a', 'b', 'c', 'd']);
    expect(tweets[1].mediaUrls).toEqual(['e']);
    expect(tweets[0].text).toBe('220714 생일\n\n#그해오늘');
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
