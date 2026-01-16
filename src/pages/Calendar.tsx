import { useState } from 'react';
import { Link } from 'react-router-dom';
import { videos, moments, photos, episodes, articles } from '../data/mockData';

// 모든 아카이브를 날짜별로 그룹화
function getAllArchivesByDate() {
  const archives: Record<string, Array<{
    id: string;
    type: 'video' | 'moment' | 'photo' | 'episode' | 'article';
    title: string;
    path: string;
  }>> = {};

  videos.forEach((v) => {
    if (!archives[v.date]) archives[v.date] = [];
    archives[v.date].push({ id: v.id, type: 'video', title: v.title, path: '/videos' });
  });

  moments.forEach((m) => {
    if (!archives[m.date]) archives[m.date] = [];
    archives[m.date].push({ id: m.id, type: 'moment', title: m.title, path: '/videos' });
  });

  photos.forEach((p) => {
    if (!archives[p.date]) archives[p.date] = [];
    archives[p.date].push({ id: p.id, type: 'photo', title: p.title, path: '/photos' });
  });

  episodes.forEach((e) => {
    if (!archives[e.date]) archives[e.date] = [];
    archives[e.date].push({ id: e.id, type: 'episode', title: e.title, path: '/episodes' });
  });

  articles.forEach((a) => {
    if (!archives[a.date]) archives[a.date] = [];
    archives[a.date].push({ id: a.id, type: 'article', title: a.title, path: '/articles' });
  });

  return archives;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TYPE_ICONS: Record<string, string> = {
  video: '📹',
  moment: '✨',
  photo: '📷',
  episode: '🎬',
  article: '📰',
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const archives = getAllArchivesByDate();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 해당 월의 첫째 날과 마지막 날
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // 캘린더 그리드 생성
  const days: (number | null)[] = [];
  
  // 첫째 날 이전의 빈 칸
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null);
  }
  
  // 날짜들
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(i);
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const formatDate = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDateClick = (day: number) => {
    const dateStr = formatDate(day);
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  const selectedArchives = selectedDate ? archives[selectedDate] : null;

  return (
    <div className="page calendar-page">
      <div className="page-header">
        <h1>캘린더</h1>
        <p className="page-desc">날짜별 아카이브 보기</p>
      </div>

      <div className="calendar-container">
        <div className="calendar-nav">
          <button onClick={prevMonth} className="cal-nav-btn">◀</button>
          <span className="cal-title">{year}년 {month + 1}월</span>
          <button onClick={nextMonth} className="cal-nav-btn">▶</button>
        </div>

        <div className="calendar-grid">
          {/* 요일 헤더 */}
          {WEEKDAYS.map((day) => (
            <div key={day} className="cal-weekday">{day}</div>
          ))}

          {/* 날짜들 */}
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="cal-day empty"></div>;
            }

            const dateStr = formatDate(day);
            const hasArchive = archives[dateStr] && archives[dateStr].length > 0;
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div
                key={day}
                className={`cal-day ${hasArchive ? 'has-archive' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => hasArchive && handleDateClick(day)}
              >
                <span className="day-number">{day}</span>
                {hasArchive && (
                  <div className="day-dots">
                    {archives[dateStr].slice(0, 3).map((a, i) => (
                      <span key={i} className="day-dot" title={a.title}></span>
                    ))}
                    {archives[dateStr].length > 3 && (
                      <span className="day-more">+{archives[dateStr].length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 선택된 날짜의 아카이브 목록 */}
        {selectedArchives && (
          <div className="calendar-details">
            <h3>📅 {selectedDate}</h3>
            <div className="archive-list">
              {selectedArchives.map((archive) => (
                <Link
                  key={`${archive.type}-${archive.id}`}
                  to={archive.path}
                  className="archive-item"
                >
                  <span className="archive-icon">{TYPE_ICONS[archive.type]}</span>
                  <span className="archive-title">{archive.title}</span>
                  <span className="archive-arrow">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
