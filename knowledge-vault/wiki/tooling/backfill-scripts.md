---
type: tooling
status: stable
tags: [tooling, scripts]
created: 2026-07-24
updated: 2026-07-24
---

# 백필 스크립트

일회성/수동 실행. 로컬에서 `.env`를 읽는다 → [[env-vars]]

| 명령 | 하는 일 |
|---|---|
| `npm run backfill:thumb-hash` | 기존 이미지에 ThumbHash 생성 → [[r2-media-pipeline]] |
| `npm run backfill:embeddings` | 기존 콘텐츠를 임베딩해 `content_embeddings` 채우기 → [[embedding-semantic-search]] |
| `npx tsx scripts/remux-r2-videos.ts` | R2 영상 remux |

## 언제 돌리나

- **ThumbHash** — 백필 이전에 올라간 이미지, 또는 `thumb_hash` 없이 들어간 레코드
- **임베딩** — 새 콘텐츠는 저장 시 `syncEmbedding`이 자동으로 돈다. 백필은 (a) 기존 데이터 최초 색인, (b) 임베딩 모델·차원을 바꿨을 때 전량 재생성

## 주의

- 임베딩 백필은 [[google-gemini]] 쿼터를 대량 소모한다. 전량 재생성 전에 건수를 먼저 센다
- service-role 키를 쓰므로 **로컬에서만** 실행한다. 클라이언트 코드에 옮기지 않는다 → [[supabase-key-boundary]]

## 관련
- [[stack]] · [[embedding-semantic-search]] · [[r2-media-pipeline]] · [[env-vars]]
