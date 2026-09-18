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

## 2026-09-18 — 에피소드에 X 봇 전용 이미지

`episodes.tweet_images`(jsonb, R2 URL 배열) 추가. 어드민에서만 첨부하고 공개 페이지에는
렌더링하지 않는다. [[daily-tweet-bot]]이 "그 해 오늘"에 걸린 에피소드에서 이 배열만 읽어
에피소드 1개 = 트윗 1개로 올린다.

- 마이그레이션 `supabase/sql/2026-09-18-add-episode-tweet-images.sql`
- 새 컴포넌트 `src/components/AdminTweetImages.tsx` (DM/댓글/LP 3종 폼이 공유)
- `normalizeEpisodes` 추가 — 본문 `messages`의 image는 사이트용이라 트윗에 쓰지 않는다

**문서 정리** — [[daily-tweet-bot]]의 캡션 규칙(날짜만 남음), `groupKey`(제목→id),
스케줄(Cloudflare Worker 주 경로 + schedule 5개 예비)이 코드와 어긋나 있어 함께 고쳤다.

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
