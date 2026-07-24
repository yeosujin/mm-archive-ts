---
type: decision
status: stable
decision_date: unknown
tags: [decision, database, reconstructed]
created: 2026-07-24
updated: 2026-07-24
---

# 마이그레이션 도구 없이 날짜 붙인 SQL 파일로 관리한다

> [!note] 사후 복원된 ADR
> 저장소 형태에서 역추적했다. `supabase/migrations/`가 없고 `supabase/sql/`에 날짜 파일만 있다.

## 맥락

스키마 변경이 가끔 필요하다. 하지만 이 프로젝트는 **1인 사이드 프로젝트에 환경이 하나**(프로덕션 Supabase 프로젝트)다. 로컬 DB도, 스테이징도 없다.

## 결정

`supabase/migrations/`(Supabase CLI 마이그레이션)를 쓰지 않는다. **`supabase/sql/`에 `YYYY-MM-DD-설명.sql` 형식으로 파일을 두고, Supabase 대시보드에서 수동 실행한다.**

현재 파일:

```
supabase/sql/2026-07-14-content-embeddings.sql
supabase/sql/2026-07-15-tweet-bot-log.sql
```

## 기각한 대안

| 대안 | 기각 이유 |
|---|---|
| Supabase CLI 마이그레이션 | 로컬 DB·스테이징이 없어 `db reset`/`db push` 흐름의 이득이 안 나온다. shadow DB 관리 비용만 생긴다 |
| ORM 마이그레이션(Prisma 등) | ORM을 안 쓴다. 스키마 SSOT를 하나 더 만드는 셈 |
| SQL을 저장소에 안 두기 | 스키마 이력이 통째로 사라진다. 최소한 파일은 남긴다 |

## 결과

- **적용 여부가 저장소에 기록되지 않는다.** 파일이 있다고 DB에 반영됐다는 보장이 없다. 확인은 대시보드에서 직접
- 롤백 스크립트가 없다. 되돌리려면 손으로 쓴다
- 환경이 둘 이상 생기면 이 방식은 즉시 무너진다. 그때 도구를 도입한다
- **콘텐츠 테이블의 RLS 정책은 이 파일들에 없다.** `content_embeddings`만 `enable row level security`(정책 없음 = service_role 전용)가 파일에 있고, 나머지 정책은 대시보드에만 존재한다. 그게 유일한 쓰기 방어선인데 저장소에서는 보이지 않는다 → [[supabase-key-boundary]]

## 관련
- [[supabase]] · [[data-model]] · [[supabase-key-boundary]]
