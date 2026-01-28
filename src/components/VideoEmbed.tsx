import { memo } from 'react';
import VideoPlayer from './VideoPlayer';
import { ArrowRightIcon } from './Icons';

interface Props {
  url: string;
  title?: string;  // 현재 미사용 (하위 호환성 유지)
  icon?: string;   // 위버스 멤버 아이콘
  iconText?: string; // 🖤(여러명) 선택 시 구체적인 멤버 표시
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

const VideoEmbed = memo(({ url, icon, iconText, thumbnailUrl, className = '' }: Props) => {
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

  // 위버스 멤버 이름 매핑
  const WEVERSE_MEMBERS: Record<string, string> = {
    '🤍': '둘만',
    '💙': '모카',
    '🩵': '민주',
    '🖤': '여러명',
  };

  const platformNames: Record<string, string> = {
    youtube: 'YouTube',
    twitter: 'X',
    weverse: 'Weverse',
    unknown: '외부 링크',
  };

  const isWeverseMember = videoType === 'weverse' && icon && WEVERSE_MEMBERS[icon];
  // 🖤인 경우 iconText가 있으면 그 텍스트를, 없으면 '여러명' 표시
  const memberName = icon === '🖤' && iconText ? iconText : WEVERSE_MEMBERS[icon || ''];

  return (
    <div className={`video-embed-compact ${videoType}-link ${className}`}>
      {isWeverseMember ? (
        <span className="compact-label compact-label-weverse">
          <span className="weverse-icon">{icon}</span>
          <span className="weverse-member">{memberName}</span>
        </span>
      ) : (
        <span className="compact-label">{platformNames[videoType] || '외부 링크'}</span>
      )}
      <a href={url} target="_blank" rel="noopener noreferrer" className="compact-btn">
        보러가기 <ArrowRightIcon size={14} />
      </a>
    </div>
  );
});

export default VideoEmbed;
