---
type: meta
title: "Hot"
created: 2026-07-24
updated: 2026-07-24
tags: [meta, hot]
---

# Hot

지금 자주 참조되거나 손댈 일이 많은 것들. 상황이 바뀌면 갱신한다.

## 실수하기 쉬운 지점

| 함정 | 페이지 |
|---|---|
| 네비 "모먼트" = `videos` 도메인 | [[videos-moments]] |
| `database.ts`(배럴) vs `database/`(구현) | [[database-layer]] |
| service-role 키에 `VITE_` 금지 · RLS가 유일한 방어선 | [[supabase-key-boundary]] |
| 모먼트의 기준 날짜는 상위 영상 날짜 | [[content-date-semantics]] |
| YouTube 카테고리는 제목 문자열 매칭 | [[videos-moments]] |

## 최근에 건드린 영역

- **그해오늘 봇** — 캡션 형식과 스케줄을 최근 조정했다 → [[daily-tweet-bot]] · [[bot-early-trigger-midnight-wait]]
- **AI 검색** — 0건 재검색 CTA와 임계값 → [[search]] · [[ai-search-threshold-tuning]]
- **OG 카드** — Twemoji 코드포인트 처리 → [[og-image-generation]]

## 미해결

> [!gap]
> `rag-answer` / `askArchive`가 UI에 연결돼 있지 않다 → [[embedding-semantic-search]]

> [!gap]
> `decisions/` 5개 중 4개가 **사후 복원된 ADR**이다. 실제 경위와 다를 수 있다 → [[decisions/_index]]

## 배포 전 확인

[[deploy]] — 빌드·린트·시크릿 노출이 블로커. `main` 푸시가 곧 배포다.
