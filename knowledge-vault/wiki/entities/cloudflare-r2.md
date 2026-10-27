---
type: entity
status: stable
tags: [entity, storage]
created: 2026-07-24
updated: 2026-10-27
---

# Cloudflare R2

S3 호환 오브젝트 스토리지. **영상·사진 원본과 썸네일**을 여기에 둔다.

## 쓰는 방식

- 브라우저는 `api/r2.ts`에서 presigned PUT URL을 받아 R2에 직접 PUT한다 (단일 PUT, 5GB 한도)
- 삭제도 `api/r2.ts`가 대신 한다. 자격증명은 서버에만 있다
- 공개 URL은 `${VITE_R2_PUBLIC_URL}/${fileName}`

업로드 전체 흐름 → [[r2-media-pipeline]]

## 주의

> [!warning]
> 1.21.1까지는 자격증명이 `VITE_R2_*`로 번들에 노출돼 있었다. 1.21.2에서 서버로 옮겼다. 옛 번들에 남은 키는 회전해야 무효가 된다 → [[env-vars]]
> 버킷 CORS가 사이트 origin의 `PUT` + `Content-Type` 헤더를 허용해야 업로드가 된다.

- **X 봇은 R2에 있는 미디어만 게시할 수 있다.** 외부 URL(YouTube 등)은 업로드 불가라 제외된다 → [[daily-tweet-bot]]

## 관련
- [[r2-media-pipeline]] · [[env-vars]] · [[daily-tweet-bot]] · [[photos]]
