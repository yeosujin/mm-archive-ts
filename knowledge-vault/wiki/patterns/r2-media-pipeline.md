---
type: pattern
status: stable
enforcement: must
tags: [pattern, media, r2]
created: 2026-07-24
updated: 2026-07-24
---

# R2 미디어 파이프라인

## 해결하는 문제

영상/사진을 올릴 때 업로드 하나로 끝나지 않는다. 썸네일이 필요하고, 로딩 중 빈 화면을 막을 placeholder가 필요하고, 사진에는 위치 메타데이터가 박혀 있다. 이걸 서버 없이 클라이언트에서 한 흐름으로 처리한다.

구현은 `src/lib/r2Upload.ts`.

## 구조

```
File 선택
  ↓
isVideoFile(file) 판별
  ↓
[video] uploadVideoToR2(file, onProgress)   ← @aws-sdk/lib-storage 멀티파트 + 진행률 콜백
          ↓
        uploadThumbnailFromVideo(file, videoKey)  ← @ffmpeg/ffmpeg로 첫 프레임 추출 → R2 업로드
[photo] uploadPhotoToR2(file)
          ↓
        stripMetadata(file)                  ← 업로드 전 EXIF 제거
  ↓
public URL 반환: `${VITE_R2_PUBLIC_URL}/${fileName}`
  ↓
database.createVideo / createPhoto 로 메타 저장
```

## 구성 요소

- **멀티파트 업로드** — `@aws-sdk/client-s3` + `@aws-sdk/lib-storage`. 대용량 영상을 청크로 나눠 올리고 `onProgress` 콜백으로 진행률을 표시한다
- **클라이언트 썸네일 추출** — `@ffmpeg/ffmpeg`(WASM)로 영상 첫 프레임을 브라우저에서 뽑아 별도 썸네일로 업로드. 서버 처리 없이 즉시 미리보기를 확보한다
- **ThumbHash blur placeholder** — `thumbhash`로 초소형 blur 해시를 만들어 DB `thumb_hash` 컬럼에 저장. 로딩 중 부드러운 흐린 미리보기를 렌더한다
- **EXIF 제거** — `stripMetadata.ts`가 사진 업로드 **전에** 위치·기기 메타데이터를 제거한다. 팬이 올린 사진에 촬영 위치가 남는 것을 막는 프라이버시 조치라 생략하면 안 된다
- **서명 URL** — `@aws-sdk/s3-request-presigner`로 필요 시 발급

## 보조 유틸

| 함수 | 역할 |
|---|---|
| `generateThumbnailFromUrl(videoUrl)` | URL에서 썸네일 생성 |
| `deleteFileFromR2(url)` | 삭제 |
| `isVideoFile(file)` | 영상/사진 분기 판별 |
| `formatFileSize(bytes)` | 사이즈 포맷팅 |

서버 측(`api/`)에서는 `sharp`로 추가 리사이즈를 한다.

## 주의

- 기존 레코드에 `thumb_hash`가 없으면 `npm run backfill:thumb-hash`로 채운다 → [[backfill-scripts]]
- **R2에 올라간 미디어만 X 봇이 게시할 수 있다.** 외부 URL은 업로드 대상이 아니라 봇에서 제외된다 → [[daily-tweet-bot]]
- `@ffmpeg/ffmpeg`는 WASM이라 첫 로드가 무겁다. 모바일에서 체감된다

## 관련
- [[cloudflare-r2]] · [[photos]] · [[videos-moments]] · [[daily-tweet-bot]] · [[backfill-scripts]]
