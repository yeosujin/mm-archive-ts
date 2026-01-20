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

// 트윗 URL에서 ID 추출
function getTweetId(url: string): string | null {
  // https://twitter.com/username/status/1234567890
  // https://x.com/username/status/1234567890
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

export default function TweetEmbed({ tweetUrl, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tweetId = getTweetId(tweetUrl);

  useEffect(() => {
    let isMounted = true;
    if (!tweetId || !containerRef.current) return;
    const container = containerRef.current;

    // 기존 내용 클리어
    container.innerHTML = '';

    // Twitter 위젯 스크립트 로드
    const loadTwitterWidget = () => {
      if (!isMounted) return;
      if (window.twttr?.widgets && container) {
        container.innerHTML = '';
        window.twttr.widgets.createTweet(tweetId, container, {
          theme: document.querySelector('.dark') ? 'dark' : 'light',
          align: 'center',
          conversation: 'none',
          cards: 'visible',
          dnt: true,
        }).then((el) => {
          if (!isMounted && el) {
            el.remove();
          }
        });
      }
    };

    // 스크립트가 이미 로드되어 있는지 확인
    if (window.twttr?.widgets) {
      loadTwitterWidget();
    } else {
      // 스크립트 로드
      const existingScript = document.getElementById('twitter-widget-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'twitter-widget-script';
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.onload = loadTwitterWidget;
        document.body.appendChild(script);
      } else {
        // 스크립트가 로드 중이면 잠시 대기 후 재시도
        const checkInterval = setInterval(() => {
          if (!isMounted) {
            clearInterval(checkInterval);
            return;
          }
          if (window.twttr?.widgets) {
            clearInterval(checkInterval);
            loadTwitterWidget();
          }
        }, 100);

        // 5초 후 타임아웃
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
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
      <div className={`tweet-embed-error ${className}`}>
        <p>⚠️ 올바른 트위터 URL이 아닙니다</p>
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
          {tweetUrl}
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`tweet-embed ${className}`}>
      <div className="tweet-loading">
        <span>트윗 로딩 중...</span>
      </div>
    </div>
  );
}
