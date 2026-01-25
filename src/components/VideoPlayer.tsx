import { memo, useState, useRef, useEffect } from 'react';

interface Props {
  videoUrl: string;
  thumbnailUrl?: string;
  className?: string;
}

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

  useEffect(() => {
    if (!activated) return;
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video.play().catch(() => {
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

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '800px',
    aspectRatio: '16 / 9',
    borderRadius: '8px',
    backgroundColor: '#000',
    overflow: 'hidden',
  };

  if (!activated) {
    return (
      <div className={`video-player ${className}`}>
        <button
          className="video-player-placeholder"
          onClick={handlePlay}
          aria-label="Play video"
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
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
          <span style={{
            position: 'relative',
            zIndex: 1,
            fontSize: '48px',
            color: '#fff',
            opacity: 0.9,
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
          }}>&#9654;</span>
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
        </video>
      </div>
    </div>
  );
});

export default VideoPlayer;