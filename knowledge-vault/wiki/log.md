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

## 2026-10-28 — 전역 네비 통일 + 캘린더 사진 (3단계, 2.0.0 대기)

데스크톱 네비·모바일 ☰ 메뉴 2벌을 헤더 + 상단 글자 탭 한 벌로 합쳤다. 홈의 메뉴 칩 줄 삭제. 도서관은 탭에서 빠지고 라우트만 남았다.
캘린더에 사진 추가(같은 날·같은 제목 묶음, 파란 점). 배포하지 않음 — `yeosujin/v2-ui` 브랜치, 3~5단계는 2.0.0에서 함께 나간다 → [[_index|domains]] · [[settings]] · [[home-calendar]]

---

## 2026-10-28 — 영상 표지 (1.22.0)

`getVideoCover`로 표지 우선순위를 정했다(직접 지정 → 유튜브 → 첫 모먼트). 위버스 공식 썸네일은 어드민 `/admin/covers` 북마클릿으로 채운다.
`/api/r2`에 허용 호스트 전용 `import` 액션 추가, 어드민 로그인은 `localStorage`로 유지 → [[videos-moments]] · [[r2-media-pipeline]]

---

## 2026-10-27 — 영상 트랜스코딩 + r2.dev 주소 정리 (1.21.3)

모먼트·포스트 영상을 H.264 mp4로 변환해 `videos/t/`에 두고 `original_url`에 원래 주소를 남긴다.
r2.dev 주소는 cdn 도메인으로 치환했다(캐시를 타도록). 매시간 Actions가 새 업로드를 처리한다
→ [[r2-media-pipeline]] · [[cloudflare-r2]]

---

## 2026-10-27 — R2 자격증명·어드민 비밀번호를 서버로 이동 (1.21.2)

`VITE_R2_SECRET_ACCESS_KEY`와 `VITE_ADMIN_PASSWORD`가 클라이언트 번들에 들어가 있었다.
새 Vercel Function `api/r2.ts`가 비밀번호 검증(`verify`)·presigned PUT 발급(`presign`)·삭제(`delete`)를 맡는다.
`src/lib/r2Upload.ts`는 S3 클라이언트 대신 이 API를 부르고, `AdminAuth.tsx`는 서버로 비밀번호를 확인한다.
Vercel에 `R2_*`·`ADMIN_PASSWORD`를 넣고 기존 R2 키는 회전해야 한다 → [[env-vars]] · [[cloudflare-r2]] · [[r2-media-pipeline]]

---

## 2026-09-18 — 에피소드에 X 봇 전용 이미지

`episodes.tweet_images`(jsonb, R2 URL 배열) 추가. 어드민에서만 첨부하고 공개 페이지에는
렌더링하지 않는다. [[daily-tweet-bot]]이 "그 해 오늘"에 걸린 에피소드에서 이 배열만 읽어
에피소드 1개 = 트윗 1개로 올린다.

- 마이그레이션 `supabase/sql/2026-09-18-add-episode-tweet-images.sql`
- 새 컴포넌트 `src/components/AdminTweetImages.tsx` (DM/댓글/LP 3종 폼이 공유)
- `normalizeEpisodes` 추가 — 트윗 미디어 순서는 **첨부 → 본문(DM) 이미지**, 중복 URL은 한 번만.
  첨부가 비어 있으면 게시하지 않는다(과거 DM 본문 이미지의 무단 자동 게시 방지)

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
