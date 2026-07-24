---
type: entity
status: stable
tags: [entity, backend]
created: 2026-07-24
updated: 2026-07-24
---

# Supabase

PostgreSQL 기반 BaaS. 이 프로젝트의 **DB + 서버리스 + 벡터 검색**을 전부 맡는다.

## 쓰는 방식

| 기능 | 어디서 |
|---|---|
| PostgreSQL | 전 도메인 테이블 → [[data-model]] |
| pgvector | `content_embeddings.embedding vector(768)` → [[embedding-semantic-search]] |
| Edge Functions (Deno) | `semantic-search`, `embed-content`, `rag-answer` |
| RLS | **유일한 쓰기 방어선** → [[supabase-key-boundary]] |

클라이언트 접근은 `@supabase/supabase-js` → `src/lib/database/` → 배럴 → [[database-layer]]

## 주의

- **anon 키만 클라이언트에 둔다.** service-role은 Edge Function과 Node 스크립트 전용 → [[supabase-key-boundary]]
- 기본 조회는 **1000행 제한**이 걸린다. 봇의 `fetchAllRows`가 페이지네이션으로 우회한다 → [[daily-tweet-bot]]
- 마이그레이션 도구를 쓰지 않는다. 스키마 변경은 `supabase/sql/`의 날짜 파일을 대시보드에서 수동 실행 → [[no-migration-tool]]
- Edge Function 배포는 프론트 배포와 별개다 (`supabase functions deploy`) → [[edge-function-vercel-split]]

## 관련
- [[database-layer]] · [[data-model]] · [[supabase-key-boundary]] · [[no-migration-tool]] · [[embedding-semantic-search]]
