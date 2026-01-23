import { memo, useState, useRef, useEffect } from 'react';

interface Props {
  videoUrl: string;
  thumbnailUrl?: string;
  className?: string;
}

// 파일 확장자로 MIME 타입 추론
function getVideoMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0]; // 쿼리스트링 제거
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlay = () => {
    setActivated(true);
    setLoading(true);
    setError(null);
  };

  // 비디오 준비 완료 처리
  const handleReady = () => {
    if (!loading) return; // 이미 처리됨
    setLoading(false);
    videoRef.current?.play().catch((err) => {
      console.warn('[VideoPlayer] 자동 재생 실패:', err);
      // 자동 재생 실패해도 로딩은 해제 (사용자가 직접 재생 가능)
    });
  };

  // 에러 처리
  const handleError = () => {
    setLoading(false);
    const video = videoRef.current;
    const errorCode = video?.error?.code;
    const errorMsg = video?.error?.message || '';
    console.error('[VideoPlayer] 에러:', errorCode, errorMsg);
    setError('영상을 불러올 수 없습니다');
  };

  // 타임아웃 처리 (15초)
  useEffect(() => {
    if (!activated || !loading) return;

    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('[VideoPlayer] 로딩 타임아웃 (15초)');
        setLoading(false);
        // 타임아웃이어도 비디오가 로드됐을 수 있으니 재생 시도
        videoRef.current?.play().catch(() => {});
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [activated, loading]);

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

  if (error) {
    return (
      <div className={`video-player ${className}`}>
        <div style={{
          width: '100%',
          maxWidth: '800px',
          aspectRatio: '16 / 9',
          borderRadius: '8px',
          backgroundColor: '#1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <span style={{ color: '#ff6b6b', fontSize: '14px' }}>{error}</span>
          <a 
            href={videoUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#888', fontSize: '12px', textDecoration: 'underline' }}
          >
            직접 열기
          </a>
        </div>
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
          position: 'absolute',
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
        onCanPlay={handleReady}
        onCanPlayThrough={handleReady}
        onLoadedData={handleReady}
        onPlaying={() => setLoading(false)}
        onError={handleError}
        style={{
          width: '100%',
          maxWidth: '800px',
          borderRadius: '8px',
          backgroundColor: '#000',
          opacity: loading ? 0 : 1,
        }}
      >
        <source src={videoUrl} type={getVideoMimeType(videoUrl)} />
        브라우저가 비디오 재생을 지원하지 않습니다.
      </video>
    </div>
  );
});

export default VideoPlayer;