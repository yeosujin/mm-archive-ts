---
type: decision
status: stable
decision_date: unknown
tags: [decision, database, reconstructed]
created: 2026-07-24
updated: 2026-07-24
---

# database.ts 를 도메인별로 분할하고 배럴을 남긴다

> [!note] 사후 복원된 ADR
> 이 결정은 당시 기록이 없어 **코드 형태로부터 역추적**했다. "이렇게 되어 있다"는 확실하고, "왜"는 코드가 그 형태인 가장 그럴듯한 이유다. 당사자 확인 전까지 경위 부분은 추정으로 읽는다.

## 맥락

콘텐츠 도메인이 10종으로 늘면서 DB 접근 함수가 한 파일에 쌓였다. 동시에 앱 전역이 `from '../lib/database'`로 import하고 있었다.

## 결정

구현을 `src/lib/database/`에 도메인별 파일로 분할하고, **`src/lib/database.ts`는 re-export 배럴로 남긴다.**

## 기각한 대안

| 대안 | 기각 이유 |
|---|---|
| 한 파일 유지 | 도메인 10종에서 이미 탐색이 안 됨 |
| 분할 + 전 호출부 import 경로 수정 | 변경 범위가 넓고 되돌리기 어렵다. 이득은 배럴로도 얻는다 |
| 도메인별 훅으로 감싸기 | 이 시점에 필요 없는 추상화 |

## 결과

- 호출부 코드가 한 줄도 안 바뀌었다
- **파일과 디렉토리가 같은 이름이라 처음 보면 구현을 놓친다.** 이 함정은 `CLAUDE.md`에 명시돼 있다
- 배럴은 이름 충돌을 막아 주지 않는다. 도메인 간 함수명이 겹치면 조용히 깨진다

## 관련
- [[domain-per-file-db-layer]] · [[database-layer]] · [[data-model]]
