---
type: meta
title: "Log"
created: 2026-07-24
updated: 2026-07-24
tags: [meta, log]
---

# Log

append-only. **새 항목은 최상단.**

---

## 2026-07-24 — vault 최초 구축

**입력** — `.raw/sources/project-docs-2026-07-24.md` (691줄, md5 `81994bb9...`). `CLAUDE.md` + `docs/{DOMAIN,STRUCTURE,STACK,API,AUTOMATION}.md`를 코드 대조로 다시 쓴 스냅샷.

**생성** — 54페이지 (dead link 0)

| 폴더 | 수 | 비고 |
|---|---|---|
| domains | 9 + index | |
| architecture | 5 + index | |
| patterns | 5 + index | |
| convention | 3 + index | |
| decisions | 5 + index | 4개는 사후 복원 |
| tooling | 6 + index | |
| concepts | 2 + index | |
| entities | 6 + index | |
| meta/root | conventions, index, overview, hot, log | |

**결정 사항**

- one-fe의 `knowledge-vault`를 참고하되 retrieve 파이프라인·hooks·path-scoped rules는 **의도적으로 제외**했다. 이유와 목록은 [[conventions|meta/conventions]]의 "이 vault에서 안 하는 것"에 있다
- `docs/`의 5개 문서를 vault로 흡수하고 `docs/superpowers/`만 남긴다
- 중앙 `~/wiki`에서 mm-archive 페이지를 제거한다. one-fe와 같은 취급 — 큰 프로젝트는 저장소 안에 vault를 둔다

**코드 대조 중 확인한 사실**

- service-role 키 사용처는 4곳뿐이고, **어드민 화면도 anon 키로 직접 쓴다.** 어드민 비밀번호는 UI 게이트일 뿐이라 RLS가 유일한 방어선 → [[supabase-key-boundary]]
- `rag-answer` / `askArchive`는 완성돼 있으나 UI에서 호출되지 않는다
- `articles_visible`는 5개 화면에서 각각 읽어 개별적으로 가린다 → [[settings]]
- `supabase/migrations/`가 없고 `supabase/sql/`에 날짜 파일 2개만 있다 → [[no-migration-tool]]
