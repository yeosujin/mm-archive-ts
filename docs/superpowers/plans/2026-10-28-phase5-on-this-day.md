# 5단계 그 해 오늘 (스토리 + 새 홈) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈을 "연도별 그 해 오늘 카드 → 검색 → 새로 올라온 모먼트 9개 → 요청" 구성으로 바꾸고, 인스타 스토리식 그 해 오늘 뷰어를 만든다. 그날 처음 홈에 오면 스토리가 자동으로 열린다.

**Architecture:**
- 순수 로직(프레임 구성·연도 묶음·대체 날짜·자동 표시 판정·최신 모먼트)은 `src/lib/onThisDayStory.ts` + vitest
- 판정 규칙은 기존 `filterOnThisDay`(`src/lib/dailyPick.ts`)를 그대로 쓴다. 모먼트는 상위 영상 날짜로 판정(영상이 그날이면 그 영상의 모먼트 전부). X 봇과 규칙이 같아야 한다
- 뷰어 `src/components/StoryViewer.tsx`. 열림 상태는 홈 URL `?s=<연도>` — 뒤로가기로 닫힘. 4단계 `useViewerParam`을 키를 받도록 일반화해서 쓴다
- 새로 올라온 모먼트는 4단계 `MomentViewer`(`?m=`) 재사용
- 스타일 `src/styles/story.css`(App.tsx import), 홈 스타일은 같은 파일 또는 `moments.css`와 같은 방식으로 분리 — `App.css`에 더하지 않는다
- 기존 `OnThisDay.tsx`(+ 홈 전용 하위 컴포넌트)와 홈의 PICK 렌더링은 삭제

**브랜치·배포:** `yeosujin/v2-ui`. 배포하지 않는다(2.0.0).

**스펙:** `docs/superpowers/specs/2026-10-27-immersive-ui-design.md` §8 (그리고 §7.4 로딩 전략). **동작 참고:** 프로토타입 `.superpowers/brainstorm/66139-1793057944/content/prototype.html`의 story 부분(`/* ---------- story`, `openStory`, `showFrame`, `tick`, `jumpYear`, 포인터 핸들러, 홈 카드 캐러셀 `homeUpd`)과 CSS `.st*`, `.hc*`. 파일이 크므로 grep/sed로 부분만 읽는다.

---

## 사전 사실 (2026-10-28)

- 그 해 오늘이 있는 날 239일, 그중 67일이 2개 연도 이상, 최대 42개 콘텐츠
- `useData()`: `videos`, `moments`, `posts`, `episodes`, `photos`, `memberSettings` (캐시, null 가능) + `fetchX()`
- `getTodayString()`은 `?date=YYYY-MM-DD`로 날짜를 강제할 수 있다(디버깅) — 화면 확인 때 쓴다
- 사진 묶음 규칙: 같은 날·같은 제목(끝 `-\d+` 제외) — 캘린더와 같은 규칙
- 에피소드 화면 부품 `EpisodeContentBody`(`src/components/EpisodeContentBody.tsx`, `Episodes.tsx`도 씀) — 스토리 채팅 프레임에 재사용 가능한지 먼저 본다
- 홈 현재 구성: 타이틀 히어로 + 검색(키워드/AI 토글) + `OnThisDay`(없으면 PICK fallback) + 요청 링크
- `OnThisDay`·`OnThisDayVideoGroup`은 홈에서만 쓰인다(삭제 대상). `PostDetailContent`·`EpisodeContentBody`는 다른 페이지도 쓴다(유지)
- 위버스·영상 표지: `getVideoCover`, 4단계 `VideoCover` 컴포넌트

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/lib/onThisDayStory.ts` + `.test.ts` (생성) | 프레임 타입·구성, 대체 날짜, 자동 표시 판정, 최신 모먼트 |
| `src/hooks/useViewerParam.ts` (수정) | 쿼리 키를 인자로(`'m'` 기본) |
| `src/components/StoryViewer.tsx` (+ 필요 시 `src/components/story/*`) (생성) | 스토리 뷰어 |
| `src/components/home/OnThisDayCards.tsx` (생성) | 연도 카드 캐러셀 |
| `src/pages/Home.tsx` (재작성) | 새 홈 |
| `src/styles/story.css` (생성), `src/App.tsx` | 스타일 |
| `src/components/OnThisDay.tsx`, `OnThisDayVideoGroup.tsx` (삭제) | |
| vault | 문서 |

---

### Task 1: 스토리 순수 로직 (TDD)

**Files:** Create `src/lib/onThisDayStory.ts`, `src/lib/onThisDayStory.test.ts`

- [ ] **Step 1: 타입**

```ts
export type StoryFrame =
  | { kind: 'moment'; key: string; moment: Moment; video?: Video }
  | { kind: 'video'; key: string; video: Video }                       // 모먼트 없는 영상: 표지 + 제목 + 보러가기
  | { kind: 'photo'; key: string; photo: Photo; title: string }         // 장마다 1개, title은 -N 뗀 묶음 제목
  | { kind: 'post'; key: string; post: Post; media?: PostMedia }        // 미디어마다 1개, 없으면 media 없이 1개
  | { kind: 'episode'; key: string; episode: Episode };

export interface StoryYear { year: number; yearsAgo: number; frames: StoryFrame[] }

export interface StoryData { videos: Video[]; moments: Moment[]; posts: Post[]; photos: Photo[]; episodes: Episode[] }
```

- [ ] **Step 2: 함수와 테스트 (테스트 먼저)**

| 함수 | 규칙 | 테스트할 경우 |
|---|---|---|
| `buildStoryYears(data, today)` | `filterOnThisDay`로 각 도메인 필터. 영상이 그날이면 그 영상 모먼트 전부(정렬: `momentsByVideo`), 영상 없는 모먼트는 자기 날짜. 연도 최신순. 한 해 안 순서: 영상(날짜순)별 모먼트 묶음 → 모먼트 없는 영상 → 사진(묶음별, 장마다) → 포스트(미디어마다, 없으면 1개) → 에피소드. 프레임 0개인 해는 없음. `yearsAgo = 오늘연도 - 연도` | 순서, 연도 내림차순, 오늘 연도 제외, 모먼트가 자기 날짜가 아니라 영상 날짜로 들어오는지, 사진 묶음 제목에서 `-2` 제거, 미디어 없는 포스트 1프레임 |
| `frameDurationMs(frame)` | 사진·영상 카드 5000, 미디어 없는 포스트 5000, 이미지 포스트 5000, 에피소드 `min(20000, 3000 + 700 × 메시지 수)`, 모먼트·영상 포스트는 `null`(영상 길이를 따른다) | 각 타입, 에피소드 상한 |
| `storyDays(data)` | 그 해 오늘이 있는 `MM-DD` 목록(정렬, 중복 없음). 판정은 `buildStoryYears`와 같은 기준이어야 한다 — 내부에서 임의 연도 다음 해를 today로 넣어 확인하지 말고, 각 콘텐츠의 `MM-DD`를 모으되 모먼트는 영상 날짜 | |
| `fallbackDay(today, days)` | 오늘 그 해 오늘이 없을 때 쓸 `MM-DD`. 날짜 문자열 해시로 `days`에서 고정 선택(같은 날 같은 결과, 날이 바뀌면 대개 다른 결과). `days`가 비면 null | 결정적, 빈 목록 |
| `shouldAutoOpen(lastShown, today, hasStory, isFallback)` | `hasStory && !isFallback && lastShown !== today` | 4가지 |
| `latestMoments(moments, n = 9)` | `created_at` 내림차순 n개 | |

`fallbackDay`를 쓸 때 스토리는 `buildStoryYears(data, `${오늘연도}-${MM-DD}`)`로 만든다(오늘 연도 제외 규칙은 그대로).

- [ ] **Step 3: 실패 확인 → 구현 → 통과** — `npx vitest run src/lib/onThisDayStory.test.ts`, `npm test`, `npm run build`
- [ ] **Step 4: 커밋** — `feat(home): 그 해 오늘 스토리 프레임 구성 로직`

---

### Task 2: `useViewerParam` 일반화

- [ ] `useViewerParam(key = 'm')` — 쿼리 키와 "여기서 열었음" state 플래그를 키별로. 반환은 `{ value, open(value), close() }`로 바꾸고, 기존 호출처(`Videos.tsx`, `VideoDetail.tsx`)의 `momentId`를 `value`로 맞춘다(또는 기존 이름 유지 + 별칭 — 호출처가 덜 바뀌는 쪽)
- [ ] `npm run build`, eslint → 커밋 `refactor(moments): 뷰어 쿼리 훅이 키를 받도록`

---

### Task 3: 스토리 뷰어 `StoryViewer`

**구현자는 프로토타입 story 부분을 먼저 읽는다.**

```ts
interface Props {
  years: StoryYear[];
  startYear: number;      // 이 해 첫 프레임부터
  autoStarted: boolean;   // 자동으로 열렸으면 음소거로 시작
  onClose: () => void;
}
```

- [ ] **Step 1: 동작 (스펙 §8.3 전부)**

1. 전체 화면 오버레이(z-index 1000, `100dvh`), body 스크롤 잠금, 언마운트 정리 — `MomentViewer`와 같은 규칙
2. 프레임 렌더:
   - moment: 영상(`object-fit: contain`, 뒤에 흐림 썸네일), 제목 없음, 오른쪽 🔊 ⤓(⤓는 `shareOrDownloadVideo`)
   - video: 표지(`VideoCover`) + 제목 + `보러가기 →`(새 탭)
   - photo: 사진(contain + 흐림 배경) + 하단 제목
   - post: 미디어(이미지/영상) + 하단 `{플랫폼} 에서 보기 ↗` 칩(원문 새 탭) + 본문 2줄 말줄임 + `더보기` → 바텀시트에 전문(시트 열려 있는 동안 멈춤)
   - episode: 채팅 화면. `EpisodeContentBody` 재사용이 자연스러우면 쓰고, 아니면 말풍선 목록(이미지 메시지 포함)
3. 진행: 시간 프레임은 `frameDurationMs`, 영상 프레임은 영상 `ended`. 진행 막대는 **현재 해의 프레임 수만큼**, 현재 막대가 시간/재생 위치에 따라 차오름(requestAnimationFrame)
4. 조작: 오른쪽 2/3 탭 다음, 왼쪽 1/3 이전(해 첫 프레임에서 이전 → 이전 해 마지막), 좌우 스와이프 다음/이전 해 첫 프레임, 250ms 이상 누르면 멈춤·떼면 이어서(이때 탭으로 처리하지 않음), 아래로 쓸면 손가락 따라 내려가다 놓으면 닫힘(일정 거리 미만이면 복귀), ✕, 마지막 해 마지막 프레임 끝 → 닫기. PC 키보드 ←/→ 프레임, ↑/↓ 해, Esc 닫기, Space 멈춤
5. 상단: 진행 막대, 라벨 `YYYY년 오늘 · N년 전`(0년 전이면 생략 — 오늘 연도는 원래 제외), 오른쪽 🔊(영상 프레임일 때만)·✕. 해가 바뀔 때 큰 연도 표시 없음. 하단 재생바 없음
6. 소리: `autoStarted`면 음소거로 시작, 아니면 소리 켜고 시작(막히면 음소거 + 🔇). 상태는 `MomentViewer`와 같은 세션 변수를 공유하도록 작은 모듈(`src/lib/viewerSound.ts`)로 꺼내 둘이 같이 쓴다
7. 미리 받기: 다음 프레임이 영상/이미지면 미리 로드(`saveData`면 하지 않음)
8. 처음 사용 안내(1회, `localStorage['mmemory.storyHintSeen']`): `탭하면 다음 · 옆으로 넘기면 다른 해 · 아래로 쓸면 닫기`
9. 버튼은 배경 없이 아이콘 + 그림자(4단계 뷰어와 같은 모양)

- [ ] **Step 2:** 파일이 400줄을 넘으면 프레임 렌더(`src/components/story/StoryFrameView.tsx`)와 제스처 훅(`src/hooks/useStoryGestures.ts`)으로 나눈다
- [ ] **Step 3:** `npm run build`, `npm test`, eslint(규칙 끄지 않음) → 커밋 `feat(home): 그 해 오늘 스토리 뷰어`

---

### Task 4: 새 홈

**Files:** Create `src/components/home/OnThisDayCards.tsx`; Rewrite `src/pages/Home.tsx`; Delete `src/components/OnThisDay.tsx`, `src/components/OnThisDayVideoGroup.tsx`(다른 곳에서 안 쓰는지 grep 확인), 관련 미사용 CSS

- [ ] **Step 1: 연도 카드 (`OnThisDayCards`)**
  - 가로 스와이프 캐러셀(scroll-snap, 옆 카드 살짝 보임), 카드 3:4
  - 카드: 그 해 첫 프레임 이미지(모먼트·영상 포스트는 썸네일, 영상은 표지, 사진/이미지 포스트는 이미지, 에피소드만 있으면 채팅 아이콘 블록), `YYYY년 오늘`, `N년 전 · M개`, `▶ 넘겨보기`. 첫 카드 위에 `그 해 오늘 · M월 D일`(대체 날이면 `오늘은 기록이 없어요 · 대신 M월 D일`)
  - **보이는 카드만** 첫 프레임이 영상이면 음소거 반복 미리보기(IntersectionObserver, reduced-motion/saveData면 안 함)
  - 2개 연도 이상이면 점 표시, 한 해면 점 없음
  - 탭 → 그 해부터 스토리(`?s=<연도>` push)
- [ ] **Step 2: 홈 구성** — 연도 카드 → 검색(기존 키워드/AI 토글 검색 폼과 동작 그대로 옮김) → `새로 올라온 모먼트` + `모먼트 탭 ›` 링크 → 3열 9개 그리드(3:4 썸네일, 탭 → 그 9개로 `MomentViewer`, `?m=`) → `궁금한 점이나 요청 남기러 가기 →`. 제거: 타이틀 히어로, PICK(featured) 로딩·렌더
- [ ] **Step 3: 자동 스토리** — 데이터가 다 준비되고 `shouldAutoOpen(localStorage['mmemory.storyAutoShownDate'], today, years.length>0, isFallback)`이면 첫 해로 스토리를 연다(push, `autoStarted=true`), 날짜를 기록. localStorage 접근은 try/catch
- [ ] **Step 4: 로딩** — 연도 카드 자리는 같은 크기 스켈레톤(레이아웃 밀림 방지). 그리드 칸 `onPointerDown` 미리 받기는 4단계 상세와 같은 방식
- [ ] **Step 5:** `npm run build`, `npm test`, eslint → 커밋 `feat(home): 그 해 오늘 카드와 새 홈`

---

### Task 5: 화면 확인 (사용자와, 미리보기 주소)

`?date=` 로 날짜 강제: 다연도 날(예 `?date=2026-10-08`), 한 해만 있는 날, 기록 없는 날.

1. 홈 첫 진입 자동 스토리(음소거), 같은 날 다시 오면 안 열림, 기록 없는 날은 안 열림
2. 카드 캐러셀 넘김, 보이는 카드만 미리보기, 점, 대체 날 문구
3. 스토리: 탭 앞/뒤, 좌우 해 이동, 길게 눌러 멈춤, 아래로 쓸어 닫기, ✕, 진행 막대 개수(현재 해), 라벨, 포스트 더보기 시트, 에피소드 채팅, 영상 카드 보러가기, 휴대폰 뒤로가기로 닫힘
4. 새로 올라온 모먼트 그리드 → 뷰어
5. 라이트/다크

### Task 6: 문서

- [x] vault `concepts/on-this-day.md`(홈 표현 방식, 대체 날, 자동 표시), `domains/home-calendar.md`(홈 구성 변경, PICK 렌더 제거 — 어드민 Featured 설정은 남아 있지만 홈에서 안 씀), `log.md`
- [x] 커밋 `docs: 그 해 오늘 스토리·새 홈 반영`

> 완료 메모 (2026-10-28, 2.0.0): 계획과 달리 홈 메인 걸기(Featured)는 어드민 설정까지 코드에서 지웠다(DB 테이블은 남김). 그래서 `home-calendar.md`에는 "PICK·Featured 제거"로 적었다. 도서관 제거, 모먼트 탭 분류 변경, PC 폭 통일도 같은 커밋에서 vault에 반영했다. 홈 그리드는 계획의 `새로 올라온 모먼트`가 아니라 `새로 올라온 영상`(영상 상세 모달)으로 바뀌었다.
