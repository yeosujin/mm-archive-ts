import { useEffect, useState } from 'react';

interface Props {
  tweetUrl: string;
  className?: string;
}

interface CobaltResponse {
  status: 'success' | 'error' | 'picker';
  url?: string;
  picker?: Array<{ url: string; type: string }>;
  text?: string;
}

export default function TwitterVideoEmbed({ tweetUrl, className = '' }: Props) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extractVideo = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Cobalt API로 영상 URL 추출
        const response = await fetch('https://api.cobalt.tools/api/json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            url: tweetUrl,
            vQuality: '720',
            filenamePattern: 'basic',
          }),
        });

        const data: CobaltResponse = await response.json();

        if (data.status === 'success' && data.url) {
          setVideoUrl(data.url);
        } else if (data.status === 'picker' && data.picker) {
          // 여러 미디어가 있는 경우 첫 번째 영상 선택
          const video = data.picker.find(item => item.type === 'video');
          if (video) {
            setVideoUrl(video.url);
          } else {
            setError('영상을 찾을 수 없어요');
          }
        } else {
          setError(data.text || '영상 추출에 실패했어요');
        }
      } catch (err) {
        console.error('Cobalt API error:', err);
        setError('영상 추출 중 오류가 발생했어요');
      } finally {
        setLoading(false);
      }
    };

    if (tweetUrl) {
      extractVideo();
    }
  }, [tweetUrl]);

  if (loading) {
    return (
      <div className={`twitter-video-embed ${className}`}>
        <div className="video-loading">
          <span>🔄 영상 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`twitter-video-embed error ${className}`}>
        <p>⚠️ {error}</p>
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
          원본 트윗 보기 →
        </a>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className={`twitter-video-embed error ${className}`}>
        <p>영상을 찾을 수 없어요</p>
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
          원본 트윗 보기 →
        </a>
      </div>
    );
  }

  return (
    <div className={`twitter-video-embed ${className}`}>
      <video 
        src={videoUrl} 
        controls 
        playsInline
        preload="metadata"
      >
        브라우저가 비디오를 지원하지 않습니다.
      </video>
      <a 
        href={tweetUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="video-source-link"
      >
        원본 트윗 →
      </a>
    </div>
  );
}
