import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Layout() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();

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
            >
              영상
            </NavLink>
            <NavLink 
              to="/moments" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              모먼트
            </NavLink>
            <NavLink 
              to="/photos" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              사진
            </NavLink>
            <NavLink 
              to="/episodes" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              에피소드
            </NavLink>
            <NavLink 
              to="/articles" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              글
            </NavLink>
            <NavLink 
              to="/calendar" 
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              📅
            </NavLink>
          </nav>

          <div className="header-actions">
            <button 
              className="search-toggle"
              onClick={() => setShowSearch(!showSearch)}
              aria-label="검색"
            >
              🔍
            </button>
            
            <button 
              className="theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="테마 변경"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Mobile Menu Toggle */}
            <button 
              className="mobile-menu-toggle"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="메뉴"
            >
              {showMobileMenu ? '✕' : '☰'}
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
                  ✕
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <nav className="mobile-nav">
            <NavLink 
              to="/videos" 
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              📹 영상
            </NavLink>
            <NavLink 
              to="/moments" 
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              ✨ 모먼트
            </NavLink>
            <NavLink 
              to="/photos" 
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              📷 사진
            </NavLink>
            <NavLink 
              to="/episodes" 
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              💬 에피소드
            </NavLink>
            <NavLink 
              to="/articles" 
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              📝 글
            </NavLink>
            <NavLink 
              to="/calendar" 
              className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
              onClick={handleNavClick}
            >
              📅 캘린더
            </NavLink>
          </nav>
        )}
      </header>

      <main className="main">
        <Outlet />
      </main>

      <footer className="footer">
        <p>© 2025 mmemory. Made with 💙</p>
      </footer>
    </div>
  );
}
