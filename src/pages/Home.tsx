import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVideos, getPhotos, getMoments, getFeaturedContent } from '../lib/database';
import type { Video, Photo, Moment } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';
import TwitterVideoEmbed from '../components/TwitterVideoEmbed';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredItem, setFeaturedItem] = useState<{ type: string; item: Video | Photo | Moment } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFeaturedContent();
  }, []);

  const loadFeaturedContent = async () => {
    try {
      const featured = await getFeaturedContent();
      
      if (featured.type && featured.content_id) {
        let item: Video | Photo | Moment | undefined;
        
        if (featured.type === 'video') {
          const videos = await getVideos();
          item = videos.find(v => v.id === featured.content_id);
        } else if (featured.type === 'photo') {
          const photos = await getPhotos();
          item = photos.find(p => p.id === featured.content_id);
        } else if (featured.type === 'moment') {
          const moments = await getMoments();
          item = moments.find(m => m.id === featured.content_id);
        }
        
        if (item) {
          setFeaturedItem({ type: featured.type, item });
        }
      }
    } catch (error) {
      console.error('Error loading featured content:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <span className="gradient-text">mmemory</span>
        </h1>
        <p className="hero-subtitle">지나간 시간을 모아두는 곳</p>
        
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
      {!loading && featuredItem?.item && (
        <div className="featured-section">
          {featuredItem.type === 'video' && (
            <div className="featured-content">
              <VideoEmbed url={(featuredItem.item as Video).url} title={featuredItem.item.title} />
            </div>
          )}
          
          {featuredItem.type === 'photo' && (
            <Link to="/photos" className="featured-content featured-photo">
              <img src={(featuredItem.item as Photo).image_url} alt={featuredItem.item.title} />
            </Link>
          )}
          
          {featuredItem.type === 'moment' && (
            <div className="featured-content">
              <TwitterVideoEmbed tweetUrl={(featuredItem.item as Moment).tweet_url} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
