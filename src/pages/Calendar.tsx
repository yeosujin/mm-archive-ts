import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getVideos, getMoments, getPosts, getEpisodes, getMemberSettings } from '../lib/database';
import type { Video, Moment, Post, Episode } from '../lib/database';
import { CalendarIcon, ArrowRightIcon, PostIcon, ChatIcon, BookIcon, VideoIcon } from '../components/Icons';

interface ArchiveItem {
    id: string;
    type: 'video' | 'moment' | 'post' | 'episode' | 'article';
    title: string;
    path: string;
    icon?: string;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const WEVERSE_MEMBERS = [
  { icon: '🤍', name: '둘만', tag: 'both' },
  { icon: '💙', name: '모카', tag: 'moka' },
  { icon: '🩵', name: '민주', tag: 'minju' },
  { icon: '🖤', name: '여러명', tag: 'group' },
] as const;

const EPISODE_TYPE_NAMES: Record<string, string> = {
  dm: 'DM',
  comment: '댓글',
  listening_party: '리스닝 파티',
};

const LP_PLATFORM_NAMES: Record<string, string> = {
  melon: '멜론',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  weverse: 'Weverse',
};

const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'video': return <VideoIcon size={16} />;
    case 'moment': return <VideoIcon size={16} />;
    case 'post': return <PostIcon size={16} />;
    case 'episode': return <ChatIcon size={16} />;
    case 'article': return <BookIcon size={16} />;
    default: return null;
  }
};

// 연도 범위 생성 (2020년 ~ 현재 + 1년)
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

export default function Calendar() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL 파라미터에서 연도/월 가져오기
  const getInitialDate = () => {
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    if (yearParam && monthParam) {
      return new Date(parseInt(yearParam), parseInt(monthParam) - 1, 1);
    }
    return new Date();
  };

  const [currentDate, setCurrentDate] = useState(getInitialDate);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [archives, setArchives] = useState<Record<string, ArchiveItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // 날짜 변경 시 URL 파라미터 업데이트
  const updateDateParams = (date: Date) => {
    setSearchParams({
      year: String(date.getFullYear()),
      month: String(date.getMonth() + 1)
    });
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // 피커 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.cal-picker-wrapper')) {
        setShowPicker(false);
      }
    };
    
    if (showPicker) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showPicker]);

  const loadAllData = async () => {
    try {
      const [videos, moments, posts, episodes, memberSettings] = await Promise.all([
        getVideos(),
        getMoments(),
        getPosts(),
        getEpisodes(),
        getMemberSettings()
        // 공사중 - articles 임시 숨김
        // getArticles()
      ]);

      // 멤버 이름 (댓글 쓴 사람)
      const getMemberName = (sender?: 'member1' | 'member2') => {
        return sender === 'member2' ? memberSettings.member2_name : memberSettings.member1_name;
      };

      const archivesByDate: Record<string, ArchiveItem[]> = {};

      videos.forEach((v: Video) => {
        if (!archivesByDate[v.date]) archivesByDate[v.date] = [];
        archivesByDate[v.date].push({ id: v.id, type: 'video', title: v.title, path: '/videos', icon: v.icon });
      });

      // 영상에 연결되지 않은 모먼트만 표시
      moments.forEach((m: Moment) => {
        if (m.video_id) return; // 영상에 연결된 모먼트는 제외
        if (!archivesByDate[m.date]) archivesByDate[m.date] = [];
        archivesByDate[m.date].push({ id: m.id, type: 'moment', title: m.title, path: '/moments' });
      });

      posts.forEach((p: Post) => {
        if (!archivesByDate[p.date]) archivesByDate[p.date] = [];
        archivesByDate[p.date].push({ id: p.id, type: 'post', title: p.title || p.platform, path: '/posts' });
      });

      // 연결된 콘텐츠 제목 가져오기
      const getLinkedContentTitle = (ep: Episode) => {
        if (ep.linked_content_type === 'video' && ep.linked_content_id) {
          const video = videos.find(v => v.id === ep.linked_content_id);
          return video?.title || '영상';
        }
        if (ep.linked_content_type === 'moment' && ep.linked_content_id) {
          const moment = moments.find(m => m.id === ep.linked_content_id);
          return moment?.title || '모먼트';
        }
        if (ep.linked_content_type === 'post' && ep.linked_content_id) {
          const post = posts.find(p => p.id === ep.linked_content_id);
          return post?.title || post?.platform || '포스트';
        }
        return '콘텐츠';
      };

      episodes.forEach((e: Episode) => {
        if (!archivesByDate[e.date]) archivesByDate[e.date] = [];
        let episodeTitle = '';

        if (e.episode_type === 'dm') {
          // DM: 항상 발신자 + DM 표시
          const firstMsg = e.messages?.[0];
          const msgPreview = e.title || (firstMsg?.type === 'text' ? firstMsg.content : '📷');
          episodeTitle = `${getMemberName(e.sender)} DM: ${msgPreview}`;
        } else if (e.episode_type === 'comment') {
          // 댓글: 발신자 + 연결 콘텐츠
          if (e.linked_content_id) {
            episodeTitle = `${getMemberName(e.sender)} → "${getLinkedContentTitle(e)}" 댓글`;
          } else {
            episodeTitle = e.title || `${getMemberName(e.sender)} 댓글`;
          }
        } else if (e.episode_type === 'listening_party') {
          const content = e.title || e.messages?.[0]?.content || '';
          const platformName = e.platform ? LP_PLATFORM_NAMES[e.platform] : '';
          episodeTitle = content
            ? `${content} ${platformName || ''} 리스닝 파티`.replaceAll(/\s+/g, ' ').trim()
            : `${platformName || ''} 리스닝 파티`.trim();
        } else {
          episodeTitle = e.title || EPISODE_TYPE_NAMES[e.episode_type] || e.episode_type;
        }

        const episodePath = `/episodes?tab=${e.episode_type}`;
        archivesByDate[e.date].push({ id: e.id, type: 'episode', title: episodeTitle, path: episodePath });
      });

      // 공사중 - articles 임시 숨김
      // articles.forEach((a: Article) => {
      //   if (!archivesByDate[a.date]) archivesByDate[a.date] = [];
      //   archivesByDate[a.date].push({ id: a.id, type: 'article', title: a.title, path: '/articles' });
      // });

      setArchives(archivesByDate);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
    updateDateParams(newDate);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    const newDate = new Date(year, month + 1, 1);
    setCurrentDate(newDate);
    updateDateParams(newDate);
    setSelectedDate(null);
  };

  const handleYearChange = (newYear: number) => {
    const newDate = new Date(newYear, month, 1);
    setCurrentDate(newDate);
    updateDateParams(newDate);
    setSelectedDate(null);
  };

  const handleMonthChange = (newMonth: number) => {
    const newDate = new Date(year, newMonth, 1);
    setCurrentDate(newDate);
    updateDateParams(newDate);
    setSelectedDate(null);
    setShowPicker(false);
  };

  const goToToday = () => {
    const newDate = new Date();
    setCurrentDate(newDate);
    updateDateParams(newDate);
    setSelectedDate(null);
    setShowPicker(false);
  };

  const formatDate = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handleDateClick = (day: number) => {
    const dateStr = formatDate(day);
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  const selectedArchives = selectedDate ? archives[selectedDate] : null;

  if (loading) {
    return (
      <div className="page calendar-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page calendar-page">
      <div className="page-header">
        <h1>캘린더</h1>
        <p className="page-desc">날짜별 아카이브 보기</p>
      </div>

      <div className="calendar-container">
        <div className="calendar-nav">
          <button onClick={prevMonth} className="cal-nav-btn">◀</button>

          <div className="cal-picker-wrapper">
            <button
              className="cal-title-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowPicker(!showPicker);
              }}
            >
              {year}년 {month + 1}월
              <span className="cal-title-arrow">{showPicker ? '▲' : '▼'}</span>
            </button>

            {showPicker && (
              <div className="cal-picker-dropdown">
                <div className="cal-picker-header">
                  <select
                    value={year}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className="cal-year-select"
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                  <button className="cal-today-btn" onClick={goToToday}>
                    오늘
                  </button>
                </div>
                <div className="cal-month-grid">
                  {MONTHS.map((m, idx) => (
                    <button
                      key={m}
                      className={`cal-month-btn ${idx === month ? 'active' : ''}`}
                      onClick={() => handleMonthChange(idx)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
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
              <button
                key={day}
                className={`cal-day ${hasArchive ? 'has-archive' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => hasArchive && handleDateClick(day)}
                disabled={!hasArchive}
              >
                <span className="day-number">{day}</span>
                {hasArchive && (
                  <div className="day-dots">
                    {archives[dateStr].slice(0, 3).map((a) => (
                      <span key={`${a.type}-${a.id}`} className={`day-dot ${a.type}`} title={a.title}></span>
                    ))}
                    {archives[dateStr].length > 3 && (
                      <span className="day-more">+{archives[dateStr].length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 선택된 날짜의 아카이브 목록 */}
        {selectedArchives && (
          <div className="calendar-details">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CalendarIcon size={18} /> {selectedDate}</h3>
            <div className="archive-list">
              {selectedArchives.map((archive) => (
                <Link
                  key={`${archive.type}-${archive.id}`}
                  to={`${archive.path}${archive.path.includes('?') ? '&' : '?'}highlight=${archive.id}`}
                  className="archive-item"
                >
                  <span className="archive-icon"><TypeIcon type={archive.type} /></span>
                  <span className="archive-title">
                    {archive.title}
                    {archive.icon && (() => {
                      const member = WEVERSE_MEMBERS.find(m => m.icon === archive.icon);
                      return member ? (
                        <span className={`member-tag member-tag-${member.tag}`}>
                          {member.name}
                        </span>
                      ) : null;
                    })()}
                  </span>
                  <span className="archive-arrow"><ArrowRightIcon size={14} /></span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
