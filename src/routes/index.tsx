import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Home from '../pages/Home';
import Videos from '../pages/Videos';
import Moments from '../pages/Moments';
import Posts from '../pages/Posts';
import Episodes from '../pages/Episodes';
import Articles from '../pages/Articles';
import Calendar from '../pages/Calendar';
import Search from '../pages/Search';

// Admin
import AdminLayout from '../components/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import AdminVideos from '../pages/admin/AdminVideos';
import AdminMoments from '../pages/admin/AdminMoments';
import AdminPosts from '../pages/admin/AdminPosts';
import AdminEpisodes from '../pages/admin/AdminEpisodes';
import AdminArticles from '../pages/admin/AdminArticles';

export const router = createBrowserRouter([
  // 일반 사이트
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'videos',
        element: <Videos />,
      },
      {
        path: 'moments',
        element: <Moments />,
      },
      {
        path: 'posts',
        element: <Posts />,
      },
      {
        path: 'search',
        element: <Search />,
      },
      {
        path: 'episodes',
        element: <Episodes />,
      },
      {
        path: 'articles',
        element: <Articles />,
      },
      {
        path: 'calendar',
        element: <Calendar />,
      },
    ],
  },
  
  // 어드민
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'videos',
        element: <AdminVideos />,
      },
      {
        path: 'moments',
        element: <AdminMoments />,
      },
      {
        path: 'posts',
        element: <AdminPosts />,
      },
      {
        path: 'episodes',
        element: <AdminEpisodes />,
      },
      {
        path: 'articles',
        element: <AdminArticles />,
      },
    ],
  },

  // 404
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
