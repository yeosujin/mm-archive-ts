import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { ShareIcon, VolumeOnIcon, VolumeOffIcon, PlayIcon } from './Icons';
import { requestPlay, release } from '../lib/videoPlaybackCoordinator';

interface Props {
  videoUrl: string;
  thumbnailUrl?: string;
  className?: string;
  priority?: boolean;
  autoplayInView?: boolean;
  /** 홈 등 '영상만 보이고 컨트롤바 없음 + 클릭은 뮤트 토글'이 필요한 곳 */
  hideControls?: boolean;
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

const VideoPlayer = memo(({
  videoUrl,
  thumbnailUrl,
  className = '',
  priority = false,
  autoplayInView = false,
  hideControls = false,
}: Props) => {
  const [activated, setActivated] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(true);
  const [userUnmuted, setUserUnmuted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  // 사용자가 수동으로 일시정지한 상태 — autoplay-in-view 재진입 시 재생 방지
  const userPausedRef = useRef(false);

  // 비 priority 영상: 뷰포트 근처(400px)에서 사전 버퍼링
  useEffect(() => {
    if (priority || autoplayInView) return;
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
  }, [priority, autoplayInView]);

  // autoplayInView: 뷰포트 중앙 근처에서 muted autoplay, 코디네이터로 1개만 재생
  useEffect(() => {
    if (!autoplayInView) return;
    const video = videoRef.current;
    if (!video) return;

    // 데이터 세이버 모드면 자동재생 스킵 (prefetch observer가 버퍼링은 처리)
    const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;

    video.preload = 'auto';
    if (!userUnmuted) video.muted = true;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.intersectionRatio >= 0.6) {
          if (!userPausedRef.current) requestPlay(video);
        } else if (entry.intersectionRatio < 0.3) {
          release(video);
        }
      }
    }, { threshold: [0, 0.3, 0.6, 0.9] });

    observer.observe(video);
    return () => {
      observer.disconnect();
      release(video);
    };
  }, [autoplayInView, userUnmuted]);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) {
      setActivated(true);
      return;
    }
    if (!priority && !autoplayInView) {
      video.preload = 'auto';
      try { video.load(); } catch { /* noop */ }
    }
    video.muted = false;
    // 코디네이터를 태워서 다른 영상 재생 중이면 자동 pause
    requestPlay(video);
    setActivated(true);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const next = !userUnmuted;
    video.muted = !next;
    setUserUnmuted(next);
    // 다른 영상이 재생 중이면 이 영상으로 넘기기
    if (next) requestPlay(video);
  };

  const handleTogglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false;
      requestPlay(video);
    } else {
      userPausedRef.current = true;
      video.pause();
      release(video);
    }
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

  // hideControls 모드: 컨트롤바 절대 안 뜸, 클릭=재생/일시정지 토글, 우하단 뮤트 토글 아이콘
  if (hideControls) {
    return (
      <div className={`video-player ${className}`}>
        <div style={containerStyle}>
          <video
            ref={videoRef}
            preload="auto"
            muted={!userUnmuted}
            playsInline
            loop
            poster={thumbnailUrl}
            onPlaying={() => setPlaying(true)}
            onPause={() => setPaused(true)}
            onPlay={() => setPaused(false)}
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

          <button
            type="button"
            className="video-player-tap-area"
            onClick={handleTogglePlayPause}
            aria-label={paused ? 'Play video' : 'Pause video'}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {paused && (
              <span className="video-player-play-icon" aria-hidden>
                <PlayIcon size={32} />
              </span>
            )}
          </button>

          <button
            type="button"
            className="video-player-mute-toggle"
            onClick={handleToggleMute}
            aria-label={userUnmuted ? 'Mute video' : 'Unmute video'}
          >
            {userUnmuted ? <VolumeOnIcon size={22} /> : <VolumeOffIcon size={22} />}
          </button>

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
  }

  // 일반 모드
  // 오버레이 상태:
  // - 일반 모드: 재생 시작 전까지만 표시
  // - autoplayInView 모드: 사용자가 클릭(unmute)하기 전까지 표시 (뒤에서 muted 재생 중)
  const showOverlay = autoplayInView ? !activated : !playing;
  const showSpinner = activated && !playing;
  const isMutedAutoplay = autoplayInView && playing && !activated;

  let overlayIcon: React.ReactNode;
  if (showSpinner) {
    overlayIcon = <span className="video-player-spinner" />;
  } else if (isMutedAutoplay) {
    overlayIcon = <span className="video-player-mute-badge" aria-hidden>🔇</span>;
  } else {
    overlayIcon = (
      <span style={{
        fontSize: '48px',
        color: '#fff',
        opacity: 0.9,
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}>&#9654;</span>
    );
  }

  return (
    <div className={`video-player ${className}`}>
      <div style={containerStyle}>
        <video
          ref={videoRef}
          preload={priority || autoplayInView ? 'auto' : 'none'}
          muted={!activated}
          playsInline
          controls={activated && playing}
          controlsList="nodownload"
          poster={thumbnailUrl}
          loop={autoplayInView && !activated}
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
            aria-label={isMutedAutoplay ? 'Unmute video' : 'Play video'}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none',
              backgroundColor: 'transparent',
            }}
          >
            {overlayIcon}
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
