import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { buildCalendarDays, dayCover, monthStrip } from '../lib/calendarDays';
import type { CalendarEntry } from '../lib/calendarDays';
import { buildStoryForDate, fallbackLabel } from '../lib/onThisDayStory';
import type { StoryYear } from '../lib/onThisDayStory';
import { getTodayString } from '../lib/dailyPick';
import { momentsByVideo } from '../lib/videoCatalog';
import { useViewerParam } from '../hooks/useViewerParam';
import { PlayIcon } from '../components/Icons';
import VideoCard from '../components/moments/VideoCard';
import VideoDetailModal from '../components/moments/VideoDetailModal';
import MomentViewer from '../components/MomentViewer';
import StoryViewer from '../components/StoryViewer';
import Skeleton from '../components/Skeleton';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
/** 이만큼 옆으로 밀면 달을 넘긴다 */
const SWIPE_PX = 50;

const pad = (n: number) => String(n).padStart(2, '0');

const ENTRY_BADGE: Record<Exclude<CalendarEntry['kind'], 'video'>, string> = {
  moment: '모먼트',
  photo: '사진',
  post: '포스트',
  episode: '에피소드',
};

/** 영상이 아닌 기록 카드. 영상 카드(VideoCard)와 같은 모양 */
function EntryCard({ entry }: { entry: Exclude<CalendarEntry, { kind: 'video' }> }) {
  const cover = entry.kind === 'episode' ? null : entry.cover;
  const badge = entry.kind === 'photo' && entry.count > 1 ? `사진 ${entry.count}장` : ENTRY_BADGE[entry.kind];
  return (
    <Link to={entry.path} className="mc-card">
      <span className="mc-card-thumb">
        {cover
          ? <img className="vcover" src={cover} alt="" loading="lazy" decoding="async" />
          : <span className="cal-card-blank">{ENTRY_BADGE[entry.kind]}</span>}
        {cover && <span className="mc-badge">{badge}</span>}
      </span>
      <span className="mc-card-title">{entry.title}</span>
    </Link>
  );
}

export default function Calendar() {
  const {
    videos, moments, posts, episodes, photos, memberSettings,
    fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchPhotos, fetchMemberSettings,
  } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [today] = useState(getTodayString);
  const { value: momentParam, open: openMoment, close: closeMoment } = useViewerParam('m');
  const { value: detailParam, open: openDetail, close: closeDetail } = useViewerParam('v');
  const [picked, setPicked] = useState<string | null>(null);
  // 연·월 선택이 펼쳐져 있으면 거기서 보고 있는 해, 닫혀 있으면 null
  const [pickerYear, setPickerYear] = useState<number | null>(null);
  const [story, setStory] = useState<{ id: number; year: StoryYear; closing: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    Promise.all([fetchVideos(), fetchMoments(), fetchPosts(), fetchEpisodes(), fetchPhotos(), fetchMemberSettings()])
      .catch((error) => {
        console.error('Error loading data:', error);
        setFailed(true);
      });
  }, [fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchPhotos, fetchMemberSettings]);

  const loaded = !!(videos && moments && posts && episodes && photos);
  const days = useMemo(
    () => (loaded ? buildCalendarDays({ videos, moments, posts, episodes, photos, memberSettings }) : new Map<string, CalendarEntry[]>()),
    [loaded, videos, moments, posts, episodes, photos, memberSettings],
  );
  const strip = useMemo(() => monthStrip(days, today), [days, today]);
  const momentMap = useMemo(() => momentsByVideo(moments ?? []), [moments]);

  // 보는 달은 URL(?year=&month=)에 둔다. 없거나 범위 밖이면 이번 달
  const yearParam = Number(searchParams.get('year'));
  const monthParam = Number(searchParams.get('month'));
  const stripIndex = strip.findIndex(s => s.year === yearParam && s.month === monthParam);
  const current = stripIndex >= 0 ? strip[stripIndex] : strip[strip.length - 1];
  const currentIndex = stripIndex >= 0 ? stripIndex : strip.length - 1;
  const { year, month } = current;
  const ym = `${year}-${pad(month)}`;

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const monthDates = Array.from({ length: lastDate }, (_, i) => `${ym}-${pad(i + 1)}`);
  const recordDates = monthDates.filter(d => days.has(d));
  const recordCount = recordDates.reduce((sum, d) => sum + (days.get(d)?.length ?? 0), 0);

  // 고른 날이 이 달이 아니면: 오늘(기록 있을 때) → 오늘 이전 마지막 기록 날 → 이 달 첫 기록 날
  const fallbackDate = recordDates.includes(today)
    ? today
    : [...recordDates].reverse().find(d => d <= today) ?? recordDates[0] ?? null;
  const selected = picked?.startsWith(ym) && days.has(picked) ? picked : fallbackDate;
  const selectedEntries = selected ? days.get(selected) ?? [] : [];
  const builtStory = selected && loaded ? buildStoryForDate({ videos, moments, posts, episodes, photos }, selected) : null;
  // 뷰어 위 이름을 '그 해 오늘' 대신 그 날짜로
  const selectedStory = builtStory && selected ? { ...builtStory, label: fallbackLabel(selected, today) } : null;

  const goMonth = (index: number) => {
    const target = strip[index];
    if (!target) return;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('year', String(target.year));
      next.set('month', String(target.month));
      return next;
    }, { replace: true });
    setPicked(null);
    setPickerYear(null);
  };

  const momentViewer = useMemo(() => {
    if (!momentParam || !moments) return null;
    const videoId = moments.find(m => m.id === momentParam)?.video_id;
    const list = videoId ? momentMap.get(videoId) : undefined;
    const startIndex = list?.findIndex(m => m.id === momentParam) ?? -1;
    return list && startIndex >= 0 ? { list, startIndex } : null;
  }, [momentParam, moments, momentMap]);

  const detail = useMemo(() => {
    const video = detailParam ? videos?.find(v => v.id === detailParam) : undefined;
    return video ? { video, list: momentMap.get(video.id) ?? [] } : null;
  }, [detailParam, videos, momentMap]);

  if (!loaded && !failed) {
    return <Skeleton variant="list" count={6} />;
  }
  if (!loaded) {
    return <p className="mc-empty">캘린더를 불러오지 못했어요</p>;
  }

  const years = [...new Set(strip.map(s => s.year))].reverse();
  const [, selMonth, selDay] = (selected ?? '').split('-').map(Number);
  const selWeekday = selected ? WEEKDAYS[new Date(year, month - 1, selDay).getDay()] : '';

  return (
    <div className="cal">
      <div className="cal-head">
        <div>
          <button
            type="button"
            className="cal-title"
            aria-expanded={pickerYear !== null}
            aria-label={`${year}년 ${month}월, 다른 달 고르기`}
            onClick={() => setPickerYear(p => (p === null ? year : null))}
          >
            <span className="cal-title-month">{month}월</span>
            <span className="cal-title-year">{year}</span>
            <svg className="cal-title-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <p className="cal-summary">
            {recordDates.length ? `기록 있는 날 ${recordDates.length}일 · ${recordCount}개` : '이 달은 기록이 없어요'}
          </p>
        </div>
        <div className="cal-nav">
          <button type="button" className="cal-nav-btn" aria-label="이전 달" disabled={currentIndex <= 0} onClick={() => goMonth(currentIndex - 1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" className="cal-nav-btn" aria-label="다음 달" disabled={currentIndex >= strip.length - 1} onClick={() => goMonth(currentIndex + 1)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {/* 연·월 선택: 연도 칩 + 12개월. 기록 범위 밖의 달은 못 고른다 */}
      {pickerYear !== null && (
        <div className="cal-picker">
          <div className="cal-picker-years">
            {years.map(y => (
              <button key={y} type="button" className={`mc-chip ${y === pickerYear ? 'active' : ''}`} onClick={() => setPickerYear(y)}>
                {y}
              </button>
            ))}
          </div>
          <div className="cal-picker-months">
            {Array.from({ length: 12 }, (_, i) => {
              const index = strip.findIndex(s => s.year === pickerYear && s.month === i + 1);
              const target = strip[index];
              const classes = ['cal-picker-month', index === currentIndex && 'active', target && !target.days && 'empty'].filter(Boolean).join(' ');
              return (
                <button key={i} type="button" className={classes} disabled={index < 0} onClick={() => goMonth(index)}>
                  {i + 1}월
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className="cal-grid"
        onTouchStart={(e) => { touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          const start = touchRef.current;
          touchRef.current = null;
          if (!start) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
          goMonth(currentIndex + (dx < 0 ? 1 : -1));
        }}
      >
        {WEEKDAYS.map(w => <div key={w} className="cal-weekday">{w}</div>)}
        {Array.from({ length: firstWeekday }, (_, i) => <span key={`blank-${i}`} />)}
        {monthDates.map((date, i) => {
          const entries = days.get(date);
          const cover = entries ? dayCover(entries) : null;
          const n = i + 1;
          const classes = [
            'cal-cell',
            entries && 'has',
            cover && 'covered',
            date === today && 'today',
            date === selected && 'selected',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={date}
              type="button"
              className={classes}
              disabled={!entries}
              aria-pressed={entries ? date === selected : undefined}
              aria-label={`${month}월 ${n}일${entries ? `, 기록 ${entries.length}개` : ''}`}
              onClick={() => setPicked(date)}
            >
              {cover && ('src' in cover
                ? <img className="cal-cell-cover" src={cover.src} alt="" loading="lazy" decoding="async" />
                : <span className={`cal-cell-cover vcover-${cover.platform}`} />)}
              <span className="cal-cell-num">{n}</span>
              {entries && entries.length > 1 && <span className="cal-cell-more">+{entries.length - 1}</span>}
            </button>
          );
        })}
      </div>

      {selected && (
        <section className="cal-day" aria-label={`${selMonth}월 ${selDay}일 기록`}>
          <div className="cal-day-head">
            <div>
              <h2 className="cal-day-title">{selMonth}월 {selDay}일 {selWeekday}요일</h2>
              <p className="cal-summary">기록 {selectedEntries.length}개</p>
            </div>
            {selectedStory && (
              <button
                type="button"
                className="cal-story-btn"
                onClick={() => setStory(s => ({ id: (s?.id ?? 0) + 1, year: selectedStory, closing: false }))}
              >
                <PlayIcon size={11} /> 스토리
              </button>
            )}
          </div>
          <div className="mc-rail">
            {selectedEntries.map(entry => (entry.kind === 'video'
              ? <VideoCard key={`video-${entry.id}`} video={entry.video} moments={entry.moments} onOpen={openDetail} />
              : <EntryCard key={`${entry.kind}-${entry.id}`} entry={entry} />))}
          </div>
        </section>
      )}

      {story && (
        <StoryViewer
          key={story.id}
          years={[story.year]}
          startYear={story.year.year}
          autoStarted={false}
          originFor={() => null}
          closing={story.closing}
          onClose={() => setStory(s => (s ? { ...s, closing: true } : s))}
          onExited={() => setStory(s => (s?.id === story.id ? null : s))}
        />
      )}

      {/* 뷰어(1000)는 모달(900) 위. 모달 본문의 미리 받기 정리가 뷰어 effect 뒤에 돌도록 모달보다 앞에 둔다 */}
      {momentViewer && (
        <MomentViewer key={momentParam} moments={momentViewer.list} startIndex={momentViewer.startIndex} onClose={closeMoment} />
      )}

      {detail && (
        <VideoDetailModal
          key={detail.video.id}
          video={detail.video}
          moments={detail.list}
          viewerOpen={!!momentParam}
          onOpenMoment={openMoment}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
