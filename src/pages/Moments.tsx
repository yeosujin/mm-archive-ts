import { useState, useEffect } from 'react';
import { getMoments } from '../lib/database';
import type { Moment } from '../lib/database';
import TwitterVideoEmbed from '../components/TwitterVideoEmbed';

export default function Moments() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMoments();
  }, []);

  const loadMoments = async () => {
    try {
      const data = await getMoments();
      setMoments(data);
    } catch (error) {
      console.error('Error loading moments:', error);
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링 (제목, 날짜)
  const filteredMoments = searchQuery
    ? moments.filter(moment => 
        moment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        moment.date.includes(searchQuery)
      )
    : moments;

// 날짜별로 그룹화
  const groupedMoments = (() => {
    const groups: Record<string, Moment[]> = {};
  
    filteredMoments.forEach((item) => {
    if (!groups[item.date]) {
      groups[item.date] = [];
    }
    groups[item.date].push(item);
  });

  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  })();

  const toggleDate = (date: string) => {
    setExpandedDate(expandedDate === date ? null : date);
  };

  if (loading) {
    return (
      <div className="page moments-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page moments-page">
      <div className="page-header">
        <h1>모먼트</h1>
        <p className="page-desc">둘만의 순간</p>
        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="제목 또는 날짜로 검색... (예: 2025-01-01)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
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
                  <button 
                    className="moment-item-header"
                    onClick={() => toggleDate(date)}
                  >
                    <span className="item-icon">✨</span>
                    <span className="item-title">모먼트 ({dateMoments.length})</span>
                    <span className={`expand-arrow ${expandedDate === date ? 'open' : ''}`}>
                      ▼
                    </span>
                  </button>
                  
                  {expandedDate === date && (
                    <div className="moment-item-content">
                      <div className="moment-tweets-list">
                {dateMoments.map((moment) => (
                          <div key={moment.id} className="moment-tweet-item">
                            <h4 className="moment-title">{moment.title}</h4>
                            <TwitterVideoEmbed tweetUrl={moment.tweet_url} />
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
