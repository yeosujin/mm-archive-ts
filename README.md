# mmemory

팬 커뮤니티 아카이브. 두 멤버의 활동(영상, 순간, 포스트, 사진, 에피소드, 외부 글)을 한곳에 모아 시간순으로 보여준다. 모바일 우선 PWA.

## 시작하기

```bash
npm install
# docs/STACK.md 의 환경변수 표를 보고 .env 작성
npm run dev
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입체크 + 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run tweet:dry` | '그해 오늘' 봇 dry-run |

## 주요 기능

- 도메인별 아카이브 (모먼트 / 순간 / 포스트 / 사진 / 에피소드 / 도서관)
- 전체 통합 캘린더
- 키워드 검색 + Gemini 임베딩 기반 AI 의미 검색
- 익명 질문(Ask) + 답변 공유용 동적 OG 카드
- 매일 KST 자정 '그해 오늘' X 자동 게시 봇

## 스택

React 19 · TypeScript · Vite · Supabase(PostgreSQL + pgvector) · Cloudflare R2 · Vercel

## 문서

- [docs/DOMAIN.md](docs/DOMAIN.md) — 콘텐츠 도메인
- [docs/STRUCTURE.md](docs/STRUCTURE.md) — 구조 · 라우트 · 데이터 모델
- [docs/STACK.md](docs/STACK.md) — 스택 · 의존성 · 환경변수
- [docs/API.md](docs/API.md) — 서버리스 · DB · 외부 연동
- [docs/AUTOMATION.md](docs/AUTOMATION.md) — 자동화 · 배포
