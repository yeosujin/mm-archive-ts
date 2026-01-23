import { memo, useState, useRef, useEffect } from 'react';

interface Props {
  videoUrl: string;
  thumbnailUrl?: string;
  className?: string;
}

// 파일 확장자로 MIME 타입 추론
function getVideoMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
  switch (ext) {
    case 'mov': return 'video/quicktime';
    case 'webm': return 'video/webm';
    case 'mp4': return 'video/mp4';
    case 'm4v': return 'video/x-m4v';
    default: return 'video/mp4';
  }
}

const VideoPlayer = memo(({ videoUrl, thumbnailUrl, className = '' }: Props) => {
  const [activated, setActivated] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setActivated(true);
  };

  // 비디오 활성화 시 자동 재생 시도
  useEffect(() => {
    if (!activated) return;
    
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.play().catch((err) => {
        console.warn('[VideoPlayer] 자동 재생 실패:', err);
        setShowControls(true);
      });
    };

    if (video.readyState >= 3) {
      tryPlay();
    } else {
      video.addEventListener('canplay', tryPlay, { once: true });
    }

    const handlePlaying = () => setShowControls(true);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [activated]);

  // 공통 컨테이너 스타일 (레이아웃 시프트 방지)
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '800px',
    aspectRatio: '16 / 9',
    borderRadius: '8px',
    backgroundColor: '#000',
    overflow: 'hidden',
  };

  // 썸네일 스타일 (항상 동일)
  const thumbnailStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  if (!activated) {
    return (
      <div className={`video-player ${className}`}>
        <button
          className="video-player-placeholder"
          onClick={handlePlay}
          aria-label="영상 재생"
          style={{
            ...containerStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            padding: 0,
          }}
        >
          {/* 썸네일: 즉시 렌더링 (DataContext에서 프리로드됨) */}
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt=""
              style={thumbnailStyle}
              decoding="async"
            />
          )}
          {/* 재생 버튼 */}
          <span style={{
            position: 'relative',
            zIndex: 1,
            fontSize: '48px',
            color: '#fff',
            opacity: 0.9,
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          }}>▶</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`video-player ${className}`}>
      <div style={containerStyle}>
        <video
          ref={videoRef}
          controls={showControls}
          playsInline
          webkit-playsinline="true"
          controlsList="nodownload"
          preload="metadata"
          autoPlay
          poster={thumbnailUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        >
          <source src={videoUrl} type={getVideoMimeType(videoUrl)} />
          브라우저가 비디오 재생을 지원하지 않습니다.
        </video>
      </div>
    </div>
  );
});

export default VideoPlayer;