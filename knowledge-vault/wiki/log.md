---
type: meta
title: "Log"
created: 2026-07-24
updated: 2026-10-30
tags: [meta, log]
---

# Log

append-only. **새 항목은 최상단.**

---

## 2026-10-30 — 검색 결과 그리드 (2.2.0)

- 검색 결과를 홈·모먼트와 같은 모양으로: 홈 검색창, 종류 칩, 카드 그리드(종류 섞어 최신순 / AI는 유사도순), 그 자리 팝업 → [[search]]
- 캘린더 카드(`EntryCard`)를 `src/components/EntryCard.tsx`로 빼서 같이 쓴다
- 캘린더·검색에서 연 모먼트 뷰어에 `영상 보기 ›` (영상 상세로, 뒤로가면 모먼트)
- 검색창을 헤더 첫 줄로 (검색 화면에선 로고·아이콘 대신 `←` + 검색창). 헤더 돋보기와 페이지 검색창이 겹쳐 보이던 것 정리
- 검색 화면 탭 줄 숨김 + 빈 검색 '둘러보기' 바로가기 + 결과 끝 '○○ 탭에서 전체 보기'
- 검색창 열림·결과 카드 애니메이션
- AI 모드에 키워드 결과를 앞에 섞음 (키워드로는 나오는데 AI로는 안 나오던 것)
- 홈: 검색창 아래→위 등장 애니메이션 제거, 그 해 오늘 카드 영상 미리보기는 2번 재생 후 썸네일로
- 검색 기본값을 AI로 (`?mode=keyword`로 끔)
- 검색창 자동완성(제목), placeholder 고정 안내, 입력 글자 15px
- 색 역할 정리: 헤더 아이콘·둘러보기 아이콘을 무채색으로 (색은 로고·선택 표시·AI에만) → [[mobile-first-ui]]
- 헤더 왼쪽에 문의(`/ask`) 아이콘 — 로고 줄 좌우 대칭, 어느 화면에서든 문의로
- AI 모드 색을 primary 쪽(파랑→연보라)으로, 상단 탭은 6칸 균등 + 선택 탭 아래 짧은 파랑→보라 막대. 하단 탭은 사용자 의견을 듣고 정하기로 보류(Safari 주소창과 두 줄로 쌓이는 문제)
- 헤더: 로고 가운데 + 돋보기(검색 입구 하나로, 홈 본문 검색창 없앰), 캘린더는 탭으로, 테마 버튼 없앰(기기 설정 따름). 돋보기는 키보드를 먼저 띄우고 검색 화면으로

## 2026-10-30 — develop preview 배포

- `vercel.json`의 develop 배포 끄기 제거. develop 푸시 → `preview.mmemory.cloud` → [[deploy]]

## 2026-10-30 — 캘린더 표지 달력 (2.1.0)

- 점 달력 → 표지 달력: 칸이 그날 표지, 고른 날 카드 레일, 그 날짜 스토리, 연·월 선택(연도 칩 + 12개월)·스와이프 달 이동. 종류별 점 색(`--color-*`)과 드롭다운 연월 선택 제거 → [[home-calendar]]
- 고침: 영상에 딸린 모먼트 링크(`/moments` → `/videos/:video_id?m=`), 오늘 표시가 UTC 기준이던 것(→ 로컬)

## 2026-10-28 — 2.0.0 문서 정리 (v2 UI 3~5단계 반영)

- 홈: 콘텐츠별 그 해 오늘 카드, 스토리 뷰어(`?s=`), 입장 로고, 자동 열기 규칙(진짜 그 해 오늘인 날만, 대체 날은 `?date=`로도 안 엶), 새로 올라온 영상, AI 검색 기본 → [[home-calendar]] · [[on-this-day]]
- 모먼트 탭: 필터 한 줄, 분류 `Weverse / YouTube / 외부 출연`(제목 패턴 분류 폐기), 히어로·월별 레일, `?v=` 상세 모달, `?m=` 뷰어 → [[videos-moments]]
- 제거: 도서관(articles), 홈 메인 걸기(featured), `PostEmbed`. DB 테이블·edge function은 남김 → [[articles]](superseded) · [[settings]] · [[data-model]] · [[database-layer]] · [[routing]]
- PC 폭: 모든 탭이 헤더와 같은 1200px, 포스트·사진 격자 열 수 자동 → [[mobile-first-ui]]

---

## 2026-10-28 — 입장 로고 화면 + 스토리 팝업 등장

세션에서 처음 홈(`/`)으로 들어오면 테마 배경 위에 "mmemory" 로고 애니메이션(`EntrySplash`, `lib/entrySplash.ts`)을 띄운다. 최소 0.9초, 홈이 자동 열기를 정하면 내리고, 늦어도 2.5초면 내린다.
자동으로 여는 스토리는 로고가 사라질 때 팝업처럼 커지며 나타난다(`StoryViewer enter="pop"`). 칸을 눌러 열면 그대로 아래에서 올라온다. 검은 로딩 화면(스피너 + ✕)은 없앴다.

---

## 2026-10-28 — 그 해 오늘 스토리 빠르게 열기

목록 데이터를 기기에 남겨(stale-while-revalidate) 다음 방문엔 스토리를 바로 연다. `getMoments`는 1000행 장들을 동시에 받는다.
그날 첫 방문에 데이터가 없으면 검은 로딩 화면(스피너 + ✕)을 띄우고 스토리로 이어받는다 → [[directory-structure]]

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
