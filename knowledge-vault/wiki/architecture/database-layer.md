---
type: architecture
status: stable
tags: [architecture, database]
created: 2026-07-24
updated: 2026-07-24
---

# DB 레이어

## 구성

`src/lib/database/`에 도메인별로 파일이 나뉘어 있고, `src/lib/database.ts`는 **backward-compat barrel**이다. 기존 import 경로(`from '../lib/database'`)를 유지하기 위한 re-export이므로 새 코드도 이 배럴에서 import하면 된다.

> [!key-insight]
> `src/lib/database.ts`를 열면 re-export 몇 줄뿐이다. **실제 구현은 `src/lib/database/` 디렉토리에 있다.** 파일과 디렉토리가 같은 이름이라 처음 보면 놓친다.

| 파일 | export |
|---|---|
| `types.ts` | 모든 인터페이스 (타입 단일 출처) |
| `videos.ts` | `getVideos` `getVideo` `createVideo` `updateVideo` `deleteVideo` |
| `moments.ts` | `getMoments` `getMomentsByVideoId` `createMoment` `updateMoment` `deleteMoment` `updateMomentPositions` |
| `posts.ts` | `getPosts` `createPost` `updatePost` `deletePost` |
| `photos.ts` | `getPhotos` `createPhoto` `updatePhoto` `deletePhoto` |
| `episodes.ts` | `getEpisodes` `createEpisode` `updateEpisode` `deleteEpisode` |
| `articles.ts` | `getArticles` `createArticle` `updateArticle` `deleteArticle` |
| `asks.ts` | `getAsks` `getAnsweredAsks` `getAsk` `createAsk` `answerAsk` `updateAsk` `deleteAsk` `getExpiredImageAsks` `clearAskImageUrl` |
| `activities.ts` | `getActivities` `createActivity` `deleteActivity` |
| `featured.ts` | `getFeaturedContent` `setFeaturedContent` |
| `settings.ts` | `getMemberSettings` `updateMemberSettings` `getArticlesVisibility` `setArticlesVisibility` |
| `embeddings.ts` | `syncEmbedding`, `EmbeddingContentType` |

## 규약

- 모든 함수는 Supabase 응답을 unwrap한 뒤 `Promise<T>`를 반환한다. 호출부가 `{ data, error }`를 다루지 않는다
- 타입은 `types.ts` 단일 출처. 도메인 파일이 자체 인터페이스를 정의하지 않는다
- 클라이언트는 **anon 키만** 쓴다. 어드민 화면도 마찬가지다 → [[supabase-key-boundary]]

## 왜 이렇게 나뉘었나

→ [[domain-per-file-db-layer]] (패턴), [[database-barrel-split]] (결정 경위)

## 관련
- [[data-model]] · [[domain-per-file-db-layer]] · [[supabase-key-boundary]] · [[database-barrel-split]]
