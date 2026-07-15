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
      { text: '220714 A', mediaIds: ['m1'] },
      { text: '220714 B', mediaIds: ['m2'] }, // 실패
      { text: '220714 C', mediaIds: ['m3'] },
    ]);
    expect(ids).toEqual(['id1', 'id2']);
    // C는 실패한 B가 아니라 마지막 성공(A=id1)에 답글로 연결
    expect(calls[2].payload.reply.in_reply_to_tweet_id).toBe('id1');
  });

  it('첫 트윗은 reply 없이 게시', async () => {
    const { client, calls } = fakeClient('___none___');
    await postThread(client, [{ text: 'A', mediaIds: ['m1'] }]);
    expect(calls[0].payload.reply).toBeUndefined();
  });
});
