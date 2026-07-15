// 디스코드 알림. DISCORD_WEBHOOK_URL이 없으면 조용히 건너뛴다(선택 기능).

// 게시 요약 메시지 생성 (순수)
export function buildSummary(postedCount: number, tweetTexts: string[]): string {
  const list = tweetTexts.map(t => `• ${t}`).join('\n');
  return `📮 그 해 오늘 트윗 ${postedCount}개 게시 완료\n${list}`;
}

// 디스코드 웹훅으로 요약 전송 (best-effort: 실패해도 봇을 중단시키지 않음)
export async function notifyDiscord(postedCount: number, tweetTexts: string[]): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: buildSummary(postedCount, tweetTexts) }),
    });
  } catch (e) {
    console.error('[bot] 디스코드 알림 실패(무시):', e);
  }
}
