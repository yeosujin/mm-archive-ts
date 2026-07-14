# mmemory X 자동 트윗 봇

"그 해 오늘"(오늘과 같은 월·일의 과거 콘텐츠)을 매일 X(트위터)에 자동으로 올리는 봇.
Supabase에서 콘텐츠를 읽고, R2에 있는 미디어 파일을 받아 X v2 미디어 업로드로 게시한다.

## 동작 규칙 (확정 스펙)

- **대상**: 오늘(Asia/Seoul)과 `MM-DD`가 같은 **과거 연도** 콘텐츠. 없으면 아무것도 안 올림.
- **순서**: 모먼트 → 사진 → 포스트
- **스레드 분리** (전부 나눔):
  | 종류 | 그룹 | 미디어 | 본문 |
  |---|---|---|---|
  | 모먼트 | 영상 출처(`video_id`)마다 독립 스레드 | **R2 영상만** (외부 링크 스킵) | `YYMMDD 플랫폼` |
  | 사진 | 전체를 한 스레드 | R2 이미지 | `YYMMDD #태그` |
  | 포스트 | 포스트마다 독립 스레드 | R2 이미지/영상 | `YYMMDD 제목` |
- 각 스레드 안에서 미디어는 **4개씩** (4+4+3 …)
- 본문에 **URL 없음** (X의 URL 과금 $0.20 회피)

### 왜 "R2 파일만" 인가
X에는 실제 파일(mp4/jpg)을 업로드해야 한다. 유튜브·트위터 **링크는 파일이 아니라** 올릴 수 없다.
`Moment.tweet_url`은 이름과 달리 R2에 올린 영상 파일이거나 외부 링크인데, **R2인 것만** 사용한다.

### 미디어 조합 fallback
X 공식 규칙은 "트윗당 사진 4장 **또는** 영상 1개"다. 영상 여러 개/영상+이미지 혼합을
한 트윗에 넣는 게 거부되면, 봇이 자동으로 **미디어 1개씩 답글로 분할**해 스레드로 이어붙인다.
→ 첫 실제 게시 때 X가 혼합을 받아주는지 바로 확인된다.

## 준비물

1. **X 개발자 계정** + 종량제 크레딧 충전(최소 $25). 앱 권한은 **Read and write**.
2. X 앱의 OAuth 1.0a 키 4개: API Key/Secret, Access Token/Secret.
3. `.env` 작성 (`.env.example` 복사):
   ```bash
   cp .env.example .env
   # 값 채우기
   ```

## 로컬 실행

```bash
npm install

# 순수 로직 유닛 테스트 (Supabase/X 불필요, 완전 오프라인)
npm run test:plan
npm run typecheck

# Supabase 실제 조회 + 게시 계획 출력 (X 게시는 안 함, X 토큰 불필요)
npm run dry-run

# 특정 날짜로 테스트
DATE=2026-07-14 npm run dry-run

# 실제 게시 (X 토큰 필요)
npm start
```

## 자동 실행

`.github/workflows/daily-tweet.yml` 이 매일 **00:05 KST**에 실행한다.
GitHub 저장소 **Settings → Secrets and variables → Actions** 에 아래 시크릿 등록:

`SUPABASE_URL`, `SUPABASE_KEY`, `R2_PUBLIC_URL`,
`X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET`

`Actions` 탭 → `Daily X Auto-Tweet` → **Run workflow** 로 수동/드라이런 실행도 가능.

## 커스터마이징 메모

- **본문 접두 날짜**: 현재 게시일(오늘) 기준 `YYMMDD`. 추억의 원래 연도로 바꾸려면
  `src/threadPlan.ts`에서 `yymmdd` 대신 각 항목의 `date`를 쓰면 된다.
- **태그 해시(#)**: 사진 태그를 `#태그`로 붙인다. 원치 않으면 `threadPlan.ts`의 사진 caption 부분 수정.
- **크론 시각**: 워크플로 `cron: '5 15 * * *'` (UTC) 수정.

## 구조

```
bot/
├── src/
│   ├── index.ts        # 오케스트레이터 (--dry-run / --plan-only)
│   ├── config.ts       # env 로드 (X 자격증명은 게시 시에만 검증)
│   ├── dates.ts        # KST 오늘 계산 · 그 해 오늘 필터
│   ├── onThisDay.ts    # Supabase 조회 + 영상 출처별 그룹핑
│   ├── threadPlan.ts   # ★ 순수 로직: 콘텐츠 → 스레드 계획
│   ├── media.ts        # R2 판별 · 파일 다운로드 · MIME 추론
│   ├── xClient.ts      # X v2 업로드 + 스레드 게시 (+ 분할 fallback)
│   ├── types.ts        # 타입
│   └── constants.ts
└── test/threadPlan.test.ts
```
