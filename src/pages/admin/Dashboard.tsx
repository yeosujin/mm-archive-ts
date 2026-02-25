import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getFeaturedContent, setFeaturedContent, getArticlesVisibility, setArticlesVisibility
} from '../../lib/database';

declare const __APP_VERSION__: string;
import type { Video, Moment, Post, Episode, Article } from '../../lib/database';
import { useData } from '../../hooks/useData';
import { VideoIcon, PostIcon, ChatIcon, BookIcon, StarIcon } from '../../components/Icons';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

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
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
  const itemDropdownRef = useRef<HTMLDivElement>(null);
  // 모먼트용 영상 필터
  const [filterVideoId, setFilterVideoId] = useState('');
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [isVideoDropdownOpen, setIsVideoDropdownOpen] = useState(false);
  const videoDropdownRef = useRef<HTMLDivElement>(null);
  const [articlesVisible, setArticlesVisibleState] = useState<boolean>(false);
  const [loading, setLoading] = useState(!cachedVideos || !cachedMoments || !cachedPosts || !cachedEpisodes || !cachedArticles);

  const { toasts, showToast, removeToast } = useToast();

  const loadAllData = useCallback(async () => {
    try {
      const [videosData, momentsData, postsData, episodesData, articlesData, featured, articlesVisibleData] = await Promise.all([
        fetchVideos(),
        fetchMoments(),
        fetchPosts(),
        fetchEpisodes(),
        fetchArticles(),
        getFeaturedContent(),
        getArticlesVisibility()
      ]);

      setVideos(videosData);
      setMoments(momentsData);
      setPosts(postsData);
      setEpisodes(episodesData);
      setArticles(articlesData);
      setArticlesVisibleState(articlesVisibleData);

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

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setIsTypeDropdownOpen(false);
      }
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(e.target as Node)) {
        setIsItemDropdownOpen(false);
      }
      if (videoDropdownRef.current && !videoDropdownRef.current.contains(e.target as Node)) {
        setIsVideoDropdownOpen(false);
      }
    };
    if (isTypeDropdownOpen || isItemDropdownOpen || isVideoDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTypeDropdownOpen, isItemDropdownOpen, isVideoDropdownOpen]);

  // 모먼트용 영상 필터 목록
  const filteredVideosForMoment = useMemo(() => {
    if (!videoSearchQuery.trim()) return videos;
    const q = videoSearchQuery.toLowerCase();
    return videos.filter(v => v.title.toLowerCase().includes(q) || v.date.includes(q));
  }, [videos, videoSearchQuery]);

  // 검색어로 필터링된 항목 목록
  const filteredItems = useMemo(() => {
    let items: (Video | Moment | Post)[] = [];
    switch (selectedType) {
      case 'video': items = videos; break;
      case 'moment':
        items = filterVideoId
          ? moments.filter(m => m.video_id === filterVideoId)
          : moments;
        break;
      case 'post': items = posts; break;
    }
    if (!itemSearchQuery.trim()) return items;
    const q = itemSearchQuery.toLowerCase();
    return items.filter(item => {
      const title = (('platform' in item ? (item.title || item.platform) : item.title) || '').toLowerCase();
      const date = (item.date || '').toLowerCase();
      return title.includes(q) || date.includes(q);
    });
  }, [selectedType, videos, moments, posts, itemSearchQuery, filterVideoId]);

  const handleItemSelect = (id: string) => {
    setSelectedId(id);
    setItemSearchQuery('');
    setIsItemDropdownOpen(false);
  };

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
        showToast('메인 걸기가 저장되었어요!', 'success');
      } catch (error) {
        console.error('Error saving featured content:', error);
        showToast('저장 중 오류가 발생했어요.', 'error');
      }
    }
  };

  const handleClear = async () => {
    try {
      await setFeaturedContent(null, null);
      setSelectedType('');
      setSelectedId('');
      setCurrentFeatured('없음');
      showToast('메인 걸기가 해제되었어요!', 'success');
    } catch (error) {
      console.error('Error clearing featured content:', error);
      showToast('해제 중 오류가 발생했어요.', 'error');
    }
  };

  const handleToggleArticlesVisibility = async () => {
    try {
      const newValue = !articlesVisible;
      await setArticlesVisibility(newValue);
      setArticlesVisibleState(newValue);
      showToast(newValue ? '도서관이 공개되었어요!' : '도서관이 숨겨졌어요!', 'success');
    } catch (error) {
      console.error('Error toggling articles visibility:', error);
      showToast('설정 변경 중 오류가 발생했어요.', 'error');
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
    <>
      <Toast toasts={toasts} onRemove={removeToast} />
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

        <div className="admin-stat-card">
          <span className="admin-stat-icon"><BookIcon size={24} /></span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{articles.length}</span>
            <span className="admin-stat-label">도서관</span>
          </div>
        </div>
      </div>

      {/* 메인 걸기 설정 */}
      <div className="admin-section">
        <h2><StarIcon size={18} /> 홈 메인 걸기</h2>
        <p className="admin-hint" style={{ marginBottom: '1rem' }}>
          현재: <strong>{currentFeatured}</strong>
        </p>
        
        <div className="admin-form" style={{ maxWidth: '100%' }}>
          <div className="featured-select-row">
            <div className="form-group">
              <label>종류</label>
              <div className="searchable-select" ref={typeDropdownRef}>
                <button
                  type="button"
                  className="searchable-select-input type-select-btn"
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                >
                  {selectedType ? (
                    <span className="type-select-label">
                      {selectedType === 'video' && <><VideoIcon size={16} /> 영상</>}
                      {selectedType === 'moment' && <><VideoIcon size={16} /> 모먼트</>}
                      {selectedType === 'post' && <><PostIcon size={16} /> 포스트</>}
                    </span>
                  ) : (
                    <span className="type-select-placeholder">선택하세요</span>
                  )}
                </button>
                {isTypeDropdownOpen && (
                  <div className="searchable-select-dropdown">
                    {[
                      { value: 'video', label: '영상', Icon: VideoIcon },
                      { value: 'moment', label: '모먼트', Icon: VideoIcon },
                      { value: 'post', label: '포스트', Icon: PostIcon },
                    ].map(({ value, label, Icon }) => (
                      <div
                        key={value}
                        className={`searchable-select-option ${selectedType === value ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedType(value);
                          setSelectedId('');
                          setItemSearchQuery('');
                          setIsItemDropdownOpen(false);
                          setFilterVideoId('');
                          setVideoSearchQuery('');
                          setIsVideoDropdownOpen(false);
                          setIsTypeDropdownOpen(false);
                        }}
                      >
                        <Icon size={16} /> {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedType === 'moment' && (
              <div className="form-group">
                <label>영상 선택 (선택사항)</label>
                <div className="searchable-select" ref={videoDropdownRef}>
                  <input
                    type="text"
                    placeholder={filterVideoId
                      ? (() => {
                          const v = videos.find(v => v.id === filterVideoId);
                          return v ? `[${v.date}] ${v.title}` : '영상 검색...';
                        })()
                      : '영상으로 필터 (날짜/제목)'}
                    value={videoSearchQuery}
                    onChange={(e) => {
                      setVideoSearchQuery(e.target.value);
                      setIsVideoDropdownOpen(true);
                    }}
                    onFocus={() => setIsVideoDropdownOpen(true)}
                    className="searchable-select-input"
                  />
                  {filterVideoId && (
                    <button
                      type="button"
                      className="searchable-select-clear"
                      onClick={() => {
                        setFilterVideoId('');
                        setVideoSearchQuery('');
                        setIsVideoDropdownOpen(false);
                        setSelectedId('');
                        setItemSearchQuery('');
                      }}
                    >
                      ✕
                    </button>
                  )}
                  {isVideoDropdownOpen && (
                    <div className="searchable-select-dropdown">
                      <div
                        className={`searchable-select-option ${!filterVideoId ? 'selected' : ''}`}
                        onClick={() => {
                          setFilterVideoId('');
                          setVideoSearchQuery('');
                          setIsVideoDropdownOpen(false);
                          setSelectedId('');
                          setItemSearchQuery('');
                        }}
                      >
                        전체 모먼트
                      </div>
                      {filteredVideosForMoment.map((video) => (
                        <div
                          key={video.id}
                          className={`searchable-select-option ${filterVideoId === video.id ? 'selected' : ''}`}
                          onClick={() => {
                            setFilterVideoId(video.id);
                            setVideoSearchQuery('');
                            setIsVideoDropdownOpen(false);
                            setSelectedId('');
                            setItemSearchQuery('');
                          }}
                        >
                          [{video.date}] {video.title}
                        </div>
                      ))}
                      {filteredVideosForMoment.length === 0 && (
                        <div className="searchable-select-empty">검색 결과 없음</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedType && (
              <div className="form-group">
                <label htmlFor="featured-item">항목</label>
                <div className="searchable-select" ref={itemDropdownRef}>
                  <input
                    type="text"
                    placeholder={selectedId
                      ? (() => {
                          const items = getItemsForType();
                          const found = items.find(i => i.id === selectedId);
                          return found ? `[${found.date}] ${getItemTitle(found)}` : '항목 검색...';
                        })()
                      : '항목 검색 (제목/날짜)'}
                    value={itemSearchQuery}
                    onChange={(e) => {
                      setItemSearchQuery(e.target.value);
                      setIsItemDropdownOpen(true);
                    }}
                    onFocus={() => setIsItemDropdownOpen(true)}
                    className="searchable-select-input"
                  />
                  {selectedId && (
                    <button
                      type="button"
                      className="searchable-select-clear"
                      onClick={() => handleItemSelect('')}
                    >
                      ✕
                    </button>
                  )}
                  {isItemDropdownOpen && (
                    <div className="searchable-select-dropdown">
                      <div
                        className={`searchable-select-option ${!selectedId ? 'selected' : ''}`}
                        onClick={() => handleItemSelect('')}
                      >
                        선택 안함
                      </div>
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className={`searchable-select-option ${selectedId === item.id ? 'selected' : ''}`}
                          onClick={() => handleItemSelect(item.id)}
                        >
                          [{item.date}] {getItemTitle(item)}
                        </div>
                      ))}
                      {filteredItems.length === 0 && (
                        <div className="searchable-select-empty">검색 결과 없음</div>
                      )}
                    </div>
                  )}
                </div>
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

      {/* 도서관 표시/숨김 설정 */}
      <div className="admin-section">
        <h2><BookIcon size={18} /> 도서관 설정</h2>
        <p className="admin-hint" style={{ marginBottom: '1rem' }}>
          현재: <strong>{articlesVisible ? '공개 중' : '숨김 (공사중)'}</strong>
        </p>

        <button
          type="button"
          className={articlesVisible ? 'admin-clear-btn' : 'admin-submit-btn'}
          onClick={handleToggleArticlesVisibility}
          style={{ maxWidth: '200px' }}
        >
          {articlesVisible ? '🚧 도서관 숨기기' : '✅ 도서관 공개하기'}
        </button>
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
            ➕ 도서관
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
