import { useEffect, useRef, useState } from 'react';

interface Props {
  tweetUrl: string;
  className?: string;
}

// Window.twttr는 index.html에서 선언됨

function getTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

export default function TwitterVideoEmbed({ tweetUrl, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const tweetId = getTweetId(tweetUrl);

  useEffect(() => {
    if (!tweetId || !containerRef.current || loadedRef.current) return;

    setLoading(true);
    containerRef.current.innerHTML = '';

    const loadTwitterWidget = async () => {
      if (window.twttr?.widgets && containerRef.current && !loadedRef.current) {
        loadedRef.current = true;
        try {
          await window.twttr.widgets.createTweet(tweetId, containerRef.current, {
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
            align: 'center',
            conversation: 'none',
            dnt: true,
          });
        } catch (e) {
          console.error('Tweet load error:', e);
          loadedRef.current = false;
        } finally {
          setLoading(false);
        }
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
        script.onload = () => loadTwitterWidget();
        document.body.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if (window.twttr?.widgets) {
            clearInterval(checkInterval);
            loadTwitterWidget();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(checkInterval);
          setLoading(false);
        }, 5000);
      }
    }

    return () => {
      // cleanup 시 loadedRef는 리셋하지 않음 (StrictMode 대응)
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
      {loading && (
        <div className="tweet-loading">
          <span>🔄 트윗 불러오는 중...</span>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
