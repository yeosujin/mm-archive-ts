---
type: convention
status: stable
enforcement: must
tags: [convention, ui, mobile]
created: 2026-07-24
updated: 2026-07-24
---

# 모바일 우선 UI

## 규칙

**주 사용 환경은 모바일이다. 모든 UI는 모바일 우선 반응형으로 설계한다.**

데스크톱에서 먼저 만들고 나중에 좁히는 순서를 쓰지 않는다. 좁은 화면을 기본 레이아웃으로 잡고 넓은 화면을 미디어 쿼리로 확장한다.

## 판단 기준

새 화면이나 컴포넌트를 만들 때 다음이 만족돼야 한다.

- 좁은 뷰포트에서 **가로 스크롤이 생기지 않는다**
- 탭 대상은 손가락으로 누를 수 있는 크기다
- 고정 픽셀 폭 대신 상대 단위·flex·grid를 쓴다
- 이미지는 `max-width: 100%`

## 따라오는 것

- **PWA로 설치해 쓰는 것을 전제**한다. 설치형에서 깨지는 레이아웃은 버그다 → [[pwa-setup]]
- 무거운 WASM 로드(`@ffmpeg/ffmpeg`)는 모바일에서 체감된다. 업로드 경로에 추가 부담을 얹지 않는다 → [[r2-media-pipeline]]

## 관련
- [[pwa-setup]] · [[directory-structure]] · [[home-calendar]]
