/**
 * ─────────────────────────────────────────────────────────────
 *  Cloudflare 대시보드 붙여넣기용 (CLI 없이 쓰는 경로)
 * ─────────────────────────────────────────────────────────────
 *
 *  이 파일은 src/index.ts 와 같은 일을 하는 "무의존 단일 JS" 버전이다.
 *  wrangler(CLI)를 쓸 거면 이 파일이 아니라 src/index.ts 가 배포된다.
 *
 *  ⚠️ src/index.ts 의 동작을 바꾸면 이 파일도 같이 고쳐야 한다.
 *
 *  쓰는 법: workers/daily-tweet-trigger/README.md 의 "대시보드로 설정하기" 참고.
 *  대시보드에는 wrangler.toml이 없으므로 저장소 정보는 아래 상수로 박아둔다.
 *  (대시보드 Variables로 덮어쓰고 싶으면 env 값이 우선한다)
 */

const DEFAULTS = {
  GITHUB_OWNER: 'yeosujin',
  GITHUB_REPO: 'mm-archive-ts',
  EVENT_TYPE: 'daily-tweet',
};

const MAX_ATTEMPTS = 4;

/** GitHub repository_dispatch 전송. 실패하면 지수 백오프로 재시도. */
async function dispatch(env, payload = {}) {
  const owner = env.GITHUB_OWNER || DEFAULTS.GITHUB_OWNER;
  const repo = env.GITHUB_REPO || DEFAULTS.GITHUB_REPO;
  const eventType = env.EVENT_TYPE || DEFAULTS.EVENT_TYPE;

  if (!env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN 시크릿이 설정되지 않았습니다.');
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;
  const body = JSON.stringify({ event_type: eventType, client_payload: payload });

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

      lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
      // 4xx는 설정 오류(토큰 권한 등)라 재시도해도 소용없다. 단 429는 예외.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        throw new Error(lastError);
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
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
async function notifyFailure(env, reason) {
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
  /** Cron 트리거 (대시보드 Settings → Triggers 에서 0 15 * * * 등록) */
  async scheduled(event, env) {
    console.log(`[trigger] cron=${event.cron} at ${new Date(event.scheduledTime).toISOString()}`);
    await dispatch(env);
  },

  /** 수동 확인용. TRIGGER_SECRET을 설정한 경우에만 열린다. */
  async fetch(request, env) {
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
