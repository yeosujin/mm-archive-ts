import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Video, Moment } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';
import PlatformIcon from '../components/PlatformIcon';
import { detectVideoPlatform } from '../lib/platformUtils';
import { useData } from '../context/DataContext';

export default function Videos() {
  const { videos: cachedVideos, moments: cachedMoments, fetchVideos, fetchMoments } = useData();
  const [videoMoments, setVideoMoments] = useState<Record<string, Moment[]>>({});
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [expandedMoments, setExpandedMoments] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(!cachedVideos);

  // Sync videos from cache
  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);

  const loadVideos = useCallback(async () => {
    try {
      const data = await fetchVideos();
      setVideos(data);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchVideos]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

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
  
  // 검색 필터링 (메모이제이션)
  const filteredVideos = useMemo(() => {
    if (!searchQuery) return videos;
    const query = searchQuery.toLowerCase();
    return videos.filter(video => 
      video.title.toLowerCase().includes(query) ||
      video.date.includes(searchQuery)
    );
  }, [videos, searchQuery]);

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
        <h1>영상</h1>
        <p className="page-desc">영상 콘텐츠</p>
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

      {groupedVideos.length === 0 ? (
        <div className="empty-state">
          <p>아직 영상이 없어요 😢</p>
        </div>
      ) : (
        <div className="video-timeline">
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
                  <div key={video.id} className="thread-video-item">
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
                          <VideoEmbed url={video.url} title={video.title} icon={video.icon} />
                          
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
