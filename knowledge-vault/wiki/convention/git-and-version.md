---
type: convention
status: stable
enforcement: must
tags: [convention, git, release]
created: 2026-07-24
updated: 2026-07-24
---

# Git 흐름과 버전

## 브랜치

| 브랜치 | 의미 |
|---|---|
| `develop` | 작업 브랜치. 여기서 커밋한다 |
| `main` | **푸시하면 곧 배포다.** Vercel 자동 배포가 걸려 있다 |

`main`에 직접 커밋하지 않는다. `develop` → `main` 머지로만 올라간다.

## 커밋 / 푸시

- 코드 수정 후 **커밋만** 한다. 푸시·머지는 사용자가 명시적으로 요청할 때만
- 배포 절차는 [[deploy]]에 정리돼 있다

## 버전

기능 추가나 주요 스타일 변경 시 `package.json`의 `version`을 올린다.

| 단위 | 기준 |
|---|---|
| patch | 버그 수정, 작은 스타일 변경 |
| minor | 새 기능, 큰 UI 변경 |
| major | 호환성 깨지는 대규모 변경 |

문서만 고치는 커밋은 bump하지 않는다.

## 관련
- [[deploy]] · [[stack]]
