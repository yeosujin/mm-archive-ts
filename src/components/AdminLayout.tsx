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
            >
              📹 영상
            </NavLink>
            <NavLink 
              to="/admin/moments" 
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              ✨ 모먼트
            </NavLink>
            <NavLink 
              to="/admin/photos" 
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              📷 사진
            </NavLink>
            <NavLink 
              to="/admin/episodes" 
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              🎬 에피소드
            </NavLink>
            <NavLink 
              to="/admin/articles" 
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
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
