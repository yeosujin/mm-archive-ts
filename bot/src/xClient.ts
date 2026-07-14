import { TwitterApi } from 'twitter-api-v2';
import type { SendTweetV2Params } from 'twitter-api-v2';
import { loadXConfig } from './config.js';
import { fetchMediaBuffer, guessMimeType } from './media.js';
import type { PlannedThread, PlannedTweet } from './types.js';

const x = loadXConfig();
const client = new TwitterApi({
  appKey: x.appKey,
  appSecret: x.appSecret,
  accessToken: x.accessToken,
  accessSecret: x.accessSecret,
});

// 업로드 준비가 끝난 트윗: 미디어가 media_id 로 치환된 상태
interface UploadedTweet {
  text: string;
  mediaIds: string[];
}

// R2 파일을 받아 X 에 업로드하고 media_id 를 얻는다.
// 영상은 twitter-api-v2 가 청크 업로드 + 처리 완료 폴링을 내부에서 수행한다.
async function uploadTweetMedia(tweet: PlannedTweet): Promise<UploadedTweet> {
  const mediaIds: string[] = [];
  for (const m of tweet.media) {
    const buffer = await fetchMediaBuffer(m.url);
    const mediaType = guessMimeType(m.url, m.kind);
    const mediaCategory = m.kind === 'video' ? 'tweet_video' : 'tweet_image';
    const id = await client.v2.uploadMedia(buffer, {
      media_type: mediaType as never,
      media_category: mediaCategory,
    });
    mediaIds.push(id);
  }
  return { text: tweet.text, mediaIds };
}

// 하나의 트윗을 게시. inReplyTo 가 있으면 답글로.
async function postOne(text: string, mediaIds: string[], inReplyTo?: string): Promise<string> {
  const payload: Partial<SendTweetV2Params> = {};
  if (mediaIds.length > 0) {
    payload.media = { media_ids: mediaIds as [string] };
  }
  if (inReplyTo) {
    payload.reply = { in_reply_to_tweet_id: inReplyTo };
  }
  const res = await client.v2.tweet(text, payload);
  return res.data.id;
}

// media 조합(예: 영상 여러 개/영상+이미지 혼합)을 X 가 거부할 수 있으므로,
// 실패하면 미디어를 1개씩 쪼개 답글로 이어붙이는 fallback.
async function postWithFallback(
  text: string,
  mediaIds: string[],
  inReplyTo?: string,
): Promise<string> {
  try {
    return await postOne(text, mediaIds, inReplyTo);
  } catch (err) {
    if (mediaIds.length <= 1) throw err; // 더 쪼갤 수 없음 → 진짜 실패
    console.warn(
      `  ⚠ 미디어 ${mediaIds.length}개 동시 게시 실패 → 1개씩 분할 재시도 (${errMsg(err)})`,
    );
    let lastId = inReplyTo;
    let firstId: string | undefined;
    for (const id of mediaIds) {
      lastId = await postOne(text, [id], lastId);
      firstId ??= lastId;
    }
    // 분할된 첫 트윗 id 를 이 "논리적 트윗"의 대표 id 로 반환
    return firstId as string;
  }
}

// 스레드 하나 게시 (root → reply 체인)
async function publishThread(thread: PlannedThread): Promise<void> {
  console.log(`▸ 스레드 게시: [${thread.label}] (트윗 ${thread.tweets.length}개)`);
  let prevId: string | undefined;
  for (let i = 0; i < thread.tweets.length; i++) {
    const tw = thread.tweets[i]!;
    const uploaded = await uploadTweetMedia(tw);
    prevId = await postWithFallback(uploaded.text, uploaded.mediaIds, prevId);
    console.log(`   ✓ ${i + 1}/${thread.tweets.length} 게시됨 (id=${prevId})`);
  }
}

// 여러 스레드를 순서대로 게시. 각 스레드는 서로 독립(답글 아님).
export async function publishThreads(threads: PlannedThread[]): Promise<void> {
  for (const thread of threads) {
    try {
      await publishThread(thread);
    } catch (err) {
      // 한 스레드 실패가 전체를 막지 않도록 격리
      console.error(`✖ 스레드 [${thread.label}] 게시 실패: ${errMsg(err)}`);
    }
  }
}

function errMsg(err: unknown): string {
  if (err && typeof err === 'object' && 'data' in err) {
    try {
      return JSON.stringify((err as { data: unknown }).data);
    } catch {
      /* noop */
    }
  }
  return err instanceof Error ? err.message : String(err);
}
