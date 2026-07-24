---
type: domain
status: stable
tags: [domain, photos]
created: 2026-07-24
updated: 2026-07-24
---

# Photos (사진)

## 한 줄 정의

[[cloudflare-r2]]에 직접 업로드한 사진 아카이브. 제목 + 태그 + 날짜로 관리한다.

## 위치

- 라우트: `/photos`, 네비 표시명 **사진**
- 공개 페이지: `src/pages/Photos.tsx`
- 어드민: `src/pages/admin/AdminPhotos.tsx`
- DB 모듈: `src/lib/database/photos.ts`

## 동작

- 같은 제목으로 여러 장을 올리면 `-1`, `-2` 접미사가 자동으로 붙는다 (`src/lib/titleSuffix.ts`). 중간 장을 삭제하면 번호를 재정렬한다
- ThumbHash blur placeholder로 로딩 중 흐린 미리보기를 보여준다 (`src/lib/thumbHash.ts`)
- 업로드 시 EXIF를 제거한다 (`src/lib/stripMetadata.ts`) — 촬영 위치·기기 정보가 그대로 공개되는 것을 막는다
- 라이트박스에서 썸네일 → 원본으로 전환
- 어드민에서 검색 및 다중 선택 삭제 지원

## 함정

- 제목 접미사 로직은 **제목이 정확히 같을 때만** 묶인다. 공백이나 문장부호가 다르면 별개 그룹이 된다
- 봇이 게시하는 사진 캡션은 이 접미사를 떼고 나간다 → [[daily-tweet-bot]]

## 관련
- [[r2-media-pipeline]] · [[daily-tweet-bot]] · [[data-model]]
