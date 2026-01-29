import { NavLink, Outlet } from 'react-router-dom';
import AdminAuth from './AdminAuth';
import { VideoIcon, PostIcon, ChatIcon, BookIcon, DashboardIcon } from './Icons';

export default function AdminLayout() {
  return (
    <AdminAuth>
      <div className="admin-container">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <DashboardIcon size={16} /> 대시보드
            </NavLink>
            <NavLink
              to="/admin/videos"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminVideos')}
            >
              <VideoIcon size={16} /> 영상
            </NavLink>
            <NavLink
              to="/admin/moments"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminMoments')}
            >
              <VideoIcon size={16} /> 모먼트
            </NavLink>
            <NavLink
              to="/admin/posts"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminPosts')}
            >
              <PostIcon size={16} /> 포스트
            </NavLink>
            <NavLink
              to="/admin/episodes"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminEpisodes')}
            >
              <ChatIcon size={16} /> 에피소드
            </NavLink>
            <NavLink
              to="/admin/articles"
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
              onMouseEnter={() => import('../pages/admin/AdminArticles')}
            >
              <BookIcon size={16} /> 도서관
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
