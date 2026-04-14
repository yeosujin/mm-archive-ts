import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFeaturedContent, getArticlesVisibility } from '../lib/database';
import type { Video, Post, Moment } from '../lib/database';
import PostEmbed from '../components/PostEmbed';
import VideoEmbed from '../components/VideoEmbed';
import { SearchIcon, CalendarIcon, ArrowRightIcon, ExternalLinkIcon } from '../components/Icons';
import { detectVideoPlatform } from '../lib/platformUtils';
import { useData } from '../hooks/useData';
import { getTodayString, pickByDateSeed, filterOnThisDay, groupByYearDesc } from '../lib/dailyPick';

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
  const [articlesVisible, setArticlesVisible] = useState(true);
  const navigate = useNavigate();
  const { fetchVideos, fetchMoments, fetchPosts } = useData();
  const [videos, setVideos] = useState<Video[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    loadFeaturedContent();
  }, []);

  const loadFeaturedContent = async () => {
    try {
      const visible = await getArticlesVisibility();
      setArticlesVisible(visible);

      const [featured, videosData, momentsData, postsData] = await Promise.all([
        getFeaturedContent(),
        fetchVideos(),
        fetchMoments(),
        fetchPosts(),
      ]);
      setVideos(videosData);
      setMoments(momentsData);
      setPosts(postsData);

      if (featured.type && featured.content_id) {
        let item: Video | Post | Moment | undefined;

        if (featured.type === 'video') {
          item = videosData.find(v => v.id === featured.content_id);
        } else if (featured.type === 'post') {
          item = postsData.find(p => p.id === featured.content_id);
        } else if (featured.type === 'moment') {
          item = momentsData.find(m => m.id === featured.content_id);
          if (item && (item as Moment).video_id) {
            setLinkedVideo(videosData.find(v => v.id === (item as Moment).video_id) || null);
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

  // 오늘의 추천: 날짜 시드 기반 결정론적 픽 (videos + moments 풀에서)
  const today = useMemo(() => getTodayString(), []);
  const dailyPick = useMemo(() => {
    if (videos.length === 0 && moments.length === 0) return null;
    // 영상 70% / 모먼트 30% 비중으로 풀 구성
    const pool: Array<{ type: 'video'; item: Video } | { type: 'moment'; item: Moment }> = [
      ...videos.map(v => ({ type: 'video' as const, item: v })),
      ...moments.map(m => ({ type: 'moment' as const, item: m })),
    ];
    return pickByDateSeed(pool, today);
  }, [videos, moments, today]);

  const dailyPickLinkedVideo = useMemo(() => {
    if (!dailyPick || dailyPick.type !== 'moment') return null;
    const m = dailyPick.item;
    return m.video_id ? videos.find(v => v.id === m.video_id) || null : null;
  }, [dailyPick, videos]);

  // N년 전 오늘: 같은 월/일 콘텐츠
  type OnThisDayEntry =
    | { type: 'video'; date: string; item: Video }
    | { type: 'moment'; date: string; item: Moment }
    | { type: 'post'; date: string; item: Post };
  const onThisDay = useMemo<Array<[string, OnThisDayEntry[]]>>(() => {
    const vids: OnThisDayEntry[] = filterOnThisDay(videos, today).map(v => ({ type: 'video', date: v.date, item: v }));
    const moms: OnThisDayEntry[] = filterOnThisDay(moments, today).map(m => ({ type: 'moment', date: m.date, item: m }));
    const pts: OnThisDayEntry[] = filterOnThisDay(posts, today).map(p => ({ type: 'post', date: p.date, item: p }));
    return groupByYearDesc([...vids, ...moms, ...pts]);
  }, [videos, moments, posts, today]);

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
          <div className="home-featured-content" onClick={featuredItem.type !== 'moment' ? handleFeaturedClick : undefined} style={featuredItem.type !== 'moment' ? { cursor: 'pointer' } : undefined}>
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
                  <VideoEmbed url={moment.tweet_url} title={moment.title} thumbnailUrl={moment.thumbnail_url} />
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
      )}

      {/* 오늘의 추천 (날짜 시드 기반) */}
      {!loading && dailyPick && (
        <section className="home-daily-pick">
          <div className="home-section-header">
            <span className="home-section-badge">오늘의 모먼트</span>
            <span className="home-section-date">{today}</span>
          </div>
          <div className="home-daily-pick-content">
            {dailyPick.type === 'video' && (() => {
              const video = dailyPick.item;
              const platform = detectVideoPlatform(video.url);
              const isWeverse = platform === 'weverse';
              return (
                <Link to={`/videos?highlight=${video.id}`} className="home-daily-card">
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
                      <span className="external-btn">
                        보러가기 <ArrowRightIcon size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })()}
            {dailyPick.type === 'moment' && (() => {
              const moment = dailyPick.item;
              const video = dailyPickLinkedVideo;
              return (
                <div>
                  <Link
                    to={`/videos?highlight=${moment.video_id || moment.id}&moment=${moment.id}`}
                    className="home-featured-moment-more"
                  >
                    모먼트 보러가기 <ArrowRightIcon size={12} />
                  </Link>
                  <VideoEmbed url={moment.tweet_url} title={moment.title} thumbnailUrl={moment.thumbnail_url} />
                  {video && (
                    <p className="home-daily-pick-caption">↑ {video.title}</p>
                  )}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* N년 전 오늘 */}
      {!loading && onThisDay.length > 0 && (
        <section className="home-on-this-day">
          <div className="home-section-header">
            <span className="home-section-badge">그 해 오늘</span>
            <span className="home-section-date">{today.slice(5).replace('-', '월 ')}일</span>
          </div>
          <div className="home-on-this-day-list">
            {onThisDay.map(([year, entries]) => {
              const yearsAgo = Number(today.slice(0, 4)) - Number(year);
              return (
                <div key={year} className="home-year-group">
                  <h3 className="home-year-label">
                    {year}년 <span className="home-years-ago">({yearsAgo}년 전)</span>
                  </h3>
                  <ul className="home-year-items">
                    {entries.map(entry => {
                      if (entry.type === 'video') {
                        return (
                          <li key={`v-${entry.item.id}`}>
                            <Link to={`/videos?highlight=${entry.item.id}`} className="home-year-item">
                              <span className="home-year-item-type">영상</span>
                              <span className="home-year-item-title">{entry.item.title}</span>
                            </Link>
                          </li>
                        );
                      }
                      if (entry.type === 'moment') {
                        return (
                          <li key={`m-${entry.item.id}`}>
                            <Link
                              to={`/videos?highlight=${entry.item.video_id || entry.item.id}&moment=${entry.item.id}`}
                              className="home-year-item"
                            >
                              <span className="home-year-item-type">모먼트</span>
                              <span className="home-year-item-title">{entry.item.title}</span>
                            </Link>
                          </li>
                        );
                      }
                      return (
                        <li key={`p-${entry.item.id}`}>
                          <Link to={`/posts?highlight=${entry.item.id}`} className="home-year-item">
                            <span className="home-year-item-type">포스트</span>
                            <span className="home-year-item-title">{entry.item.title || entry.item.platform}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="home-ask-link">
        <Link to="/ask" className="home-ask-btn">
          궁금한 점이나 요청 남기러가기 <ArrowRightIcon size={12} />
        </Link>
      </div>
    </div>
  );
}
