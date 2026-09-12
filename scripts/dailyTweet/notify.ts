// 디스코드 알림. DISCORD_WEBHOOK_URL이 없으면 조용히 건너뛴다(선택 기능).

// 게시 요약 메시지 생성 (순수)
// 링크를 함께 실어 나중에 트윗이 사라졌는지 바로 확인할 수 있게 한다.
export function buildSummary(
  postedCount: number,
  tweetTexts: string[],
  tweetUrls: string[] = [],
): string {
  const list = tweetTexts
    .map((t, i) => (tweetUrls[i] ? `• ${t} → ${tweetUrls[i]}` : `• ${t}`))
    .join('\n');
  return `📮 그 해 오늘 트윗 ${postedCount}개 게시 완료\n${list}`;
}

/**
 * 실패/부분실패 알림 메시지 (순수).
 * 성공했을 때만 알림을 보내면 "조용한 실패"를 알아챌 수 없다.
 * 실제로 X API 503·401 장애 때 아무 연락 없이 게시가 누락된 적이 있다.
 */
export function buildFailureSummary(
  runDate: string,
  planned: number,
  posted: number,
  reasons: string[] = [],
): string {
  const head =
    posted === 0
      ? `🚨 그 해 오늘 트윗 게시 실패 (${runDate})`
      : `⚠️ 그 해 오늘 트윗 일부만 게시 (${runDate})`;
  // 같은 사유가 반복되면 한 번만, 너무 길어지지 않게 5개까지
  const uniq = [...new Set(reasons)].slice(0, 5);
  const why = uniq.length > 0 ? `\n원인: ${uniq.join(' / ')}` : '';
  // 0개면 tweet_bot_log를 남기지 않으므로 예비 스케줄이 재시도한다.
  const retry = posted === 0 ? '\n↻ 기록을 남기지 않아 예비 스케줄이 자동 재시도합니다.' : '';
  return `${head}\n계획 ${planned}개 중 ${posted}개 게시${why}${retry}`;
}

/** 봇이 예외로 죽었을 때의 알림 메시지 (순수) */
export function buildCrashSummary(runDate: string, reason: string): string {
  return `🚨 그 해 오늘 봇이 중단됐습니다 (${runDate})\n원인: ${reason}`;
}

/**
 * 웹훅 전송 (best-effort: 실패해도 봇을 중단시키지 않음).
 * 응답 상태를 반드시 확인한다 — 채널이 삭제되면 웹훅도 삭제돼 404가 오는데,
 * fetch는 404를 정상 완료로 취급하므로 확인하지 않으면 알림이 끊긴 걸 영영 모른다.
 */
async function sendDiscord(content: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const hint = res.status === 404 ? ' (웹훅/채널이 삭제된 것으로 보입니다)' : '';
      console.error(`[bot] 디스코드 알림 실패: HTTP ${res.status}${hint} ${body.slice(0, 200)}`);
    }
  } catch (e) {
    console.error('[bot] 디스코드 알림 실패(무시):', e);
  }
}

/** 게시 성공 요약 */
export async function notifyDiscord(
  postedCount: number,
  tweetTexts: string[],
  tweetUrls: string[] = [],
): Promise<void> {
  await sendDiscord(buildSummary(postedCount, tweetTexts, tweetUrls));
}

/** 실패·부분실패·중단 등 경고 알림 */
export async function notifyDiscordAlert(message: string): Promise<void> {
  await sendDiscord(message);
}
