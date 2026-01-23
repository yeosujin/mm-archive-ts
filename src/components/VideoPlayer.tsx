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

    // 비디오 로드 후 재생 시도
    const tryPlay = () => {
      video.play().catch((err) => {
        console.warn('[VideoPlayer] 자동 재생 실패, 컨트롤 표시:', err);
        setShowControls(true);
      });
    };

    // canplay 이벤트 또는 이미 로드된 경우
    if (video.readyState >= 3) {
      tryPlay();
    } else {
      video.addEventListener('canplay', tryPlay, { once: true });
    }

    // 재생 시작되면 컨트롤 표시
    const handlePlaying = () => setShowControls(true);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [activated]);

  if (!activated) {
    return (
      <div className={`video-player ${className}`}>
        <button
          className="video-player-placeholder"
          onClick={handlePlay}
          aria-label="영상 재생"
          style={{
            width: '100%',
            maxWidth: '800px',
            aspectRatio: '16 / 9',
            borderRadius: '8px',
            backgroundColor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <span style={{
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
      <video
        ref={videoRef}
        controls={showControls}
        playsInline
        webkit-playsinline="true"
        controlsList="nodownload"
        preload="auto"
        autoPlay
        muted={false}
        style={{
          width: '100%',
          maxWidth: '800px',
          borderRadius: '8px',
          backgroundColor: '#000',
        }}
      >
        <source src={videoUrl} type={getVideoMimeType(videoUrl)} />
        브라우저가 비디오 재생을 지원하지 않습니다.
      </video>
    </div>
  );
});

export default VideoPlayer;