import { useEffect, useRef } from 'react';

interface Props {
  tweetUrl: string;
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
  }
}

function getTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

export default function TwitterVideoEmbed({ tweetUrl, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tweetId = getTweetId(tweetUrl);

  useEffect(() => {
    let isMounted = true;
    
    if (!tweetId || !containerRef.current) return;
    const container = containerRef.current;

    // 컨테이너 초기화
    container.innerHTML = '';
    
    // 로딩 메시지 추가
    const loadingEl = document.createElement('div');
    loadingEl.className = 'embed-loading';
    loadingEl.innerHTML = '<span>🔄 영상 불러오는 중...</span>';
    container.appendChild(loadingEl);

    const loadTwitterWidget = () => {
      if (!isMounted) return;
      if (window.twttr?.widgets && containerRef.current) {
        containerRef.current.innerHTML = '';
        
        window.twttr.widgets.createTweet(tweetId, containerRef.current, {
          theme: document.querySelector('.dark') ? 'dark' : 'light',
          align: 'center',
          dnt: true,
          conversation: 'none',
          cards: 'visible'
        }).then((el) => {
           if (!isMounted && el) {
             el.remove();
           }
        });
      }
    };

    if (window.twttr?.widgets) {
      loadTwitterWidget();
    } else {
      const checkInterval = setInterval(() => {
        if (!isMounted) {
            clearInterval(checkInterval);
            return;
        }
        if (window.twttr?.widgets) {
          clearInterval(checkInterval);
          loadTwitterWidget();
        }
      }, 50);
      setTimeout(() => clearInterval(checkInterval), 5000);
    }

    return () => {
      isMounted = false;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [tweetId]);

  if (!tweetId) {
    return (
      <div className={`twitter-embed error ${className}`}>
        <p>⚠️ 올바른 트위터 URL이 아닙니다</p>
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
          링크 열기 →
        </a>
      </div>
    );
  }

  return (
    <div className={`twitter-embed ${className}`}>
      <div ref={containerRef} className="tweet-container" />
    </div>
  );
}
