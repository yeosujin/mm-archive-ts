import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getArticlesVisibility } from '../lib/database';
import type { Video, Moment, Post, Episode, Article } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';
import { ArrowRightIcon, VideoIcon, PostIcon, ChatIcon, BookIcon } from '../components/Icons';
import { useData } from '../hooks/useData';

type FilterType = 'all' | 'video' | 'moment' | 'post' | 'episode' | 'article';

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

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
    fetchArticles,
  } = useData();

  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);
  const [moments, setMoments] = useState<Moment[]>(cachedMoments || []);
  const [posts, setPosts] = useState<Post[]>(cachedPosts || []);
  const [episodes, setEpisodes] = useState<Episode[]>(cachedEpisodes || []);
  const [articles, setArticles] = useState<Article[]>(cachedArticles || []);
  const [articlesVisible, setArticlesVisible] = useState(false);
  const [loading, setLoading] = useState(
    !(cachedVideos && cachedMoments && cachedPosts && cachedEpisodes)
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [inputValue, setInputValue] = useState(query);

  // URL q → 입력창 동기화 (뒤로가기/홈 재진입 등)
  useEffect(() => {
    setInputValue(query);
    setActiveFilter('all');
  }, [query]);

  const loadAllData = useCallback(async () => {
    try {
      const articlesVisibleData = await getArticlesVisibility();
      setArticlesVisible(articlesVisibleData);

      const [videosData, momentsData, postsData, episodesData, articlesData] = await Promise.all([
        fetchVideos(),
        fetchMoments(),
        fetchPosts(),
        fetchEpisodes(),
        articlesVisibleData ? fetchArticles() : Promise.resolve([]),
      ]);
      setVideos(videosData);
      setMoments(momentsData);
      setPosts(postsData);
      setEpisodes(episodesData);
      setArticles(articlesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchArticles]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (trimmed === query) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const trimmedQuery = query.trim();
  const searchLower = trimmedQuery.toLowerCase();

  // 각 카테고리에서 검색 (빈 쿼리는 매칭하지 않음)
  const matchedVideos = trimmedQuery
    ? videos.filter(v => v.title.toLowerCase().includes(searchLower) || v.date.includes(trimmedQuery))
    : [];
  const matchedMoments = trimmedQuery
    ? moments.filter(m => m.title.toLowerCase().includes(searchLower) || m.date.includes(trimmedQuery))
    : [];
  const matchedPosts = trimmedQuery
    ? posts.filter(p => p.title.toLowerCase().includes(searchLower) || p.date.includes(trimmedQuery))
    : [];
  const matchedEpisodes = trimmedQuery
    ? episodes.filter(e => e.title?.toLowerCase().includes(searchLower) || e.date.includes(trimmedQuery))
    : [];
  const matchedArticles = trimmedQuery && articlesVisible
    ? articles.filter(a =>
        a.title.toLowerCase().includes(searchLower) ||
        a.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        a.date.includes(trimmedQuery)
      )
    : [];
  const totalResults =
    matchedVideos.length +
    matchedMoments.length +
    matchedPosts.length +
    matchedEpisodes.length +
    matchedArticles.length;

  const searchBox = (
    <form className="page-controls" onSubmit={handleSubmit}>
      <div className="search-box">
        <input
          type="text"
          className="search-input"
          placeholder="검색어를 입력하세요"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
        />
      </div>
    </form>
  );

  if (loading) {
    return (
      <div className="page search-page">
        <div className="page-header">
          <h1>검색 결과</h1>
          {searchBox}
        </div>
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page search-page">
      <div className="page-header">
        <h1>검색 결과</h1>
        {trimmedQuery && (
          <p className="page-desc">
            "{trimmedQuery}" 검색 결과 {totalResults}건
          </p>
        )}
        {searchBox}
      </div>

      {!trimmedQuery ? (
        <div className="empty-state">
          <p>검색어를 입력해주세요 🔍</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="empty-state">
          <p>검색 결과가 없어요 😢</p>
          <p>다른 키워드로 검색해보세요</p>
        </div>
      ) : (
        <div className="search-results">
          {/* 필터 탭 */}
          <div className="search-filter-tabs">
            <button
              className={`search-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              전체 ({totalResults})
            </button>
            {matchedVideos.length > 0 && (
              <button
                className={`search-filter-tab ${activeFilter === 'video' ? 'active' : ''}`}
                onClick={() => setActiveFilter('video')}
              >
                <VideoIcon size={14} /> 영상 ({matchedVideos.length})
              </button>
            )}
            {matchedMoments.length > 0 && (
              <button
                className={`search-filter-tab ${activeFilter === 'moment' ? 'active' : ''}`}
                onClick={() => setActiveFilter('moment')}
              >
                <VideoIcon size={14} /> 모먼트 ({matchedMoments.length})
              </button>
            )}
            {matchedPosts.length > 0 && (
              <button
                className={`search-filter-tab ${activeFilter === 'post' ? 'active' : ''}`}
                onClick={() => setActiveFilter('post')}
              >
                <PostIcon size={14} /> 포스트 ({matchedPosts.length})
              </button>
            )}
            {matchedEpisodes.length > 0 && (
              <button
                className={`search-filter-tab ${activeFilter === 'episode' ? 'active' : ''}`}
                onClick={() => setActiveFilter('episode')}
              >
                <ChatIcon size={14} /> 에피소드 ({matchedEpisodes.length})
              </button>
            )}
            {matchedArticles.length > 0 && (
              <button
                className={`search-filter-tab ${activeFilter === 'article' ? 'active' : ''}`}
                onClick={() => setActiveFilter('article')}
              >
                <BookIcon size={14} /> 글 ({matchedArticles.length})
              </button>
            )}
          </div>
          {/* 영상 결과 */}
          {matchedVideos.length > 0 && (activeFilter === 'all' || activeFilter === 'video') && (
            <div className="search-section">
              <h2><VideoIcon size={18} /> 영상 ({matchedVideos.length})</h2>
              <div className="search-list">
                {matchedVideos.map(video => (
                  <Link to={`/videos?highlight=${video.id}`} key={video.id} className="search-item">
                    <span className="search-item-title">{video.title}</span>
                    <span className="search-item-date">{video.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 모먼트 결과 */}
          {matchedMoments.length > 0 && (activeFilter === 'all' || activeFilter === 'moment') && (
            <div className="search-section">
              <h2><VideoIcon size={18} /> 모먼트 ({matchedMoments.length})</h2>
              <div className="search-moments-grid">
                {matchedMoments.map(moment => (
                  <div key={moment.id} className="moment-card">
                    <div className="moment-card-header">
                      <h4 className="moment-card-title">{moment.title}</h4>
                      {moment.video_id && (
                        <Link to={`/videos?highlight=${moment.video_id}`} className="moment-card-link">
                          영상 보러가기 <ArrowRightIcon size={14} />
                        </Link>
                      )}
                    </div>
                    <VideoEmbed
                      url={moment.tweet_url}
                      title={moment.title}
                      thumbnailUrl={moment.thumbnail_url}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 포스트 결과 */}
          {matchedPosts.length > 0 && (activeFilter === 'all' || activeFilter === 'post') && (
            <div className="search-section">
              <h2><PostIcon size={18} /> 포스트 ({matchedPosts.length})</h2>
              <div className="search-list">
                {matchedPosts.map(post => (
                  <Link to={`/posts?highlight=${post.id}`} key={post.id} className="search-item">
                    <span className="search-item-title">{post.title || post.platform}</span>
                    <span className="search-item-date">{post.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 에피소드 결과 */}
          {matchedEpisodes.length > 0 && (activeFilter === 'all' || activeFilter === 'episode') && (
            <div className="search-section">
              <h2><ChatIcon size={18} /> 에피소드 ({matchedEpisodes.length})</h2>
              <div className="search-list">
                {matchedEpisodes.map(episode => (
                  <Link to={`/episodes?highlight=${episode.id}`} key={episode.id} className="search-item">
                    <span className="search-item-title">{episode.title || episode.date}</span>
                    <span className="search-item-date">{episode.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 글 결과 - articlesVisible이 true일 때만 표시 */}
          {matchedArticles.length > 0 && (activeFilter === 'all' || activeFilter === 'article') && (
            <div className="search-section">
              <h2><BookIcon size={18} /> 글 ({matchedArticles.length})</h2>
              <div className="search-list">
                {matchedArticles.map(article => (
                  <Link to={`/articles?highlight=${article.id}`} key={article.id} className="search-item">
                    <span className="search-item-title">{article.title}</span>
                    <span className="search-item-date">{article.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
