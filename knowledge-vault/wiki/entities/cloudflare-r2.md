---
type: entity
status: stable
tags: [entity, storage]
created: 2026-07-24
updated: 2026-07-24
---

# Cloudflare R2

S3 호환 오브젝트 스토리지. **영상·사진 원본과 썸네일**을 여기에 둔다.

## 쓰는 방식

- `@aws-sdk/client-s3` + `@aws-sdk/lib-storage` 멀티파트 업로드 (브라우저에서 직접)
- `@aws-sdk/s3-request-presigner`로 서명 URL 발급
- 공개 URL은 `${VITE_R2_PUBLIC_URL}/${fileName}`

업로드 전체 흐름 → [[r2-media-pipeline]]

## 주의

> [!warning]
> 자격증명이 `VITE_R2_ACCESS_KEY_ID` / `VITE_R2_SECRET_ACCESS_KEY`로 **클라이언트 번들에 노출된다.** 브라우저에서 직접 업로드하는 구조상 그렇고, 버킷 권한이 곧 노출 범위다 → [[env-vars]]

- **X 봇은 R2에 있는 미디어만 게시할 수 있다.** 외부 URL(YouTube 등)은 업로드 불가라 제외된다 → [[daily-tweet-bot]]

## 관련
- [[r2-media-pipeline]] · [[env-vars]] · [[daily-tweet-bot]] · [[photos]]
