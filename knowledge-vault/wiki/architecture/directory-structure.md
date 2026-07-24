---
type: architecture
status: stable
tags: [architecture, structure]
created: 2026-07-24
updated: 2026-07-24
---

# 디렉토리 구조

```
mm-archive/
├── api/                    Vercel 서버리스 함수
│   ├── og.ts               동적 OG 이미지 (satori + resvg)
│   ├── ask/index.ts        Ask 목록 — 크롤러면 OG 메타 주입
│   ├── ask/[id].ts         Ask 상세 — 크롤러면 OG 카드 반환
│   └── fonts/              OG 렌더용 SUIT woff2
│
├── scripts/
│   ├── dailyTweet/         '그해 오늘' X 자동 게시 봇
│   ├── backfill-embeddings.ts
│   ├── backfill-thumb-hash.ts
│   └── remux-r2-videos.ts
│
├── supabase/
│   ├── functions/          Edge Functions (Deno)
│   │   ├── semantic-search/
│   │   ├── rag-answer/
│   │   ├── embed-content/
│   │   └── _shared/        gemini.ts · content.ts · cors.ts
│   └── sql/                수동 실행 SQL
│
├── src/
│   ├── components/         공용 컴포넌트
│   ├── context/            DataContext (5분 TTL 캐시)
│   ├── hooks/              useData · useToast · useConfirm
│   ├── lib/                DB 레이어 + 유틸
│   ├── pages/              공개 페이지
│   ├── pages/admin/        어드민 페이지
│   ├── routes/index.tsx    라우터 정의
│   └── App.css             전체 스타일 (단일 파일)
│
├── knowledge-vault/        이 vault
├── docs/superpowers/       과거 기능 설계·계획 문서 (당시 기록)
└── .github/workflows/      daily-tweet.yml
```

## 서버 코드가 두 군데로 나뉜 이유

`api/`(Vercel)와 `supabase/functions/`(Deno)가 공존한다. 우연이 아니라 배치 기준이 다르다 → [[edge-function-vercel-split]]

## lib 유틸

DB 레이어를 뺀 나머지. → [[database-layer]]

| 파일 | 역할 |
|---|---|
| `supabase.ts` | Supabase 클라이언트 (anon key) |
| `r2Upload.ts` | R2 멀티파트 업로드 + 썸네일 생성 |
| `platformUtils.ts` | URL → 플랫폼 감지 |
| `semanticSearch.ts` | Edge Function 호출 래퍼 (`semanticSearch`, `askArchive`) |
| `dailyPick.ts` | '그 해 오늘' 필터 (`filterOnThisDay`) — 웹과 봇이 공유 |
| `thumbHash.ts` | ThumbHash 인코딩/디코딩 |
| `stripMetadata.ts` | 업로드 이미지 EXIF 제거 |
| `titleSuffix.ts` | 사진 제목 `-N` 접미사 부여/재정렬 |
| `episodeHelpers.ts` | 에피소드 메시지 가공 |
| `videoPlaybackCoordinator.ts` | 동시 재생 방지 (한 번에 한 영상) |
| `askStorage.ts` | Ask 첨부 이미지 업로드 |

## 캐싱

`src/context/DataContext.tsx` — 5분 TTL 인메모리 캐시. `useData()` 훅으로 접근한다.

`@tanstack/react-query`도 설치되어 있어 **두 방식이 공존한다.** 어느 쪽을 써야 하는지 정해진 규칙은 없다.

## CSS

- 전부 `src/App.css` 단일 파일 (`src/styles/`도 존재)
- CSS 변수 기반 테마 (`--text-primary`, `--bg-card`, `--border`, `--accent` …)
- 다크/라이트 테마는 `localStorage`에 저장 (`Layout.tsx`). **localStorage는 현재 테마에만 쓰인다**
- 모바일 네비는 `position: fixed` 오버레이 (페이지 밀림 없음)

## 관련
- [[database-layer]] · [[routing]] · [[data-model]] · [[edge-function-vercel-split]]
