# 자동화 · 배포

## '그해 오늘' X 자동 게시 봇

매일 KST 자정에 "오늘과 같은 월/일의 과거 콘텐츠"를 X(Twitter)에 자동 게시한다. 코드는 `scripts/dailyTweet/`, 워크플로는 `.github/workflows/daily-tweet.yml`.

### 모듈

| 파일 | 역할 |
|---|---|
| `index.ts` | 오케스트레이터 (조회 → 계획 → 게시) |
| `date.ts` | `getKstDateString`, `msUntilKstMidnight` |
| `fetch.ts` | `fetchAllRows` — Supabase 기본 1000행 제한을 페이지네이션으로 회피 |
| `normalize.ts` | 콘텐츠 → `MediaItem` 정규화, `isR2Url` |
| `group.ts` | `planTweets` — `groupKey`별로 묶어 트윗당 미디어 최대 4개 |
| `text.ts` | 캡션 규칙 + `#그해오늘` 해시태그 |
| `platform.ts` | 상위 영상 플랫폼 → 한글 라벨 |
| `r2.ts` | R2 다운로드, `urlToKey` |
| `x.ts` | 미디어 업로드 + `postThread` |
| `dedup.ts` | `tweet_bot_log` 기반 중복 게시 방지 |
| `notify.ts` | Discord 웹훅 알림 |
| `mime.ts` | URL → MIME 타입 |

각 모듈에 `*.test.ts`가 붙어 있다 (`npm test`).

### 게시 대상

- **R2에 올라간 미디어만.** 외부 URL(YouTube, 트위터 임베드 등)은 X에 업로드할 수 없으므로 제외된다
- 대상 종류: 사진(Photos), 순간(Moments), 포스트(Posts)의 미디어
- **영상(Videos)은 제외 대상**이다. dry-run에서는 "왜 안 올라갔는지" 확인용으로만 출력된다
- 모먼트는 상위 영상이 있으면 **상위 영상 날짜**로 그해오늘 여부를 판정한다 (홈 '그 해 오늘' 섹션과 동일 규칙). 독립 모먼트는 자기 날짜 기준

### 캡션 규칙 (`text.ts`)

```
사진    250724 제목            제목 끝의 -1, -2 접미사 제거
포스트  250724 제목            제목 앞 연도 prefix 제거 ('2025 생일' → '생일')
모먼트  250724 유튜브
        슈일릿 EP.12           1줄=날짜+플랫폼, 2줄=제목(상위 영상 제목, 없으면 모먼트 제목)
```

모든 트윗 끝에 빈 줄 하나 뒤 `#그해오늘`이 붙는다. 플랫폼 라벨은 한글(유튜브/위버스/인스타그램/트위터), '기타'면 `platform_name`.

같은 `groupKey`(종류|제목|날짜)끼리만 스레드로 이어지고, 다른 그룹은 독립 트윗으로 나간다. 그룹은 오래된 날짜부터.

### 스케줄이 21:50인 이유

cron은 UTC `50 12 * * *` = **KST 21:50**에 트리거된다. 자정 게시인데 2시간 이상 일찍 트리거하는 건 GitHub Actions 스케줄 디스패치가 이 저장소에서 상습적으로 60~90분 밀리기 때문이다(실측). 자정 직전 트리거로는 새벽 1시가 넘어 게시됐다.

그래서 트리거만 미리 걸고, 스크립트가 KST 자정까지 대기했다가 게시한다.

- 대기는 `GITHUB_EVENT_NAME === 'schedule'`일 때만. 수동 실행(`workflow_dispatch`)과 로컬은 즉시 진행
- 대기값이 `MAX_WAIT_MS`(3시간)를 넘으면 이미 자정을 지나 시작한 것이므로 즉시 게시

### 실행

```bash
npm run tweet:dry      # dry-run — 계획만 출력, 게시 안 함
npx tsx scripts/dailyTweet/index.ts           # 실제 게시
npx tsx scripts/dailyTweet/index.ts --force   # 중복 방지 무시하고 재게시
```

dry-run은 종류별 매칭 건수, R2 여부, 영상별 연결 순간까지 진단 출력한다.

### 필요한 시크릿

GitHub Actions Secrets에 등록되어 있다: `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_R2_*` 5종, `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`, `DISCORD_WEBHOOK_URL`.

---

## 백필 스크립트

일회성/수동 실행. 로컬에서 `.env`를 읽는다.

| 명령 | 하는 일 |
|---|---|
| `npm run backfill:thumb-hash` | 기존 이미지에 ThumbHash 생성 |
| `npm run backfill:embeddings` | 기존 콘텐츠를 임베딩해 `content_embeddings` 채우기 |
| `npx tsx scripts/remux-r2-videos.ts` | R2 영상 remux |

---

## 배포

`main` 브랜치 푸시 → **Vercel 자동 배포**. blast radius가 크다.

작업은 `develop`에서 하고, 배포할 때만 `main`으로 머지한다.

```bash
git push origin develop
git checkout main
git pull origin main --ff-only
git merge develop --no-ff -m "Merge develop into main"
git push origin main      # ← 여기서 배포 트리거
git checkout develop
```

이 절차는 `.claude/commands/deploy.md`에 슬래시 커맨드로 정의되어 있다("배포해줘" 트리거).

### deploy-guard

`.claude/skills/deploy-guard/` — main 푸시 직전 검증 스킬. 다음을 확인한다.

- **블로커**: 빌드(`npm run build`), 린트(`npm run lint`), 시크릿 노출
- **확인 요청**: 버전 갱신, 문서 동기화, 콘솔 로그 잔존, 모바일 확인

feature/develop 브랜치 푸시에는 개입하지 않는다.
