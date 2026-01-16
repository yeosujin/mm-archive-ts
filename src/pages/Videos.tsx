import { useState, useEffect } from 'react';
import { getVideos, getMomentsByVideoId } from '../lib/database';
import type { Video, Moment } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';
import TweetEmbed from '../components/TweetEmbed';

export default function Videos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoMoments, setVideoMoments] = useState<Record<string, Moment[]>>({});
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [expandedMoments, setExpandedMoments] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const data = await getVideos();
      setVideos(data);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMomentsForVideo = async (videoId: string) => {
    if (videoMoments[videoId]) return; // 이미 로드됨
    
    try {
      const moments = await getMomentsByVideoId(videoId);
      setVideoMoments(prev => ({ ...prev, [videoId]: moments }));
    } catch (error) {
      console.error('Error loading moments:', error);
    }
  };
  
  // 검색 필터링 (제목, 날짜)
  const filteredVideos = searchQuery
    ? videos.filter(video => 
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.date.includes(searchQuery)
      )
    : videos;

  // 필터링된 영상으로 그룹화
  const groupedVideos = (() => {
    const groups: Record<string, Video[]> = {};
    filteredVideos.forEach((video) => {
      if (!groups[video.date]) {
        groups[video.date] = [];
      }
      groups[video.date].push(video);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  })();

  const toggleVideo = async (videoId: string) => {
    if (expandedVideo === videoId) {
      setExpandedVideo(null);
      setExpandedMoments(null);
    } else {
      setExpandedVideo(videoId);
      await loadMomentsForVideo(videoId);
    }
  };

  const toggleMoments = (videoId: string) => {
    setExpandedMoments(expandedMoments === videoId ? null : videoId);
  };

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
                        <span className="item-icon">📹</span>
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
                          <VideoEmbed url={video.url} title={video.title} />
                          
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
                                      <TweetEmbed tweetUrl={moment.tweet_url} />
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
