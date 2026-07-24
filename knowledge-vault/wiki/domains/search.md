---
type: domain
status: stable
tags: [domain, search, ai]
created: 2026-07-24
updated: 2026-07-24
---

# Search (검색)

## 한 줄 정의

키워드 검색과 AI 의미 검색이 **한 화면에 모드 토글로** 공존한다.

## 위치

- 라우트: `/search`, 네비에는 아이콘으로 노출
- 공개 페이지: `src/pages/Search.tsx`
- 클라이언트 래퍼: `src/lib/semanticSearch.ts`
- Edge Function: `supabase/functions/semantic-search/`

## 두 모드

| | 키워드 모드 (기본) | AI 모드 |
|---|---|---|
| 방식 | 캐시된 전체 데이터를 클라이언트에서 문자열 매칭 | 임베딩 벡터 유사도 |
| 네트워크 | 없음 | Edge Function 호출 |
| 하이라이트 | 일치 지점 표시 | 없음 (의미 검색이라 일치 지점이 없음) |
| 비용 | 0 | [[google-gemini]] 임베딩 쿼터 소모 |

AI 모드는 **명시적으로 켰을 때만** 호출한다. 기본 모드에서 쿼터를 쓰지 않기 위한 설계다 → [[embedding-semantic-search]]

## 유도 장치

키워드 검색 결과가 0건일 때 "AI로 다시 찾아볼까요?" CTA를 띄운다. 헛수고한 사용자만 AI 모드로 넘긴다.

## 함정

- 키워드 모드는 **캐시된 데이터만** 본다. `DataContext`의 5분 TTL 안에 들어온 새 콘텐츠는 잡히지 않는다
- AI 모드 결과는 임계값으로 잘린다. "분명 있는데 안 나온다"면 유사도가 `AI_SIM_FLOOR` 아래일 수 있다 → [[ai-search-threshold-tuning]]

## 관련
- [[embedding-semantic-search]] · [[google-gemini]] · [[ai-search-threshold-tuning]] · [[ask]]
