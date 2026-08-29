# 자동 트윗 정시 트리거 (Cloudflare Worker)

매일 **KST 자정(15:00 UTC)**에 GitHub `repository_dispatch`를 쏴서
`.github/workflows/daily-tweet.yml`을 즉시 실행시키는 워커.

## 왜 필요한가

GitHub Actions의 `schedule`(cron) 디스패치는 지연이 크고 불규칙하다. 실측:

| 날짜 | 예정 | 실제 | 결과 |
|---|---|---|---|
| ~2026-08-26 | 12:50 UTC | 13:2x~14:1x | 스크립트가 자정까지 대기 → **00:00 KST 정시 게시** ✅ |
| 2026-08-27 | 12:50 UTC | 22:38 (약 10h 지연) | 대기 상한(3h) 초과 → 07:39 KST 게시 ❌ |
| 2026-08-28 | 12:50 UTC | 22:44 (약 10h 지연) | 07:45 KST 게시 ❌ |
| 2026-08-29 | 12:50 UTC 외 4개 | **아예 안 뜸** | 게시 누락 ❌ |

크론을 여러 개 깔아도 디스패치가 통째로 밀리면 전부 같이 밀려 소용이 없었다.
반면 `workflow_dispatch` / `repository_dispatch`는 **즉시 실행**되는 것이 확인됐다.
그래서 "정시에 깨우는 역할"만 Cloudflare Cron이 맡는다. 게시 로직은 그대로 GitHub Actions에 있다.

```
Cloudflare Cron (15:00 UTC, 정시)
  └─ repository_dispatch: daily-tweet
       └─ GitHub Actions daily-tweet.yml (즉시 실행)
            └─ scripts/dailyTweet/index.ts → X 게시
```

기존 `schedule` 크론들은 **예비 경로로 남겨뒀다.** 워커가 죽어도 늦게나마 그날 몫이 나가고,
워커가 이미 올렸으면 `tweet_bot_log` 중복 방지에 걸려 조용히 스킵된다.

## 설정하는 두 가지 방법

- **A. 대시보드** — CLI 없이 브라우저에서 클릭만. 아래 "대시보드로 설정하기" 참고.
- **B. wrangler CLI** — 코드가 저장소와 함께 관리된다. "CLI로 설정하기" 참고.

둘 중 **하나만** 하면 된다. 공통으로 GitHub 토큰은 먼저 만들어야 한다.

## 1. GitHub 토큰 발급 (공통, 최초 1회)

`repository_dispatch` 권한이 있는 PAT가 필요하다. 둘 중 하나:

- **Fine-grained token** (권장): Repository access → `yeosujin/mm-archive-ts`,
  Permissions → **Contents: Read and write**
- **Classic token**: `repo` 스코프

만료일을 길게 잡고, 만료 전 갱신을 잊지 말 것. (만료되면 워커가 실패 알림을 보낸다)

## 대시보드로 설정하기 (CLI 불필요)

붙여넣을 코드: **`dashboard-paste.js`** (이 폴더에 있음)
저장소 정보가 코드에 들어 있어 **시크릿은 `GITHUB_TOKEN` 하나만** 넣으면 된다.

1. **워커 생성**
   Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Start with Hello World!** → Deploy
   이름은 `mmemory-daily-tweet-trigger` 권장.

2. **코드 붙여넣기**
   생성된 워커 → **Edit code** → 편집기 내용을 전부 지우고
   `dashboard-paste.js` 전체를 붙여넣기 → **Deploy**

3. **토큰 넣기**
   워커 → **Settings** → **Variables and Secrets** → **Add**
   - Type: **Secret**
   - Name: `GITHUB_TOKEN`
   - Value: 위 1단계에서 만든 토큰
   → **Deploy**

   (선택) 같은 방법으로 `DISCORD_WEBHOOK_URL`(실패 알림), `TRIGGER_SECRET`(수동 트리거) 추가.

4. **정시 실행 등록**
   워커 → **Settings** → **Triggers** → **Cron Triggers** → **Add Cron Trigger**
   → `0 15 * * *` 입력 후 저장. (UTC 기준 = KST 자정)

5. **동작 확인**
   `TRIGGER_SECRET`을 넣었다면 브라우저에서:
   `https://<워커주소>/trigger?secret=<TRIGGER_SECRET>&dry_run=true`
   → `dispatched (dry-run)` 이 뜨고, GitHub Actions에 실행이 하나 생기면 성공.

   시크릿을 안 넣었다면 GitHub Actions 탭에서 다음 날 자정 이후 실행이 생겼는지 확인하면 된다.

> `dashboard-paste.js`는 `src/index.ts`와 동작이 같은 사본이다.
> 로직을 고칠 일이 생기면 **두 파일을 같이** 고쳐야 한다.

## CLI로 설정하기

```bash
cd workers/daily-tweet-trigger
npm install
npx wrangler login          # 최초 1회

npx wrangler secret put GITHUB_TOKEN         # 위에서 만든 토큰 붙여넣기
npx wrangler secret put DISCORD_WEBHOOK_URL  # (선택) 트리거 실패 알림
npx wrangler secret put TRIGGER_SECRET       # (선택) 수동 트리거 엔드포인트 활성화

npx wrangler deploy
```

배포 후 Cloudflare 대시보드 → Workers → `mmemory-daily-tweet-trigger` → Settings → Triggers 에서
`0 15 * * *` 크론이 등록됐는지 확인.

### 3. 동작 확인

```bash
# 크론 핸들러를 로컬에서 강제 실행 (실제로 GitHub에 dispatch가 나간다)
npx wrangler dev --test-scheduled
# 다른 터미널에서:
curl "http://localhost:8787/__scheduled?cron=0+15+*+*+*"

# 배포본 로그 실시간 확인
npx wrangler tail
```

`TRIGGER_SECRET`을 설정했다면 HTTP로도 확인 가능:

```bash
# 게시 없이 계획만 확인
curl "https://<워커주소>/trigger?secret=<TRIGGER_SECRET>&dry_run=true"

# 실제 게시
curl "https://<워커주소>/trigger?secret=<TRIGGER_SECRET>"
```

> `TRIGGER_SECRET`을 설정하지 않으면 `/trigger` 엔드포인트는 **404로 비활성화**된다.
> 실수로 공개 URL이 노출돼도 아무나 트리거할 수 없다.

## 설정값

| 이름 | 종류 | 설명 |
|---|---|---|
| `GITHUB_TOKEN` | secret | **필수.** repository_dispatch 권한 토큰 |
| `GITHUB_OWNER` / `GITHUB_REPO` | var | 대상 저장소 (wrangler.toml) |
| `EVENT_TYPE` | var | 워크플로가 받는 이벤트 타입. 기본 `daily-tweet` |
| `DISCORD_WEBHOOK_URL` | secret | 선택. 트리거 **실패 시에만** 알림 |
| `TRIGGER_SECRET` | secret | 선택. `/trigger` 수동 엔드포인트 활성화 |

## 실패 시 동작

- GitHub API 호출 실패 시 **최대 4회** 재시도 (2s → 4s → 8s 백오프)
- 4xx(토큰 권한·설정 오류)는 재시도해도 소용없으므로 즉시 중단 (429 제외)
- 최종 실패하면 `DISCORD_WEBHOOK_URL`로 알림
- 워커가 완전히 실패해도 GitHub `schedule` 예비 크론이 남아 있어 **게시가 누락되지는 않는다** (다만 늦어짐)
