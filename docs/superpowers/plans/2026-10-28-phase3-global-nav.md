# 3단계 전역 네비게이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 ☰ 메뉴와 데스크톱 전용 네비 2벌을 없애고, 모든 화면 크기에서 같은 **헤더 + 상단 글자 탭** 한 벌로 통일한다. 홈의 메뉴 칩 줄도 없앤다.

**Architecture:** `src/components/Layout.tsx`만 고친다. 헤더 한 줄(로고 · ⌕ · 📅 · 테마) 아래에 탭 한 줄(홈 · 모먼트 · 포스트 · 사진 · 에피소드)을 같은 sticky `<header>` 안에 둔다. 탭은 `NavLink`의 active 상태로 밑줄을 그린다. 라우트는 바꾸지 않는다. 도서관은 탭에서 빼고 라우트만 남긴다.

**Tech Stack:** React 19, react-router-dom 7 `NavLink`, `src/App.css`.

**배포:** 하지 않는다. 3~5단계는 develop에 쌓아 2.0.0에서 한 번에 배포한다(스펙 §3). 버전도 올리지 않는다. 실기기 확인은 로컬 개발 서버 또는 사용자가 허락한 경우 Vercel 미리보기 주소로 한다.

**스펙:** `docs/superpowers/specs/2026-10-27-immersive-ui-design.md` §6

---

## 사전 사실 (2026-10-28)

- `Layout.tsx`(235줄): 헤더 안에 `.desktop-nav`(768px 이상), `.mobile-menu-toggle` + `.mobile-nav` 오버레이(768px 미만) 2벌. 도서관은 `memberSettings.articles_visible`로 가린다(현재 false)
- 헤더 오른쪽: 검색 토글(누르면 헤더 안에 입력칸, 제출 시 `/search?q=`), 테마 토글. `/ask`, `/ask/:id`에서는 검색·메뉴 버튼을 숨긴다
- `Layout`의 `fetchMemberSettings()` 호출은 그대로 둔다 — `OnThisDay` 등이 컨텍스트의 `memberSettings`를 읽는다
- 홈(`src/pages/Home.tsx`)에 `NAV_ITEMS` 칩 줄(`.home-nav`) + 캘린더 칩. `articlesVisible`/`getArticlesVisibility`는 이 칩 줄에서만 쓰인다
- CSS(`src/App.css`): `.nav`(97), `.desktop-nav`(103~112), `.mobile-menu-toggle`(114~139), `.mobile-nav-overlay`·`.mobile-nav`·`.mobile-nav-link`(141~195), `.nav-link`(197~218, 그리고 1024px 미디어쿼리 안 1654), `.home-nav`·`.home-nav-link`(489~517), `.home-nav-calendar`(6685~) — 이번 변경 후 전부 미사용
- 컴포넌트 테스트 환경은 없다(vitest는 node 환경). 화면 검증은 빌드 + 실제 브라우저 확인

## 파일 구조

| 파일 | 변경 |
|---|---|
| `src/components/Layout.tsx` | 헤더·탭 한 벌로 재작성 |
| `src/App.css` | 탭 스타일 추가, 미사용 네비 스타일 삭제 |
| `src/pages/Home.tsx` | 메뉴 칩 줄 삭제 |
| vault `domains/_index.md`, `domains/settings.md`, `architecture/directory-structure.md`, `log.md` | 네비 설명 갱신 |

---

### Task 1: Layout 헤더·탭 한 벌로

**Files:**
- Modify: `src/components/Layout.tsx` (전체)

- [ ] **Step 1: Layout 재작성**

`src/components/Layout.tsx`를 아래로 바꾼다. 검색 토글·테마 토글·맨 위로 버튼·푸터·`/ask` 숨김은 기존 동작 그대로다.

```tsx
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SearchIcon, CalendarIcon, SunIcon, MoonIcon, CloseIcon, ArrowUpIcon } from './Icons';
import { useData } from '../hooks/useData';

// 상단 글자 탭. 도서관은 탭에서 뺐다 — 라우트(/articles)는 남아 있어 주소로는 들어갈 수 있다
const TABS = [
  { to: '/', label: '홈', end: true, preload: undefined },
  { to: '/videos', label: '모먼트', end: false, preload: () => import('../pages/Videos') },
  { to: '/posts', label: '포스트', end: false, preload: () => import('../pages/Posts') },
  { to: '/photos', label: '사진', end: false, preload: () => import('../pages/Photos') },
  { to: '/episodes', label: '에피소드', end: false, preload: () => import('../pages/Episodes') },
];

export default function Layout() {
  const { fetchMemberSettings } = useData();

  useEffect(() => {
    fetchMemberSettings();
  }, [fetchMemberSettings]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const isAskPage = location.pathname === '/ask' || location.pathname.startsWith('/ask/');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
    }
  };

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <header className="header">
        <div className="header-content">
          <NavLink to="/" className="logo">
            mmemory
          </NavLink>

          <div className="header-actions">
            {!isAskPage && (
              <button
                className="search-toggle"
                onClick={() => setShowSearch(!showSearch)}
                aria-label="검색"
              >
                <SearchIcon size={18} />
              </button>
            )}

            {!isAskPage && (
              <NavLink
                to="/calendar"
                className={({ isActive }) => `search-toggle calendar-link ${isActive ? 'active' : ''}`}
                aria-label="캘린더"
                onMouseEnter={() => import('../pages/Calendar')}
              >
                <CalendarIcon size={18} />
              </NavLink>
            )}

            <button
              className="theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="테마 변경"
            >
              {isDarkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>

            {showSearch && (
              <form onSubmit={handleSearch} className="header-search">
                <input
                  type="text"
                  className="header-search-input"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <button type="button" className="search-close" onClick={() => setShowSearch(false)}>
                  <CloseIcon size={16} />
                </button>
              </form>
            )}
          </div>
        </div>

        {!isAskPage && (
          <nav className="top-tabs" aria-label="메뉴">
            {TABS.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => `top-tab ${isActive ? 'active' : ''}`}
                onMouseEnter={tab.preload}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <p>© 2026 mmemory. Made with ㅡㅡ</p>
      </footer>

      <button
        className={`back-to-top ${showBackToTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="맨 위로"
      >
        <ArrowUpIcon size={18} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 빌드·린트**

Run: `npm run build && npx eslint src/components/Layout.tsx`
Expected: 성공, 에러 없음(미사용 import 없음)

- [ ] **Step 3: 커밋**

```bash
git add src/components/Layout.tsx
git commit -m "feat(nav): 헤더와 상단 글자 탭 한 벌로 통일, ☰ 메뉴 제거"
```

---

### Task 2: 탭 스타일 + 미사용 네비 스타일 삭제

**Files:**
- Modify: `src/App.css`

- [ ] **Step 1: 미사용 스타일 삭제**

아래 규칙을 지운다(사전 사실의 줄 번호는 참고용 — 선택자로 찾는다). 지우기 전에 각 선택자를 `grep -rn "<클래스명>" src --include=*.tsx`로 검색해 쓰는 곳이 없는지 확인한다.

- `.nav { … }`
- `/* Desktop nav - hide on mobile */` 주석과 `.desktop-nav` 규칙, 그 768px 미디어쿼리 블록
- `/* Mobile Menu Toggle */` 주석과 `.mobile-menu-toggle`, `.mobile-menu-toggle:hover`, 그 768px 미디어쿼리 블록
- `/* Mobile Navigation */` 주석과 `.mobile-nav-overlay`, `.mobile-nav`, `.mobile-nav-link`(+`:hover`, `.active`), 그 768px 미디어쿼리 블록
- `.nav-link`, `.nav-link:hover`, `.nav-link.active`
- 1024px 미디어쿼리 안의 `.nav-link { padding: … }` 블록만(미디어쿼리 자체와 다른 규칙은 남긴다)
- `/* Navigation - Pill Style */` 주석과 `.home-nav`, `.home-nav-link`, `.home-nav-link:active`
- `/* 캘린더를 메뉴 줄로 (아이콘 pill) */` 주석과 `.home-nav-calendar`

`@keyframes slideDown`은 다른 곳에서 쓰는지 `grep -n "slideDown" src/App.css src/styles/*.css`로 확인하고, `.mobile-nav`만 썼다면 같이 지운다.

- [ ] **Step 2: 탭 스타일 추가**

`.header-search-input::placeholder { … }` 규칙 바로 다음에 추가:

```css
/* ===== 상단 글자 탭 ===== */
.top-tabs {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--container-padding);
  display: flex;
  gap: 1.25rem;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.top-tabs::-webkit-scrollbar {
  display: none;
}

.top-tab {
  flex: none;
  padding: 0.25rem 0 0.625rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9375rem;
  font-weight: 500;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  -webkit-tap-highlight-color: transparent;
}

.top-tab:hover {
  color: var(--text-primary);
}

.top-tab.active {
  color: var(--text-primary);
  font-weight: 700;
  border-bottom-color: var(--text-primary);
}

/* 캘린더는 검색 버튼과 같은 원형 버튼. 캘린더 화면에서는 강조 */
.calendar-link {
  text-decoration: none;
}

.calendar-link.active {
  background: var(--accent-soft);
}
```

- [ ] **Step 3: 빌드**

Run: `npm run build`
Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add src/App.css
git commit -m "style(nav): 상단 탭 스타일 추가, 쓰지 않는 메뉴 스타일 정리"
```

---

### Task 3: 홈 메뉴 칩 줄 삭제

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: 삭제**

- `{/* Navigation */}` 주석과 `<nav className="home-nav">…</nav>` 블록 전체
- `const NAV_ITEMS = [ … ];`
- `const [articlesVisible, setArticlesVisible] = useState(false);`
- `loadFeaturedContent` 안의 `const visible = await getArticlesVisibility();`와 `setArticlesVisible(visible);`
- import에서 `getArticlesVisibility` 제거
- `CalendarIcon`이 파일에서 더 이상 쓰이지 않으면 Icons import에서 제거

다른 코드(검색바, AI 모드, `OnThisDay`, 요청 링크, PICK fallback)는 건드리지 않는다 — 홈 개편은 5단계다.

- [ ] **Step 2: 빌드·린트·테스트**

Run: `npm run build && npx eslint src/pages/Home.tsx && npm test`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add src/pages/Home.tsx
git commit -m "feat(home): 상단 탭으로 대체된 메뉴 칩 줄 삭제"
```

---

### Task 4: 화면 확인 (컨트롤러, 사용자와 함께)

자동 테스트로는 못 본다. 컨트롤러가 직접 하거나, 브라우저 도구가 없으면 사용자에게 요청한다.

- [ ] **Step 1: 개발 서버**

Run: `npm run dev -- --host` (같은 와이파이의 휴대폰에서 `http://<맥 IP>:5173` 접속 가능)

- [ ] **Step 2: 확인 목록** — 폭 375px(모바일), 768px, 1280px에서

1. 헤더 한 줄: 왼쪽 로고, 오른쪽 ⌕ · 📅 · 테마. ☰ 버튼이 없다
2. 탭 한 줄: 홈 · 모먼트 · 포스트 · 사진 · 에피소드. 현재 화면 탭만 굵게 + 밑줄. `/`에서는 홈만 활성(다른 탭 페이지에서 홈이 같이 활성되지 않음)
3. 375px에서 탭이 넘치면 가로로 스크롤되고 페이지 전체는 가로로 밀리지 않는다
4. 헤더+탭이 스크롤해도 위에 붙어 있다(sticky), 다크 모드에서도 배경이 맞다
5. ⌕ 누르면 입력칸이 뜨고 제출하면 `/search?q=`로 간다. 📅는 `/calendar`로 가고, 캘린더 화면에서 강조된다
6. `/ask`에서는 ⌕ · 📅 · 탭이 숨는다
7. 홈에 메뉴 칩 줄이 없다
8. `/articles` 주소로는 여전히 들어가진다
9. 각 탭 페이지 상단 여백이 어색하지 않다(헤더가 한 줄 높아졌으므로 페이지 자체 sticky 요소가 헤더에 가려지지 않는지 — 특히 모먼트·사진 페이지의 필터 바)

- [ ] **Step 3: 문제 수정** — 9번처럼 페이지별 sticky 요소의 `top` 값이 헤더 높이에 걸려 있으면 그 값을 새 헤더 높이에 맞춘다. 고친 내용은 커밋 `fix(nav): …`로 남긴다

---

### Task 5: 문서

**Files:**
- Modify: `knowledge-vault/wiki/domains/_index.md`(28줄), `knowledge-vault/wiki/domains/settings.md`(32줄), `knowledge-vault/wiki/log.md`

- [ ] **Step 1: `domains/_index.md`** 28줄을 바꾼다:

```markdown
네비는 `src/components/Layout.tsx`의 헤더 + 상단 글자 탭 한 벌(모든 화면 크기 공통)이다. 탭: 홈 · 모먼트 · 포스트 · 사진 · 에피소드. 검색과 캘린더는 헤더 오른쪽 아이콘. 도서관(`/articles`), `moments`, `ask`는 탭에 없고 URL로만 들어간다.
```

- [ ] **Step 2: `domains/settings.md`** 32줄의 다섯 곳 목록에서 `Layout.tsx`(네비)와 `Home.tsx`를 빼고, "네비는 더 이상 `articles_visible`을 읽지 않는다(도서관은 탭에 없음)"를 덧붙인다. 남는 곳: `Search.tsx`, `Calendar.tsx`, `Articles.tsx` — 실제로 `grep -rn "articles_visible\|getArticlesVisibility\|articlesVisible" src`로 확인해 그 결과대로 적는다

- [ ] **Step 3: log.md 최상단 항목**

```markdown
## 2026-10-28 — 전역 네비 통일 (3단계, 2.0.0 대기)

데스크톱 네비·모바일 ☰ 메뉴 2벌을 헤더 + 상단 글자 탭 한 벌로 합쳤다. 홈의 메뉴 칩 줄 삭제. 도서관은 탭에서 빠지고 라우트만 남았다.
배포하지 않음 — 3~5단계는 2.0.0에서 함께 나간다 → [[_index|domains]] · [[settings]]

---
```

- [ ] **Step 4: 커밋**

```bash
git add knowledge-vault
git commit -m "docs: 전역 네비 통일 반영"
```
