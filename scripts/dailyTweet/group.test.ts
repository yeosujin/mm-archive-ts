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
  it('같은 그룹 이미지는 4장씩 묶는다', () => {
    const items: MediaItem[] = ['a', 'b', 'c', 'd', 'e'].map(u =>
      img(u, 'g1', '2022-07-14', '220714 생일'));
    const tweets = planTweets(items);
    expect(tweets).toHaveLength(2);
    expect(tweets[0].mediaUrls).toEqual(['a', 'b', 'c', 'd']);
    expect(tweets[1].mediaUrls).toEqual(['e']);
    expect(tweets[0].text).toBe('220714 생일');
  });

  it('영상은 1개당 1트윗, 이미지와 안 섞인다', () => {
    const items: MediaItem[] = [
      img('i1', 'g1', '2022-07-14', '220714 생일'),
      img('i2', 'g1', '2022-07-14', '220714 생일'),
      vid('v1', 'g1', '2022-07-14', '220714 생일'),
    ];
    const tweets = planTweets(items);
    expect(tweets).toHaveLength(2);
    expect(tweets[0].mediaUrls).toEqual(['i1', 'i2']);
    expect(tweets[1].mediaUrls).toEqual(['v1']);
  });

  it('오래된 날짜 그룹이 먼저 온다', () => {
    const items: MediaItem[] = [
      img('new', 'g2022', '2022-07-14', '220714 A'),
      img('old', 'g2020', '2020-07-14', '200714 B'),
    ];
    const tweets = planTweets(items);
    expect(tweets[0].text).toBe('200714 B');
    expect(tweets[1].text).toBe('220714 A');
  });
});
