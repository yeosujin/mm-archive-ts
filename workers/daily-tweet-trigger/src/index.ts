/**
 * mmemory 자동 트윗 정시 트리거 (Cloudflare Worker)
 *
 * 왜 필요한가:
 *   GitHub Actions의 schedule(cron) 디스패치는 지연이 크고 불규칙하다.
 *   실측상 상시 60~90분, 2026-08-27~29에는 10시간 가까이 밀리거나 아예 뜨지 않았다.
 *   반면 workflow_dispatch / repository_dispatch는 즉시 실행된다.
 *   그래서 "정시에 깨우는 역할"만 Cloudflare Cron이 맡고,
 *   실제 게시는 기존 GitHub Actions 워크플로가 그대로 수행한다.
 *
 * 하는 일:
 *   매일 15:00 UTC(= KST 자정)에 GitHub repository_dispatch를 쏜다.
 *   워크플로가 이를 받아 즉시 daily tweet 스크립트를 실행한다.
 *   (스크립트의 '자정까지 대기' 로직은 schedule 이벤트에서만 동작하므로,
 *    repository_dispatch로 들어오면 대기 없이 바로 게시된다 — 이미 자정이므로 의도대로다.)
 */

export interface Env {
  /** GitHub PAT. repository_dispatch 권한 필요 (아래 README 참고). wrangler secret으로 주입. */
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  /** 워크플로가 수신할 이벤트 타입. 기본 'daily-tweet' */
  EVENT_TYPE?: string;
  /** 설정 시 실패를 디스코드로 알린다. (선택) */
  DISCORD_WEBHOOK_URL?: string;
  /** 설정 시 GET /trigger?secret=... 수동 트리거를 허용한다. (선택) */
  TRIGGER_SECRET?: string;
}

const MAX_ATTEMPTS = 4;

/** GitHub repository_dispatch 전송. 실패하면 지수 백오프로 재시도. */
async function dispatch(env: Env, payload: Record<string, unknown> = {}): Promise<void> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`;
  const body = JSON.stringify({
    event_type: env.EVENT_TYPE || 'daily-tweet',
    client_payload: payload,
  });

  let lastError = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          // GitHub API는 User-Agent가 없으면 403을 준다.
          'User-Agent': 'mmemory-daily-tweet-trigger',
          'Content-Type': 'application/json',
        },
        body,
      });

      if (res.status === 204) {
        console.log(`[trigger] dispatch 성공 (attempt ${attempt})`);
        return;
      }

      // 4xx는 설정 오류(토큰 권한 등)라 재시도해도 소용없다. 단 429는 예외.
      lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new Error(lastError);
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // 설정 오류는 즉시 중단
      if (lastError.startsWith('HTTP 4') && !lastError.startsWith('HTTP 429')) break;
    }

    if (attempt < MAX_ATTEMPTS) {
      const backoff = 2 ** attempt * 1000; // 2s, 4s, 8s
      console.warn(`[trigger] 실패(attempt ${attempt}) → ${backoff}ms 후 재시도: ${lastError}`);
      await new Promise(r => setTimeout(r, backoff));
    }
  }

  await notifyFailure(env, lastError);
  throw new Error(`dispatch 최종 실패: ${lastError}`);
}

/** 실패 시에만 알림 (성공 알림은 봇 자체가 이미 보낸다) */
async function notifyFailure(env: Env, reason: string): Promise<void> {
  if (!env.DISCORD_WEBHOOK_URL) return;
  try {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `⚠️ 자동 트윗 트리거 실패 — GitHub dispatch가 나가지 않았습니다.\n\`${reason}\``,
      }),
    });
  } catch (err) {
    console.error('[trigger] 디스코드 알림 실패:', err);
  }
}

export default {
  /** Cron 트리거: wrangler.toml의 crons 설정에 따라 호출된다. */
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[trigger] cron=${event.cron} at ${new Date(event.scheduledTime).toISOString()}`);
    ctx.waitUntil(dispatch(env));
  },

  /** 수동 확인용. TRIGGER_SECRET을 설정한 경우에만 열린다. */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/trigger') return new Response('Not found', { status: 404 });
    // 시크릿 미설정이면 엔드포인트 자체를 비활성화 (실수로 공개되는 것 방지)
    if (!env.TRIGGER_SECRET) return new Response('Not found', { status: 404 });
    if (url.searchParams.get('secret') !== env.TRIGGER_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    const dryRun = url.searchParams.get('dry_run') === 'true';
    try {
      await dispatch(env, dryRun ? { dry_run: true } : {});
      return new Response(`dispatched${dryRun ? ' (dry-run)' : ''}\n`);
    } catch (err) {
      return new Response(`failed: ${err instanceof Error ? err.message : String(err)}\n`, {
        status: 502,
      });
    }
  },
};
