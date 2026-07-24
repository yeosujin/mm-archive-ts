---
type: pattern
status: stable
enforcement: should
tags: [pattern, og, vercel]
created: 2026-07-24
updated: 2026-07-24
---

# 동적 OG 이미지 생성

## 해결하는 문제

답변된 Ask를 SNS에 공유할 때 링크 미리보기에 질문 내용이 담긴 카드가 떠야 한다. 정적 이미지로는 질문마다 다른 내용을 담을 수 없다.

구현은 `api/og.ts` ([[vercel]] 함수).

## 구조

```
크롤러가 /ask/:id 요청
  ↓  api/ask/[id].ts — User-Agent로 크롤러 판별
  ↓  크롤러면 OG 메타태그가 박힌 HTML 반환 (아니면 dist/index.html → SPA)
  ↓  메타태그의 og:image 가 /api/og?... 를 가리킴
  ↓
api/og.ts
  ↓  satori: JSX → SVG        (폰트: api/fonts/SUIT-*.woff2)
  ↓  @resvg/resvg-js: SVG → PNG
  ↓
PNG 응답
```

크롤러 UA 목록: `twitterbot`, `facebookexternalhit`, `linkedinbot`, `slackbot`, `discordbot`, `kakaotalk-scrap`

## 이모지 처리 — 가장 자주 깨진 지점

satori는 시스템 폰트의 이모지를 렌더하지 못한다. **Twemoji 15.1.0** 이미지로 치환한다.

`twemojiCode()`가 코드포인트를 **전부 이어붙여야** 한다. 첫 코드포인트만 쓰면 다음이 깨진다.

- 하트류 (색상 변형이 뒤 코드포인트에 있음)
- ZWJ 조합 이모지 (여러 이모지가 결합된 것)
- 키캡 이모지 (숫자 + VS16 + 키캡)

ZWJ가 포함되면 VS16(`fe0f`)을 **유지**하고, 아니면 **떼어낸다.** Twemoji 파일명 규칙이 그렇게 되어 있다.

## 주의

- 폰트 파일이 저장소에 커밋되어 있다(`api/fonts/`). 외부에서 받아오지 않으므로 배포마다 안정적이다
- 이 경로는 PWA 서비스워커 폴백에서 제외된다 (`navigateFallbackDenylist`에 `/^\/api/`) → [[pwa-setup]]
- 크롤러 판별이 UA 문자열 기반이라 목록에 없는 크롤러는 SPA HTML을 받고 카드가 안 뜬다

## 관련
- [[ask]] · [[vercel]] · [[edge-function-vercel-split]] · [[pwa-setup]]
