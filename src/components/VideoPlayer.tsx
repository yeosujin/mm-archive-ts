import { memo, useState, useRef } from 'react';

interface Props {
  videoUrl: string;
  thumbnailUrl?: string;
  className?: string;
}

const VideoPlayer = memo(({ videoUrl, thumbnailUrl, className = '' }: Props) => {
  const [activated, setActivated] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setActivated(true);
    setLoading(true);
  };

  const handleCanPlay = () => {
    setLoading(false);
    videoRef.current?.play();
  };

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
      {loading && (
        <div style={{
          width: '100%',
          maxWidth: '800px',
          aspectRatio: '16 / 9',
          borderRadius: '8px',
          backgroundColor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: '14px' }}>로딩 중...</span>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        playsInline
        webkit-playsinline="true"
        controlsList="nodownload"
        preload="auto"
        onCanPlay={handleCanPlay}
        style={{
          width: '100%',
          maxWidth: '800px',
          borderRadius: '8px',
          backgroundColor: '#000',
          display: loading ? 'none' : 'block',
        }}
      >
        <source src={videoUrl} type="video/mp4" />
        브라우저가 비디오 재생을 지원하지 않습니다.
      </video>
    </div>
  );
});

export default VideoPlayer;
