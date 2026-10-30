import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { SearchIcon, ArrowUpIcon } from './Icons';
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
  { to: '/calendar', label: '캘린더', end: false, preload: () => import('../pages/Calendar') },
];

// 다크 모드는 기기 설정을 따른다
const DARK_QUERY = '(prefers-color-scheme: dark)';
const subscribeDark = (onChange: () => void) => {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
const getDark = () => window.matchMedia(DARK_QUERY).matches;

const preloadSearch = () => import('../pages/Search');

export default function Layout() {
  const { fetchMemberSettings } = useData();

  useEffect(() => {
    fetchMemberSettings();
  }, [fetchMemberSettings]);
  const isDarkMode = useSyncExternalStore(subscribeDark, getDark);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
  }, [isDarkMode]);
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

  // 돋보기: 검색 화면으로. iOS는 화면이 바뀐 뒤의 focus()로는 키보드를 띄우지 않아서,
  // 누르는 순간 숨은 입력칸에 먼저 focus해 키보드를 띄우고 검색 화면 입력창(autoFocus)이 이어받는다
  const kbProxyRef = useRef<HTMLInputElement>(null);
  const openSearch = () => {
    kbProxyRef.current?.focus({ preventScroll: true });
    navigate('/search');
  };

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <header ref={headerRef} className={`header${headerHidden ? ' header--hidden' : ''}`}>
        {isSearchPage ? (
          <div className="header-content sr-head" ref={setSearchSlot} />
        ) : (
          <div className="header-content header-content--center">
            <span aria-hidden />
            <NavLink to="/" className="logo">
              mmemory
            </NavLink>
            <span className="header-end">
              {/* 홈은 본문에 검색창이 있어 돋보기를 두지 않는다 */}
              {!isAskPage && location.pathname !== '/' && (
                <button
                  type="button"
                  className="header-icon-btn"
                  onClick={openSearch}
                  onPointerDown={preloadSearch}
                  onMouseEnter={preloadSearch}
                  aria-label="검색"
                >
                  <SearchIcon size={20} />
                </button>
              )}
            </span>
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

      <input ref={kbProxyRef} className="kb-proxy" type="text" tabIndex={-1} aria-hidden />

      <EntrySplash />
    </div>
  );
}
