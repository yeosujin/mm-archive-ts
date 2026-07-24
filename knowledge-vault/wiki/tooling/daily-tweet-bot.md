---
type: tooling
status: stable
tags: [tooling, bot, automation]
created: 2026-07-24
updated: 2026-07-24
---

# 그해오늘 X 봇

매일 KST 자정에 "오늘과 같은 월/일의 과거 콘텐츠"를 X(Twitter)에 자동 게시한다.

- 코드: `scripts/dailyTweet/`
- 워크플로: `.github/workflows/daily-tweet.yml`

개념 정의는 [[on-this-day]], 홈 화면의 같은 규칙은 [[home-calendar]].

## 모듈

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

## 게시 대상

- **R2에 올라간 미디어만.** 외부 URL(YouTube, 트위터 임베드 등)은 X에 업로드할 수 없어 제외된다 → [[r2-media-pipeline]]
- 대상: 사진([[photos]]), 순간([[videos-moments]]의 Moments), 포스트([[posts]])의 미디어
- **영상(Videos)은 제외 대상**이다. dry-run에서는 "왜 안 올라갔는지" 확인용으로만 출력된다
- 모먼트는 상위 영상이 있으면 **상위 영상 날짜**로 판정한다. 독립 모먼트는 자기 날짜 기준 → [[content-date-semantics]]

## 캡션 규칙 (`text.ts`)

```
사진    250724 제목            제목 끝의 -1, -2 접미사 제거
포스트  250724 제목            제목 앞 연도 prefix 제거 ('2025 생일' → '생일')
모먼트  250724 유튜브
        슈일릿 EP.12           1줄=날짜+플랫폼, 2줄=제목(상위 영상 제목, 없으면 모먼트 제목)
```

모든 트윗 끝에 빈 줄 하나 뒤 `#그해오늘`이 붙는다. 플랫폼 라벨은 한글(유튜브/위버스/인스타그램/트위터), '기타'면 `platform_name`.

같은 `groupKey`(종류|제목|날짜)끼리만 스레드로 이어지고, 다른 그룹은 독립 트윗으로 나간다. 그룹은 오래된 날짜부터.

## 스케줄

cron `50 12 * * *` (UTC) = **KST 21:50**. 자정 게시인데 2시간 이상 일찍 트리거하는 이유와 두 가지 가드는 → [[scheduled-job-drift-compensation]], 결정 경위는 → [[bot-early-trigger-midnight-wait]]

## 실행

```bash
npm run tweet:dry                             # dry-run — 계획만 출력, 게시 안 함
npx tsx scripts/dailyTweet/index.ts           # 실제 게시
npx tsx scripts/dailyTweet/index.ts --force   # 중복 방지 무시하고 재게시
```

dry-run은 종류별 매칭 건수, R2 여부, 영상별 연결 순간까지 진단 출력한다.

## 필요한 시크릿

GitHub Actions Secrets: `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_R2_*` 5종, `X_APP_KEY`, `X_APP_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`, `DISCORD_WEBHOOK_URL` → [[env-vars]]

## 관련
- [[x-api]] · [[on-this-day]] · [[scheduled-job-drift-compensation]] · [[content-date-semantics]] · [[env-vars]]
