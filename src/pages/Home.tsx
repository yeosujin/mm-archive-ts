import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVideos, getPosts, getMoments, getFeaturedContent, getArticlesVisibility } from '../lib/database';
import type { Video, Post, Moment } from '../lib/database';
import PostEmbed from '../components/PostEmbed';
import { SearchIcon, CalendarIcon, ArrowRightIcon, ExternalLinkIcon, VideoIcon } from '../components/Icons';
import { detectVideoPlatform } from '../lib/platformUtils';

// 위버스 멤버 매핑
const WEVERSE_MEMBERS: Record<string, string> = {
  '🤍': '둘만',
  '💙': '모카',
  '🩵': '민주',
  '🖤': '단체',
};

// 플랫폼 이름 매핑
const PLATFORM_NAMES: Record<string, string> = {
  youtube: 'YouTube',
  twitter: 'X',
  weverse: 'Weverse',
  other: '외부 링크',
};

const NAV_ITEMS = [
  { to: '/videos', label: '모먼트' },
  { to: '/posts', label: '포스트' },
  { to: '/episodes', label: '에피소드' },
  { to: '/articles', label: '도서관' },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredItem, setFeaturedItem] = useState<{ type: string; item: Video | Post | Moment } | null>(null);
  const [loading, setLoading] = useState(true);
  const [articlesVisible, setArticlesVisible] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFeaturedContent();
  }, []);

  const loadFeaturedContent = async () => {
    try {
      const visible = await getArticlesVisibility();
      setArticlesVisible(visible);
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

  const handleFeaturedClick = () => {
    if (!featuredItem) return;

    const { type, item } = featuredItem;
    if (type === 'video') {
      navigate(`/videos?highlight=${item.id}`);
    } else if (type === 'post') {
      navigate(`/posts?highlight=${item.id}`);
    } else if (type === 'moment') {
      navigate(`/videos?highlight=${(item as Moment).video_id || item.id}`);
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
        {NAV_ITEMS.filter(item => articlesVisible || item.to !== '/articles').map((item) => (
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
          <div className="home-featured-content" onClick={handleFeaturedClick} style={{ cursor: 'pointer' }}>
            {featuredItem.type === 'video' && (() => {
              const video = featuredItem.item as Video;
              const platform = detectVideoPlatform(video.url);
              const isWeverse = platform === 'weverse';

              return (
                <div className={`video-embed-external ${isWeverse ? 'weverse-link' : ''}`}>
                  <div className="external-link-card">
                    <span className="external-icon">
                      {isWeverse ? (video.icon || '🩵') : <ExternalLinkIcon size={20} />}
                    </span>
                    <div className="external-info">
                      <span className="external-platform">{PLATFORM_NAMES[platform] || '외부 링크'}</span>
                      <span className="external-title">{video.title}</span>
                      {isWeverse && video.icon && (
                        <span className="external-member">{video.icon} {video.icon_text || WEVERSE_MEMBERS[video.icon]}</span>
                      )}
                    </div>
                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="external-btn" onClick={(e) => e.stopPropagation()}>
                      보러가기 <ArrowRightIcon size={14} />
                    </a>
                  </div>
                </div>
              );
            })()}
            {featuredItem.type === 'post' && (
              <PostEmbed
                url={(featuredItem.item as Post).url}
                platform={(featuredItem.item as Post).platform}
              />
            )}
            {featuredItem.type === 'moment' && (() => {
              const moment = featuredItem.item as Moment;

              return (
                <div className="video-embed-external">
                  <div className="external-link-card">
                    <span className="external-icon"><VideoIcon size={20} /></span>
                    <div className="external-info">
                      <span className="external-platform">모먼트</span>
                      <span className="external-title">{moment.title}</span>
                    </div>
                    <a href={moment.tweet_url} target="_blank" rel="noopener noreferrer" className="external-btn" onClick={(e) => e.stopPropagation()}>
                      보러가기 <ArrowRightIcon size={14} />
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}
    </div>
  );
}
