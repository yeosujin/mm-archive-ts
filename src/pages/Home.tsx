import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFeaturedContent, getArticlesVisibility } from '../lib/database';
import type { Video, Post, Moment } from '../lib/database';
import PostEmbed from '../components/PostEmbed';
import VideoEmbed from '../components/VideoEmbed';
import { SearchIcon, CalendarIcon, ArrowRightIcon, ExternalLinkIcon } from '../components/Icons';
import { detectVideoPlatform } from '../lib/platformUtils';
import { useData } from '../hooks/useData';
import OnThisDay from '../components/OnThisDay';

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
  const [linkedVideo, setLinkedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [articlesVisible, setArticlesVisible] = useState(false);
  const navigate = useNavigate();
  const { fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchMemberSettings } = useData();

  useEffect(() => {
    loadFeaturedContent();
    // OnThisDay 섹션이 필요한 데이터를 캐시에 적재
    fetchVideos().catch(() => {});
    fetchMoments().catch(() => {});
    fetchPosts().catch(() => {});
    fetchEpisodes().catch(() => {});
    fetchMemberSettings().catch(() => {});
  }, [fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchMemberSettings]);

  const loadFeaturedContent = async () => {
    try {
      const visible = await getArticlesVisibility();
      setArticlesVisible(visible);
      const featured = await getFeaturedContent();

      if (featured.type && featured.content_id) {
        let item: Video | Post | Moment | undefined;

        if (featured.type === 'video') {
          const videos = await fetchVideos();
          item = videos.find(v => v.id === featured.content_id);
        } else if (featured.type === 'post') {
          const posts = await fetchPosts();
          item = posts.find(p => p.id === featured.content_id);
        } else if (featured.type === 'moment') {
          const [moments, videos] = await Promise.all([fetchMoments(), fetchVideos()]);
          item = moments.find(m => m.id === featured.content_id);
          if (item && (item as Moment).video_id) {
            setLinkedVideo(videos.find(v => v.id === (item as Moment).video_id) || null);
          }
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

  const renderFeatured = () => {
    if (!featuredItem?.item) return null;
    return (
      <section className="home-featured">
        <div className="home-featured-header">
          <span className="home-featured-badge">PICK</span>
        </div>
        <div
          className="home-featured-content"
          onClick={featuredItem.type !== 'moment' ? handleFeaturedClick : undefined}
          style={featuredItem.type !== 'moment' ? { cursor: 'pointer' } : undefined}
        >
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
            const video = linkedVideo;
            const platform = video ? detectVideoPlatform(video.url) : null;

            return (
              <div>
                <Link
                  to={`/videos?highlight=${moment.video_id || moment.id}&moment=${moment.id}`}
                  className="home-featured-moment-more"
                  onClick={(e) => e.stopPropagation()}
                >
                  모먼트 더보기 <ArrowRightIcon size={12} />
                </Link>
                <VideoEmbed url={moment.tweet_url} title={moment.title} thumbnailUrl={moment.thumbnail_url} priority />
                {video && platform && (
                  <div className={`video-embed-external ${platform === 'weverse' ? 'weverse-link' : ''}`}>
                    <div className="external-link-card">
                      <span className="external-icon">
                        {platform === 'weverse' ? (video.icon || '🩵') : <ExternalLinkIcon size={20} />}
                      </span>
                      <div className="external-info">
                        <span className="external-platform">{PLATFORM_NAMES[platform] || '외부 링크'}</span>
                        <span className="external-title">{video.title}</span>
                      </div>
                      <a href={video.url} target="_blank" rel="noopener noreferrer" className="external-btn" onClick={(e) => e.stopPropagation()}>
                        보러가기 <ArrowRightIcon size={14} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </section>
    );
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

      {/* 그 해 오늘 — 콘텐츠 0개면 기존 Featured(PICK) 섹션을 fallback으로 렌더 */}
      {!loading && (
        <OnThisDay fallback={featuredItem?.item ? renderFeatured() : null} />
      )}

      <div className="home-ask-link">
        <Link to="/ask" className="home-ask-btn">
          궁금한 점이나 요청 남기러가기 <ArrowRightIcon size={12} />
        </Link>
      </div>
    </div>
  );
}
