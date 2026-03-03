import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Video, Moment } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';
import PlatformIcon from '../components/PlatformIcon';
import { detectVideoPlatform } from '../lib/platformUtils';
import { useData } from '../hooks/useData';

// 위버스 멤버 아이콘 매핑
const WEVERSE_MEMBERS = [
  { icon: '🤍', name: '둘만' },
  { icon: '💙', name: '모카' },
  { icon: '🩵', name: '민주' },
  { icon: '🖤', name: '여러명' },
] as const;

// 플랫폼 옵션
const PLATFORM_OPTIONS = [
  { value: 'all', label: '전체 플랫폼', icon: null },
  { value: 'youtube', label: 'YouTube', icon: 'youtube' as const },
  // { value: 'twitter', label: 'Twitter', icon: 'twitter' as const },
  { value: 'weverse', label: 'Weverse', icon: 'weverse' as const },
  { value: 'other', label: '기타', icon: 'other' as const },
] as const;

// YouTube 카테고리 옵션
const YOUTUBE_CATEGORIES = [
  { value: 'all', label: '전체', pattern: null },
  { value: 'shorts', label: 'Shorts', pattern: '#ILLIT' },
  { value: 'behind', label: '비하인드', pattern: ['비하인드', '[BEHIND-IT]'] },
  { value: 'super', label: '슈일릿', pattern: ['SUPER ILLIT', '슈일릿', '슈퍼아일릿'] },
  { value: 'litpouch', label: 'lit-pouch', pattern: '[lit-pouch]' },
  { value: 'playit', label: 'PLAY IT', pattern: ['[PLAY-IT]', '[Playlist]'] },
  { value: 'illlikeit', label: 'I\'LL LIKE IT', pattern: 'LL LIKE IT!' },
  { value: 'other_channel', label: '타 채널', pattern: null },
] as const;

export default function Videos() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const momentId = searchParams.get('moment');
  const { videos: cachedVideos, moments: cachedMoments, fetchVideos, fetchMoments } = useData();
  const [videoMoments, setVideoMoments] = useState<Record<string, Moment[]>>({});
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [expandedMoments, setExpandedMoments] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(!cachedVideos);
  const [platformFilter, setPlatformFilter] = useState<'all' | 'youtube' | 'twitter' | 'weverse' | 'other'>('all');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isYoutubeCategoryDropdownOpen, setIsYoutubeCategoryDropdownOpen] = useState(false);
  const [contentTypeFilter, setContentTypeFilter] = useState<'videos' | 'moments'>('videos');
  const [youtubeCategoryFilter, setYoutubeCategoryFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const platformDropdownRef = useRef<HTMLDivElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);
  const youtubeCategoryDropdownRef = useRef<HTMLDivElement>(null);

  // Sync videos from cache
  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);

  const loadData = useCallback(async () => {
    try {
      const [videosData] = await Promise.all([
        fetchVideos(),
        fetchMoments() // 검색용으로 모먼트도 미리 로드
      ]);
      setVideos(videosData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchVideos, fetchMoments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(e.target as Node)) {
        setIsPlatformDropdownOpen(false);
      }
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(e.target as Node)) {
        setIsMemberDropdownOpen(false);
      }
      if (youtubeCategoryDropdownRef.current && !youtubeCategoryDropdownRef.current.contains(e.target as Node)) {
        setIsYoutubeCategoryDropdownOpen(false);
      }
    };
    if (isPlatformDropdownOpen || isMemberDropdownOpen || isYoutubeCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPlatformDropdownOpen, isMemberDropdownOpen, isYoutubeCategoryDropdownOpen]);

  // Sync expanded video's moments from cache or fetch all
  const loadMomentsForVideo = useCallback(async (videoId: string) => {
    if (videoMoments[videoId]) return;

    try {
      // If we already have ALL moments, filter locally
      if (cachedMoments) {
        const filtered = cachedMoments.filter(m => m.video_id === videoId);
        setVideoMoments(prev => ({ ...prev, [videoId]: filtered }));
      } else {
        // Otherwise fetch all and it will populate cachedMoments for next time
        const allMoments = await fetchMoments();
        const filtered = allMoments.filter(m => m.video_id === videoId);
        setVideoMoments(prev => ({ ...prev, [videoId]: filtered }));
      }
    } catch (error) {
      console.error('Error loading moments:', error);
    }
  }, [videoMoments, cachedMoments, fetchMoments]);

  // highlight 파라미터 처리: 해당 영상 자동 확장 + 스크롤
  useEffect(() => {
    if (!highlightId || loading || videos.length === 0) return;
    setExpandedVideo(highlightId);
    loadMomentsForVideo(highlightId);

    if (momentId) {
      // 모먼트까지 펼치고 해당 모먼트로 스크롤
      setExpandedMoments(highlightId);
      setTimeout(() => {
        const el = document.querySelector(`[data-moment-id="${momentId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          document.querySelector(`[data-video-id="${highlightId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    } else {
      setTimeout(() => {
        document.querySelector(`[data-video-id="${highlightId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightId, momentId, loading, videos.length, loadMomentsForVideo]);
  
  // 검색 및 필터링 (메모이제이션) - 영상 제목 + 모먼트 제목 + 플랫폼 + 멤버
  const { filteredVideos, filteredMoments } = useMemo(() => {
    let filtered = videos;

    // 플랫폼 필터
    if (platformFilter !== 'all') {
      filtered = filtered.filter(video => detectVideoPlatform(video.url) === platformFilter);
    }

    // 위버스 멤버 필터
    if (platformFilter === 'weverse' && memberFilter !== 'all') {
      filtered = filtered.filter(video => video.icon === memberFilter);
    }

    // YouTube 카테고리 필터
    if (platformFilter === 'youtube' && youtubeCategoryFilter !== 'all') {
      if (youtubeCategoryFilter === 'other_channel') {
        // 타 콘텐츠: 채널명이 'ILLIT'이 아닌 영상
        filtered = filtered.filter(video => video.channel_name && video.channel_name !== 'ILLIT');
      } else {
        const category = YOUTUBE_CATEGORIES.find(c => c.value === youtubeCategoryFilter);
        if (category?.pattern) {
          filtered = filtered.filter(video => {
            const title = video.title;
            if (Array.isArray(category.pattern)) {
              return category.pattern.some(p => title.includes(p));
            }
            return title.includes(category.pattern as string);
          });
        }
      }
    }

    // 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(query) || video.date.includes(searchQuery)
      );
    }

    // 모먼트 필터링 (모먼트 선택 시)
    let moments: Moment[] = [];
    if (contentTypeFilter === 'moments') {
      moments = cachedMoments || [];

      // 플랫폼/멤버 필터: 모먼트의 귀속 영상 기준으로 필터링
      const needsPlatformFilter = platformFilter !== 'all';
      const needsMemberFilter = platformFilter === 'weverse' && memberFilter !== 'all';

      if (needsPlatformFilter || needsMemberFilter) {
        // 필터된 영상의 ID 집합 생성
        let validVideos = videos;
        if (needsPlatformFilter) {
          validVideos = validVideos.filter(v => detectVideoPlatform(v.url) === platformFilter);
        }
        if (needsMemberFilter) {
          validVideos = validVideos.filter(v => v.icon === memberFilter);
        }
        const validVideoIds = new Set(validVideos.map(v => v.id));
        moments = moments.filter(m => m.video_id && validVideoIds.has(m.video_id));
      }

      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        moments = moments.filter(m => m.title.toLowerCase().includes(query));
      }
    }

    return { filteredVideos: filtered, filteredMoments: moments };
  }, [videos, searchQuery, cachedMoments, platformFilter, memberFilter, contentTypeFilter, youtubeCategoryFilter]);

  // 그룹화 필터링 (메모이제이션)
  const groupedVideos = useMemo(() => {
    if (contentTypeFilter === 'moments') return [];
    const groups: Record<string, Video[]> = {};
    filteredVideos.forEach((video) => {
      if (!groups[video.date]) {
        groups[video.date] = [];
      }
      groups[video.date].push(video);
    });
    return Object.entries(groups).sort(([a], [b]) =>
      sortOrder === 'newest' ? b.localeCompare(a) : a.localeCompare(b)
    );
  }, [filteredVideos, contentTypeFilter, sortOrder]);

  // 모먼트 그룹화 (날짜별)
  const groupedMoments = useMemo(() => {
    if (contentTypeFilter === 'videos') return [];
    const groups: Record<string, Moment[]> = {};
    filteredMoments.forEach((moment) => {
      if (!groups[moment.date]) {
        groups[moment.date] = [];
      }
      groups[moment.date].push(moment);
    });
    return Object.entries(groups).sort(([a], [b]) =>
      sortOrder === 'newest' ? b.localeCompare(a) : a.localeCompare(b)
    );
  }, [filteredMoments, contentTypeFilter, sortOrder]);

  const hasActiveFilter = searchQuery !== '' || platformFilter !== 'all' || memberFilter !== 'all' || youtubeCategoryFilter !== 'all' || sortOrder !== 'newest' || contentTypeFilter !== 'videos';

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setPlatformFilter('all');
    setMemberFilter('all');
    setYoutubeCategoryFilter('all');
    setSortOrder('newest');
    setContentTypeFilter('videos');
  }, []);

  const toggleVideo = useCallback(async (videoId: string) => {
    if (expandedVideo === videoId) {
      setExpandedVideo(null);
      setExpandedMoments(null);
    } else {
      setExpandedVideo(videoId);
      await loadMomentsForVideo(videoId);
    }
  }, [expandedVideo, loadMomentsForVideo]);

  const toggleMoments = useCallback((videoId: string) => {
    setExpandedMoments(prev => prev === videoId ? null : videoId);
  }, []);

  if (loading) {
    return (
      <div className="page videos-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page videos-page">
      <div className="page-header">
        <h1>모먼트</h1>
        <p className="page-desc">모먼트</p>
        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="제목 또는 날짜로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-row">
            <div className="segment-control">
              <button
                type="button"
                className={`segment-btn ${contentTypeFilter === 'videos' ? 'active' : ''}`}
                onClick={() => setContentTypeFilter('videos')}
              >
                영상
              </button>
              <button
                type="button"
                className={`segment-btn ${contentTypeFilter === 'moments' ? 'active' : ''}`}
                onClick={() => setContentTypeFilter('moments')}
              >
                모먼트
              </button>
            </div>
            <div className="platform-dropdown" ref={platformDropdownRef}>
              <button
                type="button"
                className="platform-dropdown-btn"
                onClick={() => setIsPlatformDropdownOpen(!isPlatformDropdownOpen)}
              >
                {PLATFORM_OPTIONS.find(p => p.value === platformFilter)?.icon && (
                  <PlatformIcon platform={PLATFORM_OPTIONS.find(p => p.value === platformFilter)!.icon!} size={16} />
                )}
                <span>{PLATFORM_OPTIONS.find(p => p.value === platformFilter)?.label}</span>
                <span className="dropdown-arrow">▼</span>
              </button>
              {isPlatformDropdownOpen && (
                <div className="platform-dropdown-menu">
                  {PLATFORM_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className={`platform-dropdown-item ${platformFilter === option.value ? 'selected' : ''}`}
                      onClick={() => {
                        setPlatformFilter(option.value as typeof platformFilter);
                        if (option.value !== 'weverse') setMemberFilter('all');
                        if (option.value !== 'youtube') setYoutubeCategoryFilter('all');
                        setIsPlatformDropdownOpen(false);
                      }}
                    >
                      {option.icon && <PlatformIcon platform={option.icon} size={16} />}
                      <span>{option.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {platformFilter === 'weverse' && (
              <div className="platform-dropdown" ref={memberDropdownRef}>
                <button
                  type="button"
                  className="platform-dropdown-btn"
                  style={{ minWidth: '100px' }}
                  onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                >
                  <span>{memberFilter === 'all' ? '라이브 전체' : `${memberFilter} ${WEVERSE_MEMBERS.find(m => m.icon === memberFilter)?.name}`}</span>
                  <span className="dropdown-arrow">▼</span>
                </button>
                {isMemberDropdownOpen && (
                  <div className="platform-dropdown-menu">
                    <div
                      className={`platform-dropdown-item ${memberFilter === 'all' ? 'selected' : ''}`}
                      onClick={() => {
                        setMemberFilter('all');
                        setIsMemberDropdownOpen(false);
                      }}
                    >
                      <span>라이브 전체</span>
                    </div>
                    {WEVERSE_MEMBERS.map(m => (
                      <div
                        key={m.icon}
                        className={`platform-dropdown-item ${memberFilter === m.icon ? 'selected' : ''}`}
                        onClick={() => {
                          setMemberFilter(m.icon);
                          setIsMemberDropdownOpen(false);
                        }}
                      >
                        <span>{m.icon} {m.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {platformFilter === 'youtube' && (
              <div className="platform-dropdown" ref={youtubeCategoryDropdownRef}>
                <button
                  type="button"
                  className="platform-dropdown-btn"
                  style={{ minWidth: '100px' }}
                  onClick={() => setIsYoutubeCategoryDropdownOpen(!isYoutubeCategoryDropdownOpen)}
                >
                  <span>{YOUTUBE_CATEGORIES.find(c => c.value === youtubeCategoryFilter)?.label}</span>
                  <span className="dropdown-arrow">▼</span>
                </button>
                {isYoutubeCategoryDropdownOpen && (
                  <div className="platform-dropdown-menu">
                    {YOUTUBE_CATEGORIES.map(category => (
                      <div
                        key={category.value}
                        className={`platform-dropdown-item ${youtubeCategoryFilter === category.value ? 'selected' : ''}`}
                        onClick={() => {
                          setYoutubeCategoryFilter(category.value);
                          setIsYoutubeCategoryDropdownOpen(false);
                        }}
                      >
                        <span>{category.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="sort-toggle-wrapper">
            <button
              type="button"
              className="sort-toggle"
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            >
              <span className="sort-icon">{sortOrder === 'newest' ? '▼' : '▲'}</span>
              {sortOrder === 'newest' ? '최신순' : '오래된순'}
            </button>
            {hasActiveFilter && (
              <button
                type="button"
                className="filter-reset-btn"
                onClick={resetFilters}
              >
                필터 초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 검색 결과가 없을 때 */}
      {searchQuery && groupedMoments.length === 0 && groupedVideos.length === 0 && (
        <div className="empty-state">
          <p>검색 결과가 없어요 😢</p>
        </div>
      )}

      {/* 콘텐츠가 없을 때 */}
      {!searchQuery && groupedVideos.length === 0 && groupedMoments.length === 0 && (
        <div className="empty-state">
          <p>아직 콘텐츠가 없어요 😢</p>
        </div>
      )}

      {/* 모먼트 목록 (날짜별 그룹핑) */}
      {groupedMoments.length > 0 && (
        <div className="moments-timeline">
          {searchQuery && contentTypeFilter !== 'moments' && (
            <p className="search-result-count">모먼트 검색 결과 {filteredMoments.length}개</p>
          )}
          {groupedMoments.map(([date, dateMoments]) => (
            <div key={date} className="date-thread">
              <div className="thread-date-header">
                <time>{date}</time>
              </div>
              <div className="thread-content">
                {dateMoments.map((moment) => (
                  <div key={moment.id} className="moment-card">
                    <h4 className="moment-card-title">{moment.title}</h4>
                    <VideoEmbed
                      url={moment.tweet_url}
                      title={moment.title}
                      thumbnailUrl={moment.thumbnail_url}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 영상 검색 결과 */}
      {groupedVideos.length > 0 && (
        <div className="video-timeline">
          {searchQuery && (
            <p className="search-result-count">영상 검색 결과 {filteredVideos.length}개</p>
          )}
          {groupedVideos.map(([date, dateVideos]) => (
            <div key={date} className="date-thread">
              <div className="thread-date-header">
                <time>{date}</time>
              </div>

              <div className="thread-content">
                {dateVideos.map((video) => {
                  const moments = videoMoments[video.id] || [];

                  return (
                  <div key={video.id} className="thread-video-item" data-video-id={video.id}>
                      <button 
                      className="thread-item-header"
                      onClick={() => toggleVideo(video.id)}
                    >
                        <span className="item-icon">
                          <PlatformIcon platform={detectVideoPlatform(video.url)} size={18} />
                        </span>
                        <span className="item-title">
                          {video.title}
                          {video.icon && detectVideoPlatform(video.url) === 'weverse' && (
                            <span className={`member-tag member-tag-${video.icon === '🤍' ? 'both' : video.icon === '💙' ? 'moka' : video.icon === '🩵' ? 'minju' : 'group'}`}>
                              {WEVERSE_MEMBERS.find(m => m.icon === video.icon)?.name}
                            </span>
                          )}
                        </span>
                      <span className={`expand-arrow ${expandedVideo === video.id ? 'open' : ''}`}>
                        ▼
                      </span>
                      </button>
                    
                    {expandedVideo === video.id && (
                      <div className="thread-item-content">
                          <VideoEmbed url={video.url} title={video.title} icon={video.icon} iconText={video.icon_text} thumbnailUrl={video.thumbnail_url} />
                          
                          {moments.length > 0 && (
                            <div className="video-moments-section">
                              <button 
                                className="video-moments-header"
                                onClick={() => toggleMoments(video.id)}
                    >
                      <span className="item-icon">✨</span>
                                <span className="item-title">모먼트 펼쳐 보기 ({moments.length})</span>
                                <span className={`expand-arrow ${expandedMoments === video.id ? 'open' : ''}`}>
                        ▼
                      </span>
                              </button>

                              {expandedMoments === video.id && (
                                <div className="video-moments-grid">
                                  {moments.map((moment) => (
                          <div key={moment.id} className="moment-embed-item" data-moment-id={moment.id}>
                                      <h4 className="moment-title">{moment.title}</h4>
                                      <VideoEmbed
                                        url={moment.tweet_url}
                                        title={moment.title}
                                        thumbnailUrl={moment.thumbnail_url}
                                      />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
