---
type: pattern
status: stable
enforcement: should
tags: [pattern, database, structure]
created: 2026-07-24
updated: 2026-07-24
---

# 도메인별 DB 모듈 + 배럴

## 해결하는 문제

DB 접근 함수를 한 파일에 모으면 도메인이 10종으로 늘어난 시점에 파일이 감당이 안 된다. 그렇다고 파일을 쪼개면 앱 전체의 import 경로를 전부 고쳐야 한다.

**구현을 도메인별 파일로 쪼개고, 원래 경로는 배럴로 남긴다.**

## 구조

```
src/lib/database.ts          ← 배럴. re-export만 있다
src/lib/database/
  types.ts                   ← 모든 인터페이스 (단일 출처)
  videos.ts  moments.ts  posts.ts  photos.ts
  episodes.ts  articles.ts  asks.ts  activities.ts
  featured.ts  settings.ts  embeddings.ts
```

호출부는 예전과 똑같이 쓴다.

```typescript
import { getVideos, createPhoto } from '../lib/database'
```

모듈 목록과 export는 → [[database-layer]]

## 규약

- **한 도메인 = 한 파일.** CRUD 함수는 그 파일에만 둔다
- **타입은 `types.ts` 단일 출처.** 도메인 파일이 자체 인터페이스를 정의하지 않는다
- 모든 함수는 Supabase 응답을 unwrap해 `Promise<T>`를 반환한다. 호출부가 `{ data, error }`를 다루지 않는다
- 새 도메인을 추가하면 파일을 만들고 **배럴에 re-export를 추가**한다. 빠뜨리면 import가 안 된다

## 주의

> [!key-insight]
> `database.ts`(파일)와 `database/`(디렉토리)가 나란히 있다. 파일만 열어 보고 "구현이 없네"라고 판단하기 쉽다.

- 배럴은 이름 충돌을 막아 주지 않는다. 도메인 간 함수명이 겹치면 `export *`가 조용히 깨진다
- 배럴 하나로 전부 re-export하므로 트리셰이킹 관점에서는 불리하다. 지금 규모에서는 문제되지 않는다

결정 경위 → [[database-barrel-split]]

## 관련
- [[database-layer]] · [[data-model]] · [[database-barrel-split]] · [[directory-structure]]
