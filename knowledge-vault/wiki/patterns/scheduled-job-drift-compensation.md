---
type: pattern
status: stable
enforcement: should
tags: [pattern, ci, scheduling]
created: 2026-07-24
updated: 2026-07-24
---

# 스케줄 지연 보정

## 해결하는 문제

정확한 시각에 실행돼야 하는 작업을 **지연이 보장되지 않는 스케줄러** 위에서 돌려야 한다.

GitHub Actions의 `schedule` 트리거는 명시한 시각을 보장하지 않는다. 이 저장소에서는 상습적으로 60~90분 지연이 관측됐다. 자정 게시를 목표로 자정 직전에 cron을 걸었더니 실제 게시는 새벽 1시를 넘겼고, cron을 앞당기면 이번엔 자정 전에 게시됐다.

## 구조

**트리거는 넉넉히 일찍, 실제 실행은 스크립트가 대기해서 맞춘다.**

```
cron: '50 12 * * *'  (UTC) = KST 21:50   ← 목표보다 2시간 10분 이르게 트리거
        ↓
스크립트 시작
        ↓
msUntilKstMidnight() 계산
        ↓
대기 ────────────────────→ KST 00:00 정각에 게시
```

지연이 얼마나 발생하든 목표 시각 이전에만 시작하면 결과는 항상 정확하다. 스케줄러의 부정확성을 **버퍼로 흡수**한다.

## 필수 가드 두 가지

그냥 대기만 넣으면 두 가지로 망가진다.

**1. 상한(`MAX_WAIT_MS`)** — 이미 목표 시각을 지나 시작하면 대기값이 "다음 날 자정까지"로 계산되어 24시간 가까이 잠든다. 상한(3시간)을 넘으면 대기 없이 즉시 실행한다.

**2. 스케줄 실행일 때만 대기** — 수동 실행이나 로컬에서도 자정까지 기다리면 디버깅이 불가능하다.

```typescript
if (process.env.GITHUB_EVENT_NAME === 'schedule') {
  const wait = msUntilKstMidnight()
  if (wait <= MAX_WAIT_MS) await sleep(wait)
}
```

## 주의

- **대기 시간 동안 러너가 점유된다.** 매일 2시간씩 쓰면 Actions 분 소모가 상당하다. 지연 폭이 작아지면 트리거 시각을 좁히는 편이 낫다
- cron은 UTC 기준이다. KST 시각에서 9시간을 빼서 적는다

결정 경위 → [[bot-early-trigger-midnight-wait]]

## 관련
- [[daily-tweet-bot]] · [[bot-early-trigger-midnight-wait]]
