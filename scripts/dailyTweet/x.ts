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

/**
 * 미디어가 너무 많아 거절됐을 때 쪼개는 단위.
 * 2026-11-12 상향 전까지 X가 보장하던 개수이자 docs.x.com에 아직 적혀 있는 값이다.
 */
export const MEDIA_FALLBACK_CHUNK = 4;

/**
 * "미디어 개수 때문에 거절된 것 같은" 응답인지.
 *
 * X는 상한 초과를 전용 에러 코드로 주지 않아서 문구로 특정할 수 없다. 대신
 * 4개를 넘겨 보냈는데 4xx가 왔다는 조합으로 판단한다. 4개 이하면 원인이 다른 것이므로
 * 재시도하지 않고, 5xx(서버 장애)·401(인증)도 쪼갠다고 풀리지 않으니 제외한다.
 */
function looksLikeTooManyMedia(e: unknown, mediaCount: number): boolean {
  if (mediaCount <= MEDIA_FALLBACK_CHUNK) return false;
  const err = e as { code?: number; data?: { status?: number } };
  const status = err?.code ?? err?.data?.status;
  return status === 400 || status === 403 || status === 422;
}

// 트윗 1개 게시. 성공하면 id를 돌려준다.
async function postOne(
  client: TwitterApi,
  text: string,
  mediaIds: string[],
  replyTo: string | undefined,
): Promise<string> {
  const payload: SendTweetV2Params = {
    media: { media_ids: mediaIds as [string] },
  };
  if (replyTo) payload.reply = { in_reply_to_tweet_id: replyTo };
  const res = await client.v2.tweet(text, payload);
  // 게시된 트윗 id를 반드시 남긴다.
  // API가 성공을 반환해도 X가 나중에 트윗을 내리는 경우가 있어서,
  // id가 없으면 "무엇이 사라졌는지" 사후 확인이 불가능하다.
  console.log(
    `[bot] 게시됨 id=${res.data.id} 미디어 ${mediaIds.length}개` +
      `${replyTo ? ` (답글→${replyTo})` : ' (스레드 시작)'} ${tweetUrl(res.data.id)}`,
  );
  return res.data.id;
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
    try {
      replyTo = await postOne(client, t.text, t.mediaIds, replyTo);
      ids.push(replyTo);
      continue;
    } catch (e) {
      if (!looksLikeTooManyMedia(e, t.mediaIds.length)) {
        const reason = describeError(e);
        failures.push(reason);
        console.error(`[bot] 트윗 실패(스킵): "${t.text}" — ${reason}`, e);
        continue;
      }
      // 상한 상향(4→20)을 아직 안 받는 계정/엔드포인트일 수 있다.
      // 업로드된 media_id는 그대로 쓸 수 있으므로 4개씩 쪼개 스레드로 이어 붙인다.
      console.warn(
        `[bot] 미디어 ${t.mediaIds.length}개가 거절됨 (${describeError(e)})` +
          ` → ${MEDIA_FALLBACK_CHUNK}개씩 나눠 재시도`,
      );
    }
    for (let i = 0; i < t.mediaIds.length; i += MEDIA_FALLBACK_CHUNK) {
      const chunk = t.mediaIds.slice(i, i + MEDIA_FALLBACK_CHUNK);
      try {
        replyTo = await postOne(client, t.text, chunk, replyTo);
        ids.push(replyTo);
      } catch (e) {
        // 쪼개도 실패하면 원인이 미디어 개수가 아니다. 남은 조각은 포기한다.
        const reason = describeError(e);
        failures.push(reason);
        console.error(`[bot] 분할 재시도도 실패(스킵): "${t.text}" — ${reason}`, e);
        break;
      }
    }
  }
  return { ids, failures };
}
