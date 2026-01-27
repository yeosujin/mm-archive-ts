import { useState, useEffect, useCallback } from 'react';
import {
  getFeaturedContent, setFeaturedContent
} from '../../lib/database';

declare const __APP_VERSION__: string;
import type { Video, Moment, Post, Episode, Article } from '../../lib/database';
import { useData } from '../../hooks/useData';

export default function Dashboard() {
  const { 
    videos: cachedVideos, 
    moments: cachedMoments, 
    posts: cachedPosts, 
    episodes: cachedEpisodes, 
    articles: cachedArticles,
    fetchVideos,
    fetchMoments,
    fetchPosts,
    fetchEpisodes,
    fetchArticles
  } = useData();

  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);
  const [moments, setMoments] = useState<Moment[]>(cachedMoments || []);
  const [posts, setPosts] = useState<Post[]>(cachedPosts || []);
  const [episodes, setEpisodes] = useState<Episode[]>(cachedEpisodes || []);
  const [articles, setArticles] = useState<Article[]>(cachedArticles || []);
  
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [currentFeatured, setCurrentFeatured] = useState<string>('없음');
  const [loading, setLoading] = useState(!cachedVideos || !cachedMoments || !cachedPosts || !cachedEpisodes || !cachedArticles);

  const loadAllData = useCallback(async () => {
    try {
      const [videosData, momentsData, postsData, episodesData, articlesData, featured] = await Promise.all([
        fetchVideos(),
        fetchMoments(),
        fetchPosts(),
        fetchEpisodes(),
        fetchArticles(),
        getFeaturedContent()
      ]);
      
      setVideos(videosData);
      setMoments(momentsData);
      setPosts(postsData);
      setEpisodes(episodesData);
      setArticles(articlesData);
      
      // 현재 메인 걸기 정보 설정
      if (featured.type && featured.content_id) {
        setSelectedType(featured.type);
        setSelectedId(featured.content_id);
        updateCurrentFeaturedLabel(featured.type, featured.content_id, videosData, momentsData, postsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchArticles]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Sync with cache
  useEffect(() => { if (cachedVideos) setVideos(cachedVideos); }, [cachedVideos]);
  useEffect(() => { if (cachedMoments) setMoments(cachedMoments); }, [cachedMoments]);
  useEffect(() => { if (cachedPosts) setPosts(cachedPosts); }, [cachedPosts]);
  useEffect(() => { if (cachedEpisodes) setEpisodes(cachedEpisodes); }, [cachedEpisodes]);
  useEffect(() => { if (cachedArticles) setArticles(cachedArticles); }, [cachedArticles]);

  const updateCurrentFeaturedLabel = (
    type: string, 
    contentId: string, 
    videosData: Video[], 
    momentsData: Moment[], 
    postsData: Post[]
  ) => {
    const typeLabel: Record<string, string> = { video: '영상', moment: '모먼트', post: '포스트' };
    let itemTitle = '';
    
    if (type === 'video') {
      const item = videosData.find(v => v.id === contentId);
      itemTitle = item?.title || '';
    } else if (type === 'moment') {
      const item = momentsData.find(m => m.id === contentId);
      itemTitle = item?.title || '';
    } else if (type === 'post') {
      const item = postsData.find(p => p.id === contentId);
      itemTitle = item?.title || item?.platform || '';
    }
    
    setCurrentFeatured(itemTitle ? `${typeLabel[type]}: ${itemTitle}` : '없음');
  };

  const getItemsForType = (): (Video | Moment | Post)[] => {
    switch (selectedType) {
      case 'video': return videos;
      case 'moment': return moments;
      case 'post': return posts;
      default: return [];
    }
  };

  const getItemTitle = (item: Video | Moment | Post) => {
    if ('platform' in item) {
      return item.title || item.platform;
    }
    return item.title;
  };

  const handleSave = async () => {
    if (selectedType && selectedId) {
      try {
        await setFeaturedContent(selectedType, selectedId);
        updateCurrentFeaturedLabel(selectedType, selectedId, videos, moments, posts);
        alert('메인 걸기가 저장되었어요!');
      } catch (error) {
        console.error('Error saving featured content:', error);
        alert('저장 중 오류가 발생했어요.');
      }
    }
  };

  const handleClear = async () => {
    try {
      await setFeaturedContent(null, null);
      setSelectedType('');
      setSelectedId('');
      setCurrentFeatured('없음');
      alert('메인 걸기가 해제되었어요!');
    } catch (error) {
      console.error('Error clearing featured content:', error);
      alert('해제 중 오류가 발생했어요.');
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>대시보드</h1>
      
      <div className="admin-stats">
        <div className="admin-stat-card">
          <span className="admin-stat-icon">📹</span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{videos.length}</span>
            <span className="admin-stat-label">영상</span>
          </div>
        </div>
        
        <div className="admin-stat-card">
          <span className="admin-stat-icon">✨</span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{moments.length}</span>
            <span className="admin-stat-label">모먼트</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon">📱</span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{posts.length}</span>
            <span className="admin-stat-label">포스트</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon">💬</span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{episodes.length}</span>
            <span className="admin-stat-label">에피소드</span>
          </div>
        </div>
        
        <div className="admin-stat-card">
          <span className="admin-stat-icon">📝</span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{articles.length}</span>
            <span className="admin-stat-label">글</span>
          </div>
        </div>
      </div>

      {/* 메인 걸기 설정 */}
      <div className="admin-section">
        <h2>⭐ 홈 메인 걸기</h2>
        <p className="admin-hint" style={{ marginBottom: '1rem' }}>
          현재: <strong>{currentFeatured}</strong>
        </p>
        
        <div className="admin-form" style={{ maxWidth: '100%' }}>
          <div className="featured-select-row">
            <div className="form-group">
              <label htmlFor="featured-type">종류</label>
              <select 
                id="featured-type"
                value={selectedType} 
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setSelectedId('');
                }}
                className="form-select"
              >
                <option value="">선택하세요</option>
                <option value="video">📹 영상</option>
                <option value="moment">✨ 모먼트</option>
                <option value="post">📱 포스트</option>
              </select>
            </div>

            {selectedType && (
              <div className="form-group">
                <label htmlFor="featured-item">항목</label>
                <select 
                  id="featured-item"
                  value={selectedId} 
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="form-select"
                >
                  <option value="">선택하세요</option>
                  {getItemsForType().map((item) => (
                    <option key={item.id} value={item.id}>
                      {getItemTitle(item)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="featured-btn-row">
            <button 
              type="button" 
              className="admin-submit-btn"
              onClick={handleSave}
              disabled={!selectedType || !selectedId}
            >
              메인 걸기 저장
            </button>
            <button 
              type="button" 
              className="admin-clear-btn"
              onClick={handleClear}
            >
              해제
            </button>
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
          <a href="/admin/articles" className="quick-action-btn">
            ➕ 글
          </a>
        </div>
      </div>

      <div className="admin-version">
        v{__APP_VERSION__}
      </div>
    </div>
  );
}
