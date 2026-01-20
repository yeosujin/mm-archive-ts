import { Tweet } from 'react-tweet';

interface Props {
  tweetUrl: string;
  className?: string;
}

function getTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
}

export default function TwitterVideoEmbed({ tweetUrl, className = '' }: Props) {
  const tweetId = getTweetId(tweetUrl);

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
      <Tweet id={tweetId} key={tweetId} />
    </div>
  );
}
