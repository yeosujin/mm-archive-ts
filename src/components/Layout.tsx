import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { SearchIcon, CalendarIcon, SunIcon, MoonIcon, CloseIcon, ArrowUpIcon } from './Icons';
import { useData } from '../hooks/useData';
import EntrySplash from './EntrySplash';

/** 검색 화면은 헤더 첫 줄(로고·아이콘)을 비워 두고, 검색 화면이 자기 검색창을 여기에 띄운다 */
export interface LayoutContext {
  searchSlot: HTMLDivElement | null;
}

// 상단 글자 탭
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

  const [headerHidden, setHeaderHidden] = useState(false);
  const [searchSlot, setSearchSlot] = useState<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // 스크롤 한 곳에서: 맨 위로 버튼 + 아래로 내리면 헤더 숨김, 조금이라도 올리면 다시 보임
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setShowBackToTop(y > 300);
      if (y <= 0) {
        setHeaderHidden(false);
        lastY = y;
        return;
      }
      const delta = y - lastY;
      if (Math.abs(delta) < 6) return; // 잔떨림 무시 — 작은 움직임은 쌓아서 본다
      setHeaderHidden(delta > 0 && y > (headerRef.current?.offsetHeight ?? 0));
      lastY = y;
    };
    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const isAskPage = location.pathname === '/ask' || location.pathname.startsWith('/ask/');
  const isSearchPage = location.pathname === '/search';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
    }
  };

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <header ref={headerRef} className={`header${headerHidden && !showSearch ? ' header--hidden' : ''}`}>
        {isSearchPage ? (
          <div className="header-content sr-head" ref={setSearchSlot} />
        ) : (
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
        )}

        {/* 검색 화면은 어느 탭에도 속하지 않아 탭 줄을 숨긴다 (바로가기는 검색 화면 안에) */}
        {!isAskPage && !isSearchPage && (
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
        <Outlet context={{ searchSlot } satisfies LayoutContext} />
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

      <EntrySplash />
    </div>
  );
}
