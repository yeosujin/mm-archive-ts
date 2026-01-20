import { NavLink, Outlet } from 'react-router-dom';
import AdminAuth from './AdminAuth';

export default function AdminLayout() {
  return (
    <AdminAuth>
      <div className="admin-container">
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <NavLink to="/">← 사이트로</NavLink>
          </div>
          <nav className="admin-nav">
            <NavLink 
              to="/admin" 
              end
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              📊 대시보드
            </NavLink>
            <NavLink 
              to="/admin/videos" 
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminVideos')}
            >
              📹 영상
            </NavLink>
            <NavLink 
              to="/admin/moments" 
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminMoments')}
            >
              ✨ 모먼트
            </NavLink>
            <NavLink 
              to="/admin/posts" 
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminPosts')}
            >
              📱 포스트
            </NavLink>
            <NavLink 
              to="/admin/episodes" 
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminEpisodes')}
            >
              🎬 에피소드
            </NavLink>
            <NavLink 
              to="/admin/articles" 
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminArticles')}
            >
              📰 글
            </NavLink>
          </nav>
        </aside>
        
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </AdminAuth>
  );
}
