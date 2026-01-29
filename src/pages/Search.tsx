import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getVideos, getMoments, getPosts, getEpisodes } from '../lib/database';
import type { Video, Moment, Post, Episode } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';
import { ArrowRightIcon, VideoIcon, PostIcon, ChatIcon } from '../components/Icons';

type FilterType = 'all' | 'video' | 'moment' | 'post' | 'episode';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [videos, setVideos] = useState<Video[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  // 공사중 - articles 임시 숨김
  // const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [videosData, momentsData, postsData, episodesData] = await Promise.all([
        getVideos(),
        getMoments(),
        getPosts(),
        getEpisodes()
        // 공사중 - articles 임시 숨김
        // getArticles()
      ]);
      setVideos(videosData);
      setMoments(momentsData);
      setPosts(postsData);
      setEpisodes(episodesData);
      // 공사중 - articles 임시 숨김
      // setArticles(articlesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchLower = query.toLowerCase();

  // 각 카테고리에서 검색
  const matchedVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchLower) || v.date.includes(query)
  );
  const matchedMoments = moments.filter(m => 
    m.title.toLowerCase().includes(searchLower) || m.date.includes(query)
  );
  const matchedPosts = posts.filter(p => 
    p.title.toLowerCase().includes(searchLower) || p.date.includes(query)
  );
  const matchedEpisodes = episodes.filter(e => 
    e.title?.toLowerCase().includes(searchLower) || e.date.includes(query)
  );
  // 공사중 - articles 임시 숨김
  // const matchedArticles = articles.filter(a =>
  //   a.title.toLowerCase().includes(searchLower) ||
  //   a.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
  //   a.date.includes(query)
  // );

  const totalResults =
    matchedVideos.length +
    matchedMoments.length +
    matchedPosts.length +
    matchedEpisodes.length;

  if (loading) {
    return (
      <div className="page search-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page search-page">
      <div className="page-header">
        <h1>검색 결과</h1>
        <p className="page-desc">
          "{query}" 검색 결과 {totalResults}건
        </p>
      </div>

      {totalResults === 0 ? (
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

          {/* 공사중 - 글 결과 임시 숨김
          {matchedArticles.length > 0 && (
            <div className="search-section">
              <h2><BookIcon size={18} /> 글 ({matchedArticles.length})</h2>
              <div className="search-list">
                {matchedArticles.map(article => (
                  <a href={article.url} key={article.id} className="search-item" target="_blank" rel="noopener noreferrer">
                    <span className="search-item-title">{article.title}</span>
                    <span className="search-item-date">{article.date}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          */}
        </div>
      )}
    </div>
  );
}
