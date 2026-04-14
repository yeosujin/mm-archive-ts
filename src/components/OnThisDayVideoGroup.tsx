import { useState, useRef } from 'react';
import type { Video, Moment } from '../lib/database';
import VideoEmbed from './VideoEmbed';
import { ArrowRightIcon } from './Icons';

type Props = {
  videos: Video[];
  momentsByVideoId: Record<string, Moment[]>;
};

// 한 연도 안의 영상들을 좌우 스와이프로 순환.
// 각 슬라이드 = 영상 헤더(제목 + 보러가기) + 연결된 모먼트 가로 스크롤
export default function OnThisDayVideoGroup({ videos, momentsByVideoId }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number>(0);

  if (videos.length === 0) return null;

  const currentVideo = videos[currentIndex];
  const currentMoments = momentsByVideoId[currentVideo.id] || [];
  const hasMultipleVideos = videos.length > 1;

  const prevVideo = () => {
    setCurrentIndex(i => (i === 0 ? videos.length - 1 : i - 1));
  };

  const nextVideo = () => {
    setCurrentIndex(i => (i === videos.length - 1 ? 0 : i + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!hasMultipleVideos) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextVideo();
      else prevVideo();
    }
  };

  return (
    <div className="on-this-day-video-group">
      <div
        className="on-this-day-video-header-wrap"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {hasMultipleVideos && (
          <button
            className="on-this-day-nav-btn on-this-day-nav-prev"
            onClick={prevVideo}
            aria-label="이전 영상"
          >
            ‹
          </button>
        )}
        <div className="on-this-day-video-header">
          <span className="on-this-day-video-title">{currentVideo.title}</span>
          <a
            href={currentVideo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="on-this-day-video-btn"
          >
            보러가기 <ArrowRightIcon size={14} />
          </a>
        </div>
        {hasMultipleVideos && (
          <button
            className="on-this-day-nav-btn on-this-day-nav-next"
            onClick={nextVideo}
            aria-label="다음 영상"
          >
            ›
          </button>
        )}
      </div>

      {hasMultipleVideos && (
        <div className="on-this-day-dots">
          {videos.map((v, i) => (
            <button
              key={v.id}
              className={`on-this-day-dot ${i === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(i)}
              aria-label={`영상 ${i + 1}`}
            />
          ))}
        </div>
      )}

      {currentMoments.length > 0 && (
        <div className="on-this-day-moments-scroll">
          {currentMoments.map(moment => (
            <div key={moment.id} className="on-this-day-moment-card">
              <h4 className="on-this-day-moment-title">{moment.title}</h4>
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
  );
}
