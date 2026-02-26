import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { SearchIcon, CalendarIcon, SunIcon, MoonIcon, MenuIcon, CloseIcon, VideoIcon, PostIcon, ChatIcon, BookIcon } from './Icons';
import { useData } from '../hooks/useData';

export default function Layout() {
  const { memberSettings, fetchMemberSettings } = useData();
  const articlesVisible = memberSettings?.articles_visible ?? false;

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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAskPage = location.pathname === '/ask' || location.pathname.startsWith('/ask/');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setShowMobileMenu(false);
    }
  };

  const handleNavClick = () => {
    setShowMobileMenu(false);
  };

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <header className="header">
        <div className="header-content">
          <NavLink to="/" className="logo" onClick={handleNavClick}>
            mmemory
          </NavLink>
          
          {/* Desktop Navigation */}
          <nav className="nav desktop-nav">
            <NavLink
              to="/videos"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/Videos')}
            >
              모먼트
            </NavLink>
            <NavLink 
              to="/posts" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/Posts')}
            >
              포스트
            </NavLink>
            <NavLink 
              to="/episodes" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/Episodes')}
            >
              에피소드
            </NavLink>
            {articlesVisible && (
            <NavLink
              to="/articles"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/Articles')}
            >
              도서관
            </NavLink>
            )}
            <NavLink
              to="/calendar"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/Calendar')}
            >
              <CalendarIcon size={16} />
            </NavLink>
          </nav>

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

          <button
            className="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label="테마 변경"
          >
            {isDarkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>

            {/* Mobile Menu Toggle */}
            {!isAskPage && (
              <button
                className="mobile-menu-toggle"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label="메뉴"
              >
                {showMobileMenu ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
              </button>
            )}

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

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <>
            <div className="mobile-nav-overlay" onClick={() => setShowMobileMenu(false)} />
            <nav className="mobile-nav">
            <NavLink
              to="/videos"
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <VideoIcon size={18} /> 모먼트
            </NavLink>
            <NavLink
              to="/posts"
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <PostIcon size={18} /> 포스트
            </NavLink>
            <NavLink
              to="/episodes"
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <ChatIcon size={18} /> 에피소드
            </NavLink>
            {articlesVisible && (
            <NavLink
              to="/articles"
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <BookIcon size={18} /> 도서관
            </NavLink>
            )}
            <NavLink
              to="/calendar"
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              <CalendarIcon size={18} /> 캘린더
            </NavLink>
          </nav>
          </>
        )}
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <p>© 2026 mmemory. Made with ㅡㅡ</p>
      </footer>
    </div>
  );
}
