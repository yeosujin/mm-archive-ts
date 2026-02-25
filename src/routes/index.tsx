import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from '../components/Layout';
import RootLayout from '../components/RootLayout';

// Pages
const Home = lazy(() => import('../pages/Home'));
const Videos = lazy(() => import('../pages/Videos'));
const Moments = lazy(() => import('../pages/Moments'));
const Posts = lazy(() => import('../pages/Posts'));
const Episodes = lazy(() => import('../pages/Episodes'));
const Articles = lazy(() => import('../pages/Articles'));
const Calendar = lazy(() => import('../pages/Calendar'));
const Search = lazy(() => import('../pages/Search'));
const Ask = lazy(() => import('../pages/Ask'));
const AskDetail = lazy(() => import('../pages/AskDetail'));

// Admin
const AdminLayout = lazy(() => import('../components/AdminLayout'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminVideos = lazy(() => import('../pages/admin/AdminVideos'));
const AdminMoments = lazy(() => import('../pages/admin/AdminMoments'));
const AdminPosts = lazy(() => import('../pages/admin/AdminPosts'));
const AdminEpisodes = lazy(() => import('../pages/admin/AdminEpisodes'));
const AdminArticles = lazy(() => import('../pages/admin/AdminArticles'));
const AdminAsks = lazy(() => import('../pages/admin/AdminAsks'));

import PageLoader from '../components/PageLoader';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // 일반 사이트
      {
        path: '/',
        element: <Layout />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <Home />
              </Suspense>
            ),
          },
          {
            path: 'videos',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Videos />
              </Suspense>
            ),
          },
          {
            path: 'moments',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Moments />
              </Suspense>
            ),
          },
          {
            path: 'posts',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Posts />
              </Suspense>
            ),
          },
          {
            path: 'search',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Search />
              </Suspense>
            ),
          },
          {
            path: 'episodes',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Episodes />
              </Suspense>
            ),
          },
          {
            path: 'articles',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Articles />
              </Suspense>
            ),
          },
          {
            path: 'calendar',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Calendar />
              </Suspense>
            ),
          },
          {
            path: 'ask',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Ask />
              </Suspense>
            ),
          },
          {
            path: 'ask/:id',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AskDetail />
              </Suspense>
            ),
          },
        ],
      },

      // 어드민
      {
        path: '/admin',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            ),
          },
          {
            path: 'videos',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminVideos />
              </Suspense>
            ),
          },
          {
            path: 'moments',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminMoments />
              </Suspense>
            ),
          },
          {
            path: 'posts',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminPosts />
              </Suspense>
            ),
          },
          {
            path: 'episodes',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminEpisodes />
              </Suspense>
            ),
          },
          {
            path: 'articles',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminArticles />
              </Suspense>
            ),
          },
          {
            path: 'asks',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminAsks />
              </Suspense>
            ),
          },
        ],
      },

      // 404
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
