import TweetEmbed from './TweetEmbed';

interface Props {
  url: string;
  title: string;
  className?: string;
}

// URL 타입 감지
function getVideoType(url: string): 'youtube' | 'twitter' | 'unknown' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  }
  return 'unknown';
}

// YouTube URL에서 비디오 ID 추출
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function VideoEmbed({ url, title, className = '' }: Props) {
  const videoType = getVideoType(url);

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

  // Unknown type - just show link
  return (
    <div className={`video-embed-unknown ${className}`}>
      <p>🔗 외부 링크</p>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {title} →
      </a>
    </div>
  );
}
