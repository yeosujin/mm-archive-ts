import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { videos, photos, moments, featuredContent } from '../data/mockData';
import VideoEmbed from '../components/VideoEmbed';
import TweetEmbed from '../components/TweetEmbed';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // 메인 걸기된 컨텐츠 찾기 (에피소드 제외 - DM 형식이라 메인 걸기 X)
  const getFeaturedItem = () => {
    if (!featuredContent.type || !featuredContent.id) return null;
    
    switch (featuredContent.type) {
      case 'video':
        return { type: 'video', item: videos.find(v => v.id === featuredContent.id) };
      case 'photo':
        return { type: 'photo', item: photos.find(p => p.id === featuredContent.id) };
      case 'moment':
        return { type: 'moment', item: moments.find(m => m.id === featuredContent.id) };
      default:
        return null;
    }
  };

  const featured = getFeaturedItem();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="page home-page">
      <div className="hero">
        <h1 className="hero-title">
          <span className="gradient-text">Archive</span>
        </h1>
        <p className="hero-subtitle">모아두는 곳</p>
        
        <form onSubmit={handleSearch} className="home-search">
          <input
            type="text"
            className="home-search-input"
            placeholder="무엇을 찾고 있나요?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="home-search-btn">🔍</button>
        </form>

        <div className="hero-links">
          <Link to="/videos" className="hero-btn primary">
            📹 영상
          </Link>
          <Link to="/moments" className="hero-btn primary">
            ✨ 모먼트
          </Link>
          <Link to="/photos" className="hero-btn primary">
            📷 사진
          </Link>
          <Link to="/episodes" className="hero-btn primary">
            💬 에피소드
          </Link>
          <Link to="/articles" className="hero-btn secondary">
            📝 글
          </Link>
          <Link to="/calendar" className="hero-btn secondary">
            📅 캘린더
          </Link>
        </div>
      </div>

      {/* 메인 걸기 (하나만) */}
      {featured?.item && (
        <div className="featured-section">
          {featured.type === 'video' && (
            <div className="featured-content">
              <VideoEmbed url={(featured.item as typeof videos[0]).url} title={featured.item.title} />
            </div>
          )}
          
          {featured.type === 'photo' && (
            <Link to="/photos" className="featured-content featured-photo">
              <img src={(featured.item as typeof photos[0]).imageUrl} alt={featured.item.title} />
            </Link>
          )}
          
          {featured.type === 'moment' && (
            <div className="featured-content">
              <TweetEmbed tweetUrl={(featured.item as typeof moments[0]).tweetUrl} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
