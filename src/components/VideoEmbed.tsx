import { memo } from 'react';
import TweetEmbed from './TweetEmbed';
import VideoPlayer from './VideoPlayer';
import { ExternalLinkIcon, ArrowRightIcon } from './Icons';

interface Props {
  url: string;
  title: string;
  icon?: string;  // 위버스 등 외부 링크용 커스텀 아이콘
  thumbnailUrl?: string;
  className?: string;
}

// 허용된 도메인 목록
const ALLOWED_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'twitter.com',
  'x.com',
  'weverse.io',
  'www.weverse.io',
];

// URL 유효성 검증
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // http/https만 허용
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // R2 URL 검증
    const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    if (r2PublicUrl && url.startsWith(r2PublicUrl)) {
      return true;
    }
    if (parsed.hostname.includes('.r2.dev') || parsed.hostname.includes('.r2.cloudflarestorage.com')) {
      return true;
    }
    // 허용된 도메인 검증
    return ALLOWED_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

// URL 타입 감지
function getVideoType(url: string): 'youtube' | 'twitter' | 'weverse' | 'r2' | 'invalid' | 'unknown' {
  if (!isValidUrl(url)) {
    return 'invalid';
  }
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
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const VideoEmbed = memo(({ url, title, icon, thumbnailUrl, className = '' }: Props) => {
  const videoType = getVideoType(url);

  if (videoType === 'invalid') {
    return (
      <div className={`video-embed-error ${className}`}>
        <p>유효하지 않은 URL입니다</p>
      </div>
    );
  }

  if (videoType === 'r2') {
    return <VideoPlayer videoUrl={url} thumbnailUrl={thumbnailUrl} className={className} />;
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
          src={`https://www.youtube.com/embed/${videoId}?playsinline=1`}
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
            보러가기 <ArrowRightIcon size={14} />
          </a>
        </div>
        <p className="external-note">위버스 영상은 앱/웹에서 직접 확인해주세요</p>
      </div>
    );
  }

  return (
    <div className={`video-embed-external ${className}`}>
      <div className="external-link-card">
        <span className="external-icon"><ExternalLinkIcon size={20} /></span>
        <div className="external-info">
          <span className="external-platform">외부 링크</span>
          <span className="external-title">{title}</span>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="external-btn">
          보러가기 <ArrowRightIcon size={14} />
      </a>
      </div>
    </div>
  );
});

export default VideoEmbed;
