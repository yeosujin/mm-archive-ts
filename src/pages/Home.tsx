import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVideos, getPosts, getMoments, getFeaturedContent } from '../lib/database';
import type { Video, Post, Moment } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';
import PostEmbed from '../components/PostEmbed';
import { SearchIcon, CalendarIcon } from '../components/Icons';

const NAV_ITEMS = [
  { to: '/videos', label: '모먼트' },
  { to: '/posts', label: '포스트' },
  { to: '/episodes', label: '에피소드' },
  { to: '/articles', label: '글' },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredItem, setFeaturedItem] = useState<{ type: string; item: Video | Post | Moment } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFeaturedContent();
  }, []);

  const loadFeaturedContent = async () => {
    try {
      const featured = await getFeaturedContent();

      if (featured.type && featured.content_id) {
        let item: Video | Post | Moment | undefined;

        if (featured.type === 'video') {
          const videos = await getVideos();
          item = videos.find(v => v.id === featured.content_id);
        } else if (featured.type === 'post') {
          const posts = await getPosts();
          item = posts.find(p => p.id === featured.content_id);
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
    <div className="home-page">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-bg" />
        <h1 className="home-title">mmemory</h1>
        <p className="home-subtitle">지나간 시간을 모아두는 곳</p>

        <div className="home-search-row">
          <form onSubmit={handleSearch} className="home-search">
            <input
              type="text"
              className="home-search-input"
              placeholder="검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="home-search-btn" aria-label="검색">
              <SearchIcon size={16} />
            </button>
          </form>
          <Link to="/calendar" className="home-calendar-btn" aria-label="캘린더">
            <CalendarIcon size={18} />
          </Link>
        </div>
      </section>

      {/* Navigation */}
      <nav className="home-nav">
        {NAV_ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className="home-nav-link">
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Featured Content */}
      {!loading && featuredItem?.item && (
        <section className="home-featured">
          <div className="home-featured-header">
            <span className="home-featured-badge">PICK</span>
          </div>
          <div className="home-featured-content">
            {featuredItem.type === 'video' && (
              <VideoEmbed
                url={(featuredItem.item as Video).url}
                title={featuredItem.item.title}
                icon={(featuredItem.item as Video).icon}
                thumbnailUrl={(featuredItem.item as Video).thumbnail_url}
              />
            )}
            {featuredItem.type === 'post' && (
              <PostEmbed
                url={(featuredItem.item as Post).url}
                platform={(featuredItem.item as Post).platform}
              />
            )}
            {featuredItem.type === 'moment' && (
              <VideoEmbed
                url={(featuredItem.item as Moment).tweet_url}
                title={(featuredItem.item as Moment).title}
                thumbnailUrl={(featuredItem.item as Moment).thumbnail_url}
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
