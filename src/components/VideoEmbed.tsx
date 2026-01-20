import TweetEmbed from './TweetEmbed';
import VideoPlayer from './VideoPlayer';

interface Props {
  url: string;
  title: string;
  icon?: string;  // 위버스 등 외부 링크용 커스텀 아이콘
  className?: string;
}

// URL 타입 감지
function getVideoType(url: string): 'youtube' | 'twitter' | 'weverse' | 'r2' | 'unknown' {
  // R2 URL 감지 (환경변수의 PUBLIC_URL 또는 .r2.dev 도메인)
  const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
  if (r2PublicUrl && url.startsWith(r2PublicUrl)) {
    return 'r2';
  }
  if (url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com')) {
    return 'r2';
  }
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  }
  if (url.includes('weverse.io')) {
    return 'weverse';
  }
  return 'unknown';
}

// YouTube URL에서 비디오 ID 추출
function getYouTubeId(url: string): string | null {
  const patterns = [
    // 일반 영상: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // 짧은 URL: youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // 임베드: youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // 숏츠: youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function VideoEmbed({ url, title, icon, className = '' }: Props) {
  const videoType = getVideoType(url);

  // R2 직접 업로드 영상
  if (videoType === 'r2') {
    return <VideoPlayer videoUrl={url} className={className} />;
  }

  if (videoType === 'youtube') {
    const videoId = getYouTubeId(url);
    if (!videoId) {
      return (
        <div className={`video-embed-error ${className}`}>
          <p>⚠️ 올바른 YouTube URL이 아닙니다</p>
        </div>
      );
    }

    return (
      <div className={`video-embed youtube-embed ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (videoType === 'twitter') {
    return <TweetEmbed tweetUrl={url} className={className} />;
  }

  if (videoType === 'weverse') {
    return (
      <div className={`video-embed-external weverse-link ${className}`}>
        <div className="external-link-card">
          <span className="external-icon">{icon || '🩵'}</span>
          <div className="external-info">
            <span className="external-platform">Weverse</span>
            <span className="external-title">{title}</span>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="external-btn">
            보러가기 →
          </a>
        </div>
        <p className="external-note">위버스 영상은 앱/웹에서 직접 확인해주세요</p>
      </div>
    );
  }

  // Unknown type - just show link
  return (
    <div className={`video-embed-external ${className}`}>
      <div className="external-link-card">
        <span className="external-icon">🔗</span>
        <div className="external-info">
          <span className="external-platform">외부 링크</span>
          <span className="external-title">{title}</span>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="external-btn">
          보러가기 →
      </a>
      </div>
    </div>
  );
}
