import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Moment } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';
import { useData } from '../hooks/useData';
import Skeleton from '../components/Skeleton';

export default function Moments() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const { moments: cachedMoments, fetchMoments } = useData();
  const [moments, setMoments] = useState<Moment[]>(cachedMoments || []);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(!cachedMoments);

  const loadMoments = useCallback(async () => {
    try {
      const data = await fetchMoments();
      setMoments(data);
    } catch (error) {
      console.error('Error loading moments:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchMoments]);

  useEffect(() => {
    loadMoments();
  }, [loadMoments]);

  // highlight 파라미터 처리: 해당 날짜 그룹 확장 + 스크롤
  useEffect(() => {
    if (!highlightId || loading || moments.length === 0) return;
    const target = moments.find(m => m.id === highlightId);
    if (!target) return;
    setExpandedDate(target.date);
    setTimeout(() => {
      document.querySelector(`[data-moment-id="${highlightId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [highlightId, loading, moments]);

  // 검색 필터링 (메모이제이션)
  const filteredMoments = useMemo(() => {
    if (!searchQuery) return moments;
    const query = searchQuery.toLowerCase();
    return moments.filter(moment => 
      moment.title.toLowerCase().includes(query) ||
      moment.date.includes(searchQuery)
    );
  }, [moments, searchQuery]);

  // 날짜별 및 비디오별로 그룹화 (메모이제이션)
  const groupedMoments = useMemo(() => {
    const groups: Record<string, Moment[][]> = {};
    
    filteredMoments.forEach((item) => {
      if (!groups[item.date]) {
        groups[item.date] = [];
      }
      
      const dayGroups = groups[item.date];
      const lastGroup = dayGroups.at(-1);
      
      // video_id가 있고 마지막 그룹의 video_id와 같으면 하나의 스레드로 묶음
      if (item.video_id && lastGroup && lastGroup[0].video_id === item.video_id) {
        lastGroup.push(item);
      } else {
        dayGroups.push([item]);
      }
    });
    
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredMoments]);

  const toggleDate = useCallback((date: string) => {
    setExpandedDate(prev => prev === date ? null : date);
  }, []);

  if (loading) {
    return (
      <div className="page moments-page">
        <div className="page-header">
          <h1>모먼트</h1>
          <p className="page-desc">둘만의 순간</p>
        </div>
        <Skeleton variant="timeline" count={8} />
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
              placeholder="제목 또는 날짜로 검색"
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
          {groupedMoments.map(([date, dateGroups]) => (
            <div key={date} className="moment-date-group">
              <button 
                className={`moment-date-header ${expandedDate === date ? 'expanded' : ''}`}
                onClick={() => toggleDate(date)}
              >
                <span className="date-marker">✨</span>
                <time>{date}</time>
                <span className="moment-count">
                  {dateGroups.reduce((acc, g) => acc + g.length, 0)}개
                </span>
                <span className={`expand-arrow ${expandedDate === date ? 'open' : ''}`}>
                  ▼
                </span>
              </button>
              
              {expandedDate === date && (
                <div className="moment-list">
                  {dateGroups.map((group, groupIdx) => (
                    <div key={`${date}-group-${group[0]?.id || groupIdx}`} className="moment-group">
                      {groupIdx > 0 && <hr className="moment-group-divider" />}
                      <div className="group-items">
                        {group.map((moment) => (
                          <div key={moment.id} className="moment-item" data-moment-id={moment.id}>
                            <VideoEmbed url={moment.tweet_url} title={moment.title} thumbnailUrl={moment.thumbnail_url} hideControls />
                            <p className="moment-card-title">{moment.title}</p>
                          </div>
                        ))}
                      </div>
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
