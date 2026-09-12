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

// 계정 핸들 없이도 열리는 트윗 URL 형식
export function tweetUrl(id: string): string {
  return `https://x.com/i/web/status/${id}`;
}

export type PostThreadResult = {
  /** 게시에 성공한 트윗 id */
  ids: string[];
  /** 실패 사유(트윗별). 알림에 원인을 싣기 위해 수집한다. */
  failures: string[];
};

/**
 * X 에러에서 사람이 읽을 수 있는 한 줄을 뽑는다.
 * 원본 객체는 헤더·쿠키까지 딸려와 알림에 싣기엔 너무 길다.
 * 예) "HTTP 401 Could not authenticate you" / "HTTP 503 Service Unavailable"
 */
export function describeError(e: unknown): string {
  if (e && typeof e === 'object') {
    const err = e as {
      code?: number;
      message?: string;
      errors?: { message?: string }[];
      data?: { status?: number; title?: string; detail?: string };
    };
    const status = err.code ?? err.data?.status;
    const detail = err.errors?.[0]?.message ?? err.data?.detail ?? err.data?.title;
    if (detail) return status ? `HTTP ${status} ${detail}` : detail;
    if (err.message) return err.message;
  }
  return String(e);
}

// 게시. 같은 groupKey끼리는 직전 트윗에 답글로 이어(쓰레드), 그룹이 바뀌면
// 답글 연결을 끊어 독립 트윗으로 올린다. 성공 id와 실패 사유를 함께 반환.
export async function postThread(
  client: TwitterApi,
  tweets: PreparedTweet[],
): Promise<PostThreadResult> {
  const ids: string[] = [];
  const failures: string[] = [];
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
      // 게시된 트윗 id를 반드시 남긴다.
      // API가 성공을 반환해도 X가 나중에 트윗을 내리는 경우가 있어서,
      // id가 없으면 "무엇이 사라졌는지" 사후 확인이 불가능하다.
      console.log(
        `[bot] 게시됨 id=${res.data.id} 미디어 ${t.mediaIds.length}개` +
          `${replyTo ? ` (답글→${replyTo})` : ' (스레드 시작)'} ${tweetUrl(res.data.id)}`,
      );
      replyTo = res.data.id;
      ids.push(res.data.id);
    } catch (e) {
      const reason = describeError(e);
      failures.push(reason);
      console.error(`[bot] 트윗 실패(스킵): "${t.text}" — ${reason}`, e);
    }
  }
  return { ids, failures };
}
