import { useState } from 'react';
import { moments } from '../data/mockData';
import TweetEmbed from '../components/TweetEmbed';

// 날짜별로 그룹화
function groupByDate(items: typeof moments) {
  const groups: Record<string, typeof moments> = {};
  
  items.forEach((item) => {
    if (!groups[item.date]) {
      groups[item.date] = [];
    }
    groups[item.date].push(item);
  });

  // 날짜 내림차순 정렬
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

export default function Moments() {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const groupedMoments = groupByDate(moments);

  const toggleDate = (date: string) => {
    setExpandedDate(expandedDate === date ? null : date);
  };

  return (
    <div className="page moments-page">
      <div className="page-header">
        <h1>모먼트</h1>
        <p className="page-desc">좋았던 순간들 ✨</p>
      </div>

      {moments.length === 0 ? (
        <div className="empty-state">
          <p>아직 모먼트가 없어요 😢</p>
        </div>
      ) : (
        <div className="moments-timeline">
          {groupedMoments.map(([date, dateMoments]) => (
            <div key={date} className="moment-thread">
              <div className="thread-date">
                <span className="thread-marker"></span>
                <time>{date}</time>
              </div>
              <div className="thread-items">
                <div className="moment-accordion-item">
                  <div 
                    className="moment-item-header"
                    onClick={() => toggleDate(date)}
                  >
                    <span className="item-icon">✨</span>
                    <span className="item-title">모먼트 ({dateMoments.length})</span>
                    <span className={`expand-arrow ${expandedDate === date ? 'open' : ''}`}>
                      ▼
                    </span>
                  </div>
                  
                  {expandedDate === date && (
                    <div className="moment-item-content">
                      <div className="moment-tweets-list">
                        {dateMoments.map((moment) => (
                          <div key={moment.id} className="moment-tweet-item">
                    <TweetEmbed tweetUrl={moment.tweetUrl} />
                  </div>
                ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
