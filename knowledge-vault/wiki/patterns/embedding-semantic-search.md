---
type: pattern
status: stable
enforcement: should
tags: [pattern, search, ai]
created: 2026-07-24
updated: 2026-07-24
---

# 임베딩 의미 검색

## 해결하는 문제

키워드 문자열 매칭으로는 "의미가 비슷한" 콘텐츠를 못 찾는다. 임베딩 벡터 유사도로 검색하되, **벡터 검색이 항상 무언가를 돌려준다는 성질**을 임계값으로 막는다.

## 구조

```
[색인]  콘텐츠 저장/수정
          ↓  database/embeddings.ts  syncEmbedding()
        Edge Function `embed-content`
          ↓  _shared/content.ts 로 임베딩 대상 텍스트 구성
        Gemini embedText  →  768차원 벡터
          ↓
        content_embeddings (embedding vector(768))

[검색]  사용자 쿼리
          ↓  lib/semanticSearch.ts
        Edge Function `semantic-search`
          ↓  쿼리를 같은 모델로 임베딩
        벡터 유사도 검색 → { content_type, content_id, similarity }[]
          ↓  프론트에서 임계값 필터
        캐시된 실제 콘텐츠와 join 후 렌더
```

## 임계값 필터가 핵심

벡터 검색은 유사도가 아무리 낮아도 상위 N개를 돌려준다. 그대로 보여주면 무관한 결과가 섞인다. `src/pages/Search.tsx`에서 절대 하한과 상대 컷 중 **더 엄격한 쪽**으로 자른다.

```typescript
const AI_SIM_FLOOR = 0.64;   // 이보다 낮으면 사실상 무관
const AI_SIM_MARGIN = 0.05;  // 최고점보다 이만큼 이상 낮으면 제거
const aiCutoff = Math.max(AI_SIM_FLOOR, topSim - AI_SIM_MARGIN);
```

- **절대 하한**은 결과가 통째로 무관할 때(=최고점 자체가 낮을 때) 전부 걷어낸다
- **상대 컷**은 좋은 결과가 있을 때 그보다 처지는 꼬리를 자른다

값을 이렇게 잡은 경위 → [[ai-search-threshold-tuning]]

## 쿼터 절약

임베딩 호출은 [[google-gemini]] 쿼터를 소모한다. **AI 모드를 명시적으로 켰을 때만** Edge Function을 호출하고, 기본 키워드 모드는 캐시된 데이터를 클라이언트에서 매칭할 뿐 네트워크를 타지 않는다.

## 주의

> [!gap]
> `rag-answer` Edge Function과 클라이언트 래퍼 `askArchive`는 **완성되어 있으나 UI 어디에서도 호출하지 않는다.** 검색 화면은 `semanticSearch`만 쓴다. "검색"은 붙었고 "답변"은 백엔드까지만 만들어진 상태다.

- 새 콘텐츠는 `syncEmbedding`이 돌아야 검색된다. 기존 데이터는 `npm run backfill:embeddings` → [[backfill-scripts]]
- 임베딩 모델을 바꾸면 `vector(768)` 차원과 기존 데이터를 전부 다시 만들어야 한다

## 관련
- [[search]] · [[google-gemini]] · [[supabase]] · [[ai-search-threshold-tuning]] · [[backfill-scripts]]
