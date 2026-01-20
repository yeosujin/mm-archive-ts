import { useEffect, useRef, memo } from 'react';

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
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

const TweetEmbed = memo(({ tweetUrl, className = '' }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tweetId = getTweetId(tweetUrl);

  useEffect(() => {
    let isMounted = true;
    if (!tweetId || !containerRef.current) return;
    const container = containerRef.current;

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

    if (window.twttr?.widgets) {
      loadTwitterWidget();
    } else {
      const existingScript = document.getElementById('twitter-widget-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'twitter-widget-script';
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.onload = loadTwitterWidget;
        document.body.appendChild(script);
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
        }, 100);
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
});

export default TweetEmbed;
