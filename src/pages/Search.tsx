import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getVideos, getMoments, getPhotos, getEpisodes, getArticles } from '../lib/database';
import type { Video, Moment, Photo, Episode, Article } from '../lib/database';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [videosData, momentsData, photosData, episodesData, articlesData] = await Promise.all([
        getVideos(),
        getMoments(),
        getPhotos(),
        getEpisodes(),
        getArticles()
      ]);
      setVideos(videosData);
      setMoments(momentsData);
      setPhotos(photosData);
      setEpisodes(episodesData);
      setArticles(articlesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchLower = query.toLowerCase();

  // 각 카테고리에서 검색
  const matchedVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchLower)
  );
  const matchedMoments = moments.filter(m => 
    m.title.toLowerCase().includes(searchLower)
  );
  const matchedPhotos = photos.filter(p => 
    p.title.toLowerCase().includes(searchLower)
  );
  const matchedEpisodes = episodes.filter(e => 
    e.title?.toLowerCase().includes(searchLower)
  );
  const matchedArticles = articles.filter(a => 
    a.title.toLowerCase().includes(searchLower) ||
    a.tags.some(tag => tag.toLowerCase().includes(searchLower))
  );

  const totalResults = 
    matchedVideos.length + 
    matchedMoments.length + 
    matchedPhotos.length + 
    matchedEpisodes.length + 
    matchedArticles.length;

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
          {/* 영상 결과 */}
          {matchedVideos.length > 0 && (
            <div className="search-section">
              <h2>📹 영상 ({matchedVideos.length})</h2>
              <div className="search-list">
                {matchedVideos.map(video => (
                  <Link to="/videos" key={video.id} className="search-item">
                    <span className="search-item-title">{video.title}</span>
                    <span className="search-item-date">{video.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 모먼트 결과 */}
          {matchedMoments.length > 0 && (
            <div className="search-section">
              <h2>✨ 모먼트 ({matchedMoments.length})</h2>
              <div className="search-list">
                {matchedMoments.map(moment => (
                  <Link to="/moments" key={moment.id} className="search-item">
                    <span className="search-item-title">{moment.title}</span>
                    <span className="search-item-date">{moment.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 사진 결과 */}
          {matchedPhotos.length > 0 && (
            <div className="search-section">
              <h2>📷 사진 ({matchedPhotos.length})</h2>
              <div className="search-list">
                {matchedPhotos.map(photo => (
                  <Link to="/photos" key={photo.id} className="search-item">
                    <span className="search-item-title">{photo.title}</span>
                    <span className="search-item-date">{photo.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 에피소드 결과 */}
          {matchedEpisodes.length > 0 && (
            <div className="search-section">
              <h2>💬 에피소드 ({matchedEpisodes.length})</h2>
              <div className="search-list">
                {matchedEpisodes.map(episode => (
                  <Link to="/episodes" key={episode.id} className="search-item">
                    <span className="search-item-title">{episode.title || episode.date}</span>
                    <span className="search-item-date">{episode.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 글 결과 */}
          {matchedArticles.length > 0 && (
            <div className="search-section">
              <h2>📝 글 ({matchedArticles.length})</h2>
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
        </div>
      )}
    </div>
  );
}
