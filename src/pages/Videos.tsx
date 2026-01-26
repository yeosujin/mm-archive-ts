import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Video, Moment } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';
import PlatformIcon from '../components/PlatformIcon';
import { detectVideoPlatform } from '../lib/platformUtils';
import { useData } from '../context/DataContext';

export default function Videos() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const { videos: cachedVideos, moments: cachedMoments, fetchVideos, fetchMoments } = useData();
  const [videoMoments, setVideoMoments] = useState<Record<string, Moment[]>>({});
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [expandedMoments, setExpandedMoments] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(!cachedVideos);

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

  // highlight 파라미터 처리: 해당 영상 자동 확장 + 스크롤
  useEffect(() => {
    if (!highlightId || loading || videos.length === 0) return;
    setExpandedVideo(highlightId);
    loadMomentsForVideo(highlightId);
    setTimeout(() => {
      document.querySelector(`[data-video-id="${highlightId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [highlightId, loading, videos.length]);

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
  
  // 검색 필터링 (메모이제이션) - 영상 제목 + 모먼트 제목 둘 다 검색
  const { filteredVideos, matchedMoments } = useMemo(() => {
    if (!searchQuery) return { filteredVideos: videos, matchedMoments: [] as Moment[] };
    const query = searchQuery.toLowerCase();

    // 모먼트 제목 매칭 검색
    const momentMatches = cachedMoments?.filter(m =>
      m.title.toLowerCase().includes(query)
    ) || [];

    // 영상 제목/날짜 매칭
    const videoMatches = videos.filter(video =>
      video.title.toLowerCase().includes(query) || video.date.includes(searchQuery)
    );

    return { filteredVideos: videoMatches, matchedMoments: momentMatches };
  }, [videos, searchQuery, cachedMoments]);

  // 그룹화 필터링 (메모이제이션)
  const groupedVideos = useMemo(() => {
    const groups: Record<string, Video[]> = {};
    filteredVideos.forEach((video) => {
      if (!groups[video.date]) {
        groups[video.date] = [];
      }
      groups[video.date].push(video);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredVideos]);

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
              placeholder="제목 또는 날짜로 검색... (예: 2025-01-01)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 검색 결과가 없을 때 */}
      {searchQuery && matchedMoments.length === 0 && groupedVideos.length === 0 && (
        <div className="empty-state">
          <p>검색 결과가 없어요 😢</p>
        </div>
      )}

      {/* 검색어가 없고 영상도 없을 때 */}
      {!searchQuery && groupedVideos.length === 0 && (
        <div className="empty-state">
          <p>아직 모먼트가 없어요 😢</p>
        </div>
      )}

      {/* 모먼트 검색 결과: 카드만 직접 표시 */}
      {matchedMoments.length > 0 && (
        <div className="moment-search-results">
          <p className="search-result-count">모먼트 검색 결과 {matchedMoments.length}개</p>
          <div className="video-moments-grid">
            {matchedMoments.map((moment) => (
              <div key={moment.id} className="moment-embed-item">
                <h4 className="moment-title">{moment.title}</h4>
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

      {/* 영상 검색 결과 */}
      {groupedVideos.length > 0 && (
        <div className="video-timeline">
          {searchQuery && (
            <p className="search-result-count">영상 검색 결과 {filteredVideos.length}개</p>
          )}
          {groupedVideos.map(([date, dateVideos]) => (
            <div key={date} className="date-thread">
              <div className="thread-date-header">
                <span className="thread-marker"></span>
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
                          {moments.length > 0 && (
                            <span className="moment-badge">✨ {moments.length}</span>
                          )}
                        </span>
                      <span className={`expand-arrow ${expandedVideo === video.id ? 'open' : ''}`}>
                        ▼
                      </span>
                      </button>
                    
                    {expandedVideo === video.id && (
                      <div className="thread-item-content">
                          <VideoEmbed url={video.url} title={video.title} icon={video.icon} thumbnailUrl={video.thumbnail_url} />
                          
                          {moments.length > 0 && (
                            <div className="video-moments-section">
                              <button 
                                className="video-moments-header"
                                onClick={() => toggleMoments(video.id)}
                    >
                      <span className="item-icon">✨</span>
                                <span className="item-title">모먼트 ({moments.length})</span>
                                <span className={`expand-arrow ${expandedMoments === video.id ? 'open' : ''}`}>
                        ▼
                      </span>
                              </button>

                              {expandedMoments === video.id && (
                                <div className="video-moments-grid">
                                  {moments.map((moment) => (
                          <div key={moment.id} className="moment-embed-item">
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
