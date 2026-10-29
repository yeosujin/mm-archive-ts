import { useState, useEffect, useCallback } from 'react';

declare const __APP_VERSION__: string;
import type { Video, Moment, Post, Episode } from '../../lib/database';
import { useData } from '../../hooks/useData';
import { VideoIcon, PostIcon, ChatIcon } from '../../components/Icons';

export default function Dashboard() {
  const { 
    videos: cachedVideos, 
    moments: cachedMoments, 
    posts: cachedPosts, 
    episodes: cachedEpisodes, 
    fetchVideos,
    fetchMoments,
    fetchPosts,
    fetchEpisodes,
  } = useData();

  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);
  const [moments, setMoments] = useState<Moment[]>(cachedMoments || []);
  const [posts, setPosts] = useState<Post[]>(cachedPosts || []);
  const [episodes, setEpisodes] = useState<Episode[]>(cachedEpisodes || []);
  const [loading, setLoading] = useState(!cachedVideos || !cachedMoments || !cachedPosts || !cachedEpisodes);

  const loadAllData = useCallback(async () => {
    try {
      const [videosData, momentsData, postsData, episodesData] = await Promise.all([
        fetchVideos(),
        fetchMoments(),
        fetchPosts(),
        fetchEpisodes(),
      ]);

      setVideos(videosData);
      setMoments(momentsData);
      setPosts(postsData);
      setEpisodes(episodesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchVideos, fetchMoments, fetchPosts, fetchEpisodes]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Sync with cache
  useEffect(() => { if (cachedVideos) setVideos(cachedVideos); }, [cachedVideos]);
  useEffect(() => { if (cachedMoments) setMoments(cachedMoments); }, [cachedMoments]);
  useEffect(() => { if (cachedPosts) setPosts(cachedPosts); }, [cachedPosts]);
  useEffect(() => { if (cachedEpisodes) setEpisodes(cachedEpisodes); }, [cachedEpisodes]);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-page">
        <h1>대시보드</h1>
      
      <div className="admin-stats">
        <div className="admin-stat-card">
          <span className="admin-stat-icon"><VideoIcon size={24} /></span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{videos.length}</span>
            <span className="admin-stat-label">영상</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon"><VideoIcon size={24} /></span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{moments.length}</span>
            <span className="admin-stat-label">모먼트</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon"><PostIcon size={24} /></span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{posts.length}</span>
            <span className="admin-stat-label">포스트</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon"><ChatIcon size={24} /></span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{episodes.length}</span>
            <span className="admin-stat-label">에피소드</span>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <h2>빠른 작업</h2>
        <div className="admin-quick-actions">
          <a href="/admin/videos" className="quick-action-btn">
            ➕ 영상
          </a>
          <a href="/admin/moments" className="quick-action-btn">
            ➕ 모먼트
          </a>
          <a href="/admin/posts" className="quick-action-btn">
            ➕ 포스트
          </a>
          <a href="/admin/episodes" className="quick-action-btn">
            ➕ 에피소드
          </a>
        </div>
      </div>

      <div className="admin-version">
        v{__APP_VERSION__}
      </div>
      </div>
    </>
  );
}
