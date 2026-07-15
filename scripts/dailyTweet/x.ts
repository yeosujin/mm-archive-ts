import { TwitterApi, type SendTweetV2Params } from 'twitter-api-v2';

export function makeXClient(): TwitterApi {
  return new TwitterApi({
    appKey: process.env.X_APP_KEY!,
    appSecret: process.env.X_APP_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessSecret: process.env.X_ACCESS_SECRET!,
  });
}

// 미디어 업로드. 영상은 라이브러리가 청크 업로드/처리 폴링을 자동 처리한다.
export async function uploadMedia(client: TwitterApi, buffer: Buffer, mimeType: string): Promise<string> {
  return client.v1.uploadMedia(buffer, { mimeType });
}

export type PreparedTweet = { text: string; mediaIds: string[]; groupKey: string };

// 게시. 같은 groupKey끼리는 직전 트윗에 답글로 이어(쓰레드), 그룹이 바뀌면
// 답글 연결을 끊어 독립 트윗으로 올린다. 게시된 트윗 id 배열 반환.
export async function postThread(client: TwitterApi, tweets: PreparedTweet[]): Promise<string[]> {
  const ids: string[] = [];
  let replyTo: string | undefined;
  let prevGroup: string | undefined;
  for (const t of tweets) {
    if (t.groupKey !== prevGroup) replyTo = undefined; // 새 그룹 = 독립 트윗
    prevGroup = t.groupKey;
    const payload: SendTweetV2Params = {
      media: { media_ids: t.mediaIds as [string] },
    };
    if (replyTo) payload.reply = { in_reply_to_tweet_id: replyTo };
    try {
      const res = await client.v2.tweet(t.text, payload);
      replyTo = res.data.id;
      ids.push(res.data.id);
    } catch (e) {
      console.error(`[bot] 트윗 실패(스킵): "${t.text}"`, e);
    }
  }
  return ids;
}
