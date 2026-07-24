# mmemory

팬 커뮤니티 아카이브 플랫폼. 두 멤버의 활동을 시간순으로 아카이빙하는 React + TypeScript 웹앱.
**주 사용 환경은 모바일**이므로 모든 UI는 모바일 우선 반응형으로 설계한다.

## 문서

작업 전에 해당하는 문서를 읽을 것. 이 파일은 지도일 뿐이고, 실제 내용은 `knowledge-vault/wiki/`에 있다.

시작점: [knowledge-vault/wiki/overview.md](knowledge-vault/wiki/overview.md) · 전체 목록: [index.md](knowledge-vault/wiki/index.md)

| 폴더 | 내용 |
|---|---|
| [domains/](knowledge-vault/wiki/domains/) | 콘텐츠 도메인 — 각 도메인이 뭘 하는지, 페이지·어드민 위치, 필터/아이콘 규칙 |
| [architecture/](knowledge-vault/wiki/architecture/) | 디렉토리 구조, DB 레이어, 라우트 트리, 데이터 모델, 서버리스 표면 |
| [patterns/](knowledge-vault/wiki/patterns/) | 재사용 해법 — R2 업로드, 임베딩 검색, OG 이미지, 스케줄 보정 |
| [convention/](knowledge-vault/wiki/convention/) | 어기면 깨지는 규칙 — 키 경계, 모바일 우선, git/버전 |
| [decisions/](knowledge-vault/wiki/decisions/) | 왜 이렇게 정했나 (대부분 코드에서 사후 복원) |
| [tooling/](knowledge-vault/wiki/tooling/) | 스택, 환경변수, PWA, 배포, X 봇, 백필 |
| [concepts/](knowledge-vault/wiki/concepts/) | '그해 오늘', 콘텐츠 날짜 의미 |
| [entities/](knowledge-vault/wiki/entities/) | 외부 서비스 — Supabase, R2, Gemini, Vercel, X |

vault 작성 규칙은 [meta/conventions.md](knowledge-vault/wiki/meta/conventions.md). 페이지를 추가하면 해당 `_index.md`와 `index.md`를 함께 갱신하고, `log.md` 최상단에 항목을 추가한다.

`docs/superpowers/`에는 과거 기능(AI 검색, X 봇)의 설계·계획 문서가 남아 있다. 당시 기록이므로 현재 코드와 다를 수 있다.

## 작업 규칙

- 수정 대상 파일의 도메인과 관련 파일을 먼저 확인하고, 영향 범위를 이해한 뒤 코드를 변경할 것
- 코드와 문서가 어긋나면 **코드가 정답**이다. 문서를 고칠 것

## Git

- 코드 수정 후 **커밋만** 할 것. 푸시/머지는 사용자가 요청할 때만
- 작업 브랜치는 `develop`. `main` 푸시는 곧 배포다
- "배포해줘" / "배포" / "deploy" → `.claude/commands/deploy.md` 절차 실행

## 버전

기능 추가나 주요 스타일 변경 시 `package.json`의 version을 올린다 (현재 1.20.2).

- patch — 버그 수정, 작은 스타일 변경
- minor — 새 기능, 큰 UI 변경
- major — 호환성 깨지는 대규모 변경

## 주의할 함정

- **Videos ≠ Moments**: 네비의 "모먼트"는 `videos` 도메인이다. `moments`는 별도 도메인이고 네비에 없다
- **`SUPABASE_SERVICE_ROLE_KEY`는 클라이언트에 절대 노출 금지** — `VITE_` 접두사를 붙이지 말 것
- YouTube 카테고리 필터는 제목 문자열 매칭이라 제목이 바뀌면 분류가 깨진다
- `src/lib/database.ts`는 배럴 파일이고 실제 구현은 `src/lib/database/`에 도메인별로 나뉘어 있다
