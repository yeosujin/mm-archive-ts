---
type: entity
status: stable
tags: [entity, ai]
created: 2026-07-24
updated: 2026-07-24
---

# Google Gemini

임베딩 생성과 답변 생성에 쓴다. **Edge Function 안에서만 호출한다** — 키가 클라이언트에 가면 안 된다.

## 쓰는 방식

| 용도 | 어디서 |
|---|---|
| 텍스트 임베딩 (768차원) | `embed-content`, `semantic-search` → [[embedding-semantic-search]] |
| 답변 생성 (RAG) | `rag-answer` |

공통 래퍼는 `supabase/functions/_shared/gemini.ts`.

## 주의

- **쿼터를 소모한다.** AI 검색 모드를 명시적으로 켰을 때만 호출한다. 기본 키워드 검색은 네트워크를 타지 않는다
- 임베딩 백필은 대량 호출이다. 전량 재생성 전에 건수를 센다 → [[backfill-scripts]]
- 모델을 바꾸면 `vector(768)` 차원과 유사도 분포가 모두 달라진다. 기존 임베딩 전량 재생성 + 임계값 재조정이 따라온다 → [[ai-search-threshold-tuning]]

> [!gap]
> `rag-answer`는 만들어져 있지만 **UI 어디에서도 호출하지 않는다.** 답변 생성 쪽은 실사용 중이 아니다.

## 관련
- [[embedding-semantic-search]] · [[search]] · [[ai-search-threshold-tuning]] · [[supabase]]
