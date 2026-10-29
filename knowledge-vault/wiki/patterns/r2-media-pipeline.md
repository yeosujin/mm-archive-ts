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

영상/사진을 올릴 때 업로드 하나로 끝나지 않는다. 썸네일이 필요하고, 로딩 중 빈 화면을 막을 placeholder가 필요하고, 사진에는 위치 메타데이터가 박혀 있다. 이걸 클라이언트에서 한 흐름으로 처리하고, 서버(`api/r2.ts`)는 서명 URL 발급과 삭제만 한다.

구현은 `src/lib/r2Upload.ts`.

## 구조

```
File 선택
  ↓
isVideoFile(file) 판별
  ↓
[video] uploadVideoToR2(file, onProgress)   ← /api/r2 presign → XHR PUT + 진행률 콜백
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

- **presigned PUT 업로드** — `api/r2.ts`가 `x-admin-password` 헤더를 검증한 뒤 10분짜리 PUT URL을 준다. 브라우저는 XHR로 올리며 `onProgress`로 진행률을 표시한다. 비밀번호는 로그인 시 서버 검증 후 `sessionStorage`에 둔다
- **클라이언트 썸네일 추출** — `@ffmpeg/ffmpeg`(WASM)로 영상 첫 프레임을 브라우저에서 뽑아 별도 썸네일로 업로드. 서버 처리 없이 즉시 미리보기를 확보한다
- **ThumbHash blur placeholder** — `thumbhash`로 초소형 blur 해시를 만들어 DB `thumb_hash` 컬럼에 저장. 로딩 중 부드러운 흐린 미리보기를 렌더한다
- **EXIF 제거** — `stripMetadata.ts`가 사진 업로드 **전에** 위치·기기 메타데이터를 제거한다. 팬이 올린 사진에 촬영 위치가 남는 것을 막는 프라이버시 조치라 생략하면 안 된다

## 보조 유틸

| 함수 | 역할 |
|---|---|
| `generateThumbnailFromUrl(videoUrl)` | URL에서 썸네일 생성 |
| `deleteFileFromR2(url)` | `api/r2.ts`에 삭제 요청 |
| `isVideoFile(file)` | 영상/사진 분기 판별 |
| `formatFileSize(bytes)` | 사이즈 포맷팅 |

서버 측(`api/`)에서는 `sharp`로 추가 리사이즈를 한다.

## 트랜스코딩 (1.21.3~)

업로드 원본(대부분 iPhone .mov, 8~12Mbps, 60~120fps)은 첫 재생이 느리다. `scripts/transcode-r2-videos.ts`가 H.264 mp4(긴 변 1280, 30fps, 약 2.5Mbps, AAC 128k, faststart)로 바꿔 **새 키** `videos/t/{basename}.mp4`에 올린다.

- `moments.original_url` / `posts.media[].original_url` = 원래 주소. 채워져 있으면 처리 완료
- 원본 객체는 지우지 않는다. 롤백은 `tweet_url ← original_url`
- 썸네일이 비어 있거나 **검은 화면**(평균 밝기 YAVG < 20 — 업로드 때 0.1초 첫 장면을 찍어 시작이 검은 영상에서 생김)이면 1초 → 0.5초 → 0초 지점에서 검지 않은 프레임으로 다시 만든다(`…_thumb.jpg`)
- `.github/workflows/transcode.yml`이 매시간 새 업로드를 처리한다(libx264). 대량 처리는 로컬 맥(videotoolbox)
- 어드민에서 영상을 교체하면 `original_url`을 비워 다시 변환 대상이 되게 하고, 삭제 시 원본도 지운다

## 주의

- 기존 레코드에 `thumb_hash`가 없으면 `npm run backfill:thumb-hash`로 채운다 → [[backfill-scripts]]
- **R2에 올라간 미디어만 X 봇이 게시할 수 있다.** 외부 URL은 업로드 대상이 아니라 봇에서 제외된다 → [[daily-tweet-bot]]
- `@ffmpeg/ffmpeg`는 WASM이라 첫 로드가 무겁다. 모바일에서 체감된다

## 관련
- [[cloudflare-r2]] · [[photos]] · [[videos-moments]] · [[daily-tweet-bot]] · [[backfill-scripts]]
