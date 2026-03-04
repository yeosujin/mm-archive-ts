import { memo } from 'react';
import VideoPlayer from './VideoPlayer';
import { ArrowRightIcon } from './Icons';

interface Props {
  url: string;
  title?: string;  // 현재 미사용 (하위 호환성 유지)
  icon?: string;   // 위버스 멤버 아이콘
  iconText?: string; // 🖤(여러명) 선택 시 구체적인 멤버 표시
  platformName?: string; // 기타 플랫폼명 (TikTok, Weibo 등)
  thumbnailUrl?: string;
  className?: string;
}

// URL 유효성 검증: http/https만 허용
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// URL 타입 감지
function getVideoType(url: string): 'youtube' | 'twitter' | 'weverse' | 'instagram' | 'r2' | 'other' | 'invalid' {
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
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  return 'other';
}

const VideoEmbed = memo(({ url, icon, iconText, platformName, thumbnailUrl, className = '' }: Props) => {
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
    instagram: 'Instagram',
  };

  const isWeverseMember = videoType === 'weverse' && icon && WEVERSE_MEMBERS[icon];
  // 🖤인 경우 iconText가 있으면 그 텍스트를, 없으면 '여러명' 표시
  const memberName = icon === '🖤' && iconText ? iconText : WEVERSE_MEMBERS[icon || ''];

  // 기타 플랫폼: platformName 사용, 없으면 '외부 링크'
  const displayLabel = videoType === 'other'
    ? (platformName || '외부 링크')
    : platformNames[videoType];

  return (
    <div className={`video-embed-compact ${videoType}-link ${className}`}>
      {isWeverseMember ? (
        <span className="compact-label compact-label-weverse">
          <span className="weverse-icon">{icon}</span>
          <span className="weverse-member">{memberName}</span>
        </span>
      ) : (
        <span className="compact-label">{displayLabel}</span>
      )}
      <a href={url} target="_blank" rel="noopener noreferrer" className="compact-btn">
        보러가기 <ArrowRightIcon size={14} />
      </a>
    </div>
  );
});

export default VideoEmbed;
