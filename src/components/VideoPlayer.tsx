import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { ShareIcon } from './Icons';

interface Props {
  videoUrl: string;
  thumbnailUrl?: string;
  className?: string;
  priority?: boolean;
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

const VideoPlayer = memo(({ videoUrl, thumbnailUrl, className = '', priority = false }: Props) => {
  const [activated, setActivated] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 뷰포트 근처(400px)에 들어오면 버퍼링 시작 — 클릭 시 즉시 재생되도록
  useEffect(() => {
    if (priority) return;
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (video.preload !== 'auto') {
            video.preload = 'auto';
            try { video.load(); } catch { /* noop */ }
          }
          observer.disconnect();
          break;
        }
      }
    }, { rootMargin: '400px 0px' });
    observer.observe(video);
    return () => observer.disconnect();
  }, [priority]);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) {
      setActivated(true);
      return;
    }
    if (!priority) {
      video.preload = 'auto';
      try { video.load(); } catch { /* noop */ }
    }
    video.muted = false;
    video.play().catch(() => { /* 실패 시 오버레이 유지 */ });
    setActivated(true);
  };

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    try {
      setDownloading(true);
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const fileName = videoUrl.split('/').pop()?.split('?')[0] || 'video.mp4';
      const file = new File([blob], fileName, { type: blob.type });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      window.open(videoUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  }, [videoUrl, downloading]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '800px',
    aspectRatio: '16 / 9',
    borderRadius: '8px',
    backgroundColor: '#000',
    overflow: 'hidden',
  };

  const showOverlay = !playing;
  const showSpinner = activated && !playing;

  return (
    <div className={`video-player ${className}`}>
      <div style={containerStyle}>
        <video
          ref={videoRef}
          preload={priority ? 'auto' : 'none'}
          muted={!activated}
          playsInline
          controls={playing}
          controlsList="nodownload"
          poster={thumbnailUrl}
          onPlaying={() => setPlaying(true)}
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

        {showOverlay && (
          <button
            className="video-player-placeholder"
            onClick={handlePlay}
            aria-label="Play video"
            disabled={activated}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: activated ? 'default' : 'pointer',
              border: 'none',
              padding: 0,
              backgroundColor: 'transparent',
            }}
          >
            {showSpinner ? (
              <span className="video-player-spinner" />
            ) : (
              <span style={{
                fontSize: '48px',
                color: '#fff',
                opacity: 0.9,
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}>&#9654;</span>
            )}
          </button>
        )}

        <button
          className={`video-download-btn${downloading ? ' downloading' : ''}`}
          onClick={handleDownload}
          aria-label="Download video"
        >
          {downloading ? <span className="video-download-spinner" /> : <ShareIcon size={18} />}
        </button>
      </div>
    </div>
  );
});

export default VideoPlayer;
