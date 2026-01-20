import { useState, useEffect, useMemo, useCallback } from 'react';
import { getMoments } from '../lib/database';
import type { Moment } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';

export default function Moments() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMoments = useCallback(async () => {
    try {
      const data = await getMoments();
      setMoments(data);
    } catch (error) {
      console.error('Error loading moments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  // 검색 필터링 (메모이제이션)
  const filteredMoments = useMemo(() => {
    if (!searchQuery) return moments;
    const query = searchQuery.toLowerCase();
    return moments.filter(moment => 
      moment.title.toLowerCase().includes(query) ||
      moment.date.includes(searchQuery)
    );
  }, [moments, searchQuery]);

  // 날짜별로 그룹화 (메모이제이션)
  const groupedMoments = useMemo(() => {
    const groups: Record<string, Moment[]> = {};
    filteredMoments.forEach((item) => {
      if (!groups[item.date]) {
        groups[item.date] = [];
      }
      groups[item.date].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredMoments]);

  const toggleDate = useCallback((date: string) => {
    setExpandedDate(prev => prev === date ? null : date);
  }, []);

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
            <div key={date} className="moment-date-group">
              <button 
                className={`moment-date-header ${expandedDate === date ? 'expanded' : ''}`}
                onClick={() => toggleDate(date)}
              >
                <span className="date-marker">✨</span>
                <time>{date}</time>
                <span className="moment-count">{dateMoments.length}개</span>
                <span className={`expand-arrow ${expandedDate === date ? 'open' : ''}`}>
                  ▼
                </span>
              </button>
              
              {expandedDate === date && (
                <div className="moment-list">
                {dateMoments.map((moment) => (
                    <div key={moment.id} className="moment-item">
                      <VideoEmbed url={moment.tweet_url} title={moment.title} />
                  </div>
                ))}
              </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
