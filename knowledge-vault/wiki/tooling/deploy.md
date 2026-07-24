---
type: tooling
status: stable
enforcement: must
tags: [tooling, deploy]
created: 2026-07-24
updated: 2026-07-24
---

# 배포

**`main` 브랜치 푸시 = [[vercel]] 자동 배포.** blast radius가 크다. 작업은 `develop`에서 하고 배포할 때만 머지한다 → [[git-and-version]]

## 절차

```bash
git push origin develop
git checkout main
git pull origin main --ff-only
git merge develop --no-ff -m "Merge develop into main"
git push origin main      # ← 여기서 배포 트리거
git checkout develop
```

`.claude/commands/deploy.md`에 슬래시 커맨드로 정의돼 있다("배포해줘" 트리거). 커맨드는 사전 확인 → 커밋(필요 시 버전 bump) → 위 시퀀스 → 결과 보고 순서로 돈다.

## deploy-guard

`.claude/skills/deploy-guard/` — main 푸시 직전 검증 스킬.

| 구분 | 항목 |
|---|---|
| 블로커 | 빌드(`npm run build`), 린트(`npm run lint`), 시크릿 노출 |
| 확인 요청 | 버전 갱신, 문서 동기화, 콘솔 로그 잔존, 모바일 확인 |

feature/develop 브랜치 푸시에는 개입하지 않는다.

## 주의

- 머지·푸시 중 충돌이 나면 임의로 해결하지 말고 멈춘다
- 배포 후 확인은 서비스워커 때문에 새로고침 두 번 → [[pwa-setup]]

## 관련
- [[git-and-version]] · [[vercel]] · [[pwa-setup]] · [[stack]]
