import { describe, it, expect } from 'vitest';
import { postThread } from './x';
import type { TwitterApi } from 'twitter-api-v2';

// v2.tweet만 흉내내는 가짜 클라이언트 (failOnText 텍스트면 throw)
function fakeClient(failOnText: string) {
  const calls: { text: string; payload: any }[] = [];
  let counter = 0;
  const client = {
    v2: {
      tweet: async (text: string, payload: any) => {
        calls.push({ text, payload });
        if (text === failOnText) throw new Error('duplicate content');
        counter += 1;
        return { data: { id: `id${counter}` } };
      },
    },
  } as unknown as TwitterApi;
  return { client, calls };
}

describe('postThread', () => {
  it('중간 트윗이 실패해도 나머지는 계속 게시하고 성공한 id만 반환', async () => {
    const { client, calls } = fakeClient('220714 B');
    const ids = await postThread(client, [
      { text: '220714 A', mediaIds: ['m1'], groupKey: 'g1' },
      { text: '220714 B', mediaIds: ['m2'], groupKey: 'g1' }, // 실패
      { text: '220714 C', mediaIds: ['m3'], groupKey: 'g1' },
    ]);
    expect(ids).toEqual(['id1', 'id2']);
    // 같은 그룹 C는 실패한 B가 아니라 마지막 성공(A=id1)에 답글로 연결
    expect(calls[2].payload.reply.in_reply_to_tweet_id).toBe('id1');
  });

  it('첫 트윗은 reply 없이 게시', async () => {
    const { client, calls } = fakeClient('___none___');
    await postThread(client, [{ text: 'A', mediaIds: ['m1'], groupKey: 'g1' }]);
    expect(calls[0].payload.reply).toBeUndefined();
  });

  it('그룹이 다르면 쓰레드로 안 잇고 각각 독립 트윗', async () => {
    const { client, calls } = fakeClient('___none___');
    await postThread(client, [
      { text: '200714 A', mediaIds: ['m1'], groupKey: 'g2020' },
      { text: '220714 B', mediaIds: ['m2'], groupKey: 'g2022' }, // 다른 그룹
    ]);
    expect(calls[0].payload.reply).toBeUndefined();
    expect(calls[1].payload.reply).toBeUndefined(); // 독립 (reply 없음)
  });

  it('같은 그룹의 여러 트윗은 쓰레드로 이어진다', async () => {
    const { client, calls } = fakeClient('___none___');
    await postThread(client, [
      { text: '251010 생일', mediaIds: ['m1'], groupKey: 'g1' },
      { text: '251010 생일', mediaIds: ['m2'], groupKey: 'g1' }, // 같은 그룹 (미디어 5개 이상)
    ]);
    expect(calls[0].payload.reply).toBeUndefined();
    expect(calls[1].payload.reply.in_reply_to_tweet_id).toBe('id1'); // 이어짐
  });
});
