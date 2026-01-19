import { useEffect, useRef } from 'react';
import PlatformIcon, { getPlatformName } from './PlatformIcon';

interface Props {
  url: string;
  platform: 'twitter' | 'instagram' | 'weverse' | 'other';
  className?: string;
}

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
        createTweet: (
          tweetId: string,
          container: HTMLElement,
          options?: object
        ) => Promise<HTMLElement>;
      };
    };
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

// URL에서 플랫폼 자동 감지
export function detectPlatform(url: string): 'twitter' | 'instagram' | 'weverse' | 'other' {
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  }
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  if (url.includes('weverse.io')) {
    return 'weverse';
  }
  return 'other';
}

// 트윗 URL에서 ID 추출
function getTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

export default function PostEmbed({ url, platform, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Twitter 임베드
    if (platform === 'twitter' && containerRef.current) {
      const tweetId = getTweetId(url);
      if (!tweetId) return;

      // 기존 내용 클리어
      containerRef.current.innerHTML = '';

      const loadTwitterWidget = () => {
        if (window.twttr?.widgets && containerRef.current) {
          window.twttr.widgets.createTweet(tweetId, containerRef.current, {
            theme: document.querySelector('.dark') ? 'dark' : 'light',
            align: 'center',
            dnt: true,
          });
        }
      };

      // index.html에서 이미 로드했으므로 바로 사용 시도
      if (window.twttr?.widgets) {
        loadTwitterWidget();
      } else {
        // 스크립트 로딩 대기 (최대 5초)
        const checkInterval = setInterval(() => {
          if (window.twttr?.widgets) {
            clearInterval(checkInterval);
            loadTwitterWidget();
          }
        }, 50); // 더 빠른 체크
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    }

    // Instagram 임베드
    if (platform === 'instagram' && containerRef.current) {
      const loadInstagram = () => {
        if (window.instgrm?.Embeds) {
          window.instgrm.Embeds.process();
        }
      };

      if (window.instgrm) {
        loadInstagram();
      } else {
        const existingScript = document.getElementById('instagram-embed-js');
        if (!existingScript) {
          const script = document.createElement('script');
          script.id = 'instagram-embed-js';
          script.src = 'https://www.instagram.com/embed.js';
          script.async = true;
          script.onload = () => setTimeout(loadInstagram, 500);
          document.body.appendChild(script);
        }
      }
    }
  }, [platform, url]);

  // Twitter 임베드
  if (platform === 'twitter') {
    const tweetId = getTweetId(url);
    
    if (!tweetId) {
      return (
        <div className={`post-embed twitter-embed error ${className}`}>
          <p>⚠️ 올바른 트위터 URL이 아닙니다</p>
          <a href={url} target="_blank" rel="noopener noreferrer">
            링크 열기 →
          </a>
        </div>
      );
    }

    return (
      <div className={`post-embed twitter-embed ${className}`}>
        <div ref={containerRef} className="tweet-container">
          <div className="embed-loading">
            <span>🔄 트윗 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  // Instagram 임베드
  if (platform === 'instagram') {
    const embedUrl = url.includes('/embed') ? url : `${url.replace(/\/$/, '')}/embed`;
    
    return (
      <div ref={containerRef} className={`post-embed instagram-embed ${className}`}>
        <iframe
          src={embedUrl}
          width="100%"
          height="500"
          frameBorder="0"
          scrolling="no"
          allowTransparency={true}
          allow="encrypted-media"
          title="Instagram post"
        />
      </div>
    );
  }

  // Weverse (외부 링크)
  if (platform === 'weverse') {
    return (
      <div className={`post-embed weverse-embed ${className}`}>
        <div className="external-post-card">
          <span className="external-post-icon">
            <PlatformIcon platform="weverse" size={32} />
          </span>
          <div className="external-post-info">
            <span className="external-post-platform">Weverse</span>
            <span className="external-post-desc">위버스에서 보기</span>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="external-post-btn">
            열기 →
          </a>
        </div>
      </div>
    );
  }

  // 기타 (외부 링크)
  return (
    <div className={`post-embed other-embed ${className}`}>
      <div className="external-post-card">
        <span className="external-post-icon">
          <PlatformIcon platform="other" size={32} />
        </span>
        <div className="external-post-info">
          <span className="external-post-platform">{getPlatformName(platform)}</span>
          <span className="external-post-desc">링크 열기</span>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="external-post-btn">
          열기 →
        </a>
      </div>
    </div>
  );
}
