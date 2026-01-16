import { useState } from 'react';
import { videos, moments } from '../data/mockData';
import VideoEmbed from '../components/VideoEmbed';
import TweetEmbed from '../components/TweetEmbed';

// 특정 영상에 연결된 모먼트 가져오기
function getMomentsForVideo(videoId: string) {
  return moments.filter((moment) => moment.videoId === videoId);
}

export default function Videos() {
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [expandedMoments, setExpandedMoments] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 검색 필터링
  const filteredVideos = searchQuery
    ? videos.filter(video => 
        video.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : videos;

  // 필터링된 영상으로 그룹화
  const groupedVideos = (() => {
    const groups: Record<string, typeof videos> = {};
    filteredVideos.forEach((video) => {
      if (!groups[video.date]) {
        groups[video.date] = [];
      }
      groups[video.date].push(video);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  })();

  const toggleVideo = (videoId: string) => {
    setExpandedVideo(expandedVideo === videoId ? null : videoId);
    // 영상 닫으면 모먼트도 닫기
    if (expandedVideo === videoId) {
      setExpandedMoments(null);
    }
  };

  const toggleMoments = (videoId: string) => {
    setExpandedMoments(expandedMoments === videoId ? null : videoId);
  };

  return (
    <div className="page videos-page">
      <div className="page-header">
        <h1>영상</h1>
        <p className="page-desc">공식 영상 & 모먼트</p>
        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="영상 검색..."
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
                {/* 공식 영상 */}
                {dateVideos.map((video) => {
                  const videoMoments = getMomentsForVideo(video.id);
                  
                  return (
                    <div key={video.id} className="thread-video-item">
                      <div 
                        className="thread-item-header"
                        onClick={() => toggleVideo(video.id)}
                      >
                        <span className="item-icon">📹</span>
                        <span className="item-title">
                          {video.title}
                          {videoMoments.length > 0 && (
                            <span className="moment-badge">✨ {videoMoments.length}</span>
                          )}
                        </span>
                        <span className={`expand-arrow ${expandedVideo === video.id ? 'open' : ''}`}>
                          ▼
                        </span>
                      </div>
                      
                      {expandedVideo === video.id && (
                        <div className="thread-item-content">
                          <VideoEmbed url={video.url} title={video.title} />
                          
                          {/* 이 영상에 연결된 모먼트들 - 별도 토글 */}
                          {videoMoments.length > 0 && (
                            <div className="video-moments-section">
                              <div 
                                className="video-moments-header"
                                onClick={() => toggleMoments(video.id)}
                              >
                                <span className="item-icon">✨</span>
                                <span className="item-title">모먼트 ({videoMoments.length})</span>
                                <span className={`expand-arrow ${expandedMoments === video.id ? 'open' : ''}`}>
                                  ▼
                                </span>
                              </div>
                              
                              {expandedMoments === video.id && (
                                <div className="video-moments-grid">
                                  {videoMoments.map((moment) => (
                                    <div key={moment.id} className="moment-embed-item">
                                      <TweetEmbed tweetUrl={moment.tweetUrl} />
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
