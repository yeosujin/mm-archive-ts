import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import type { Moment } from '../lib/database/types';
import { useData } from '../hooks/useData';
import { useViewerParam } from '../hooks/useViewerParam';
import {
  CATEGORY_LABEL,
  filterVideos,
  groupByMonth,
  momentsByVideo,
  pickHero,
  videoYears,
  type CatalogFilter,
} from '../lib/videoCatalog';
import MomentHero from '../components/moments/MomentHero';
import VideoCard from '../components/moments/VideoCard';
import MomentViewer from '../components/MomentViewer';
import Skeleton from '../components/Skeleton';
import { ArrowRightIcon } from '../components/Icons';

const CATEGORIES: { value: CatalogFilter['category']; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'live', label: CATEGORY_LABEL.live },
  { value: 'official', label: CATEGORY_LABEL.official },
  { value: 'external', label: CATEGORY_LABEL.external },
];

const MEMBERS = [
  { value: 'all', label: '전체' },
  { value: '🤍', label: '🤍 둘만' },
  { value: '💙', label: '💙 모카' },
  { value: '🩵', label: '🩵 민주' },
  { value: '🖤', label: '🖤 여러명' },
];

const NO_MOMENTS: Moment[] = [];

/** 옛 링크 `/videos?highlight=<videoId>[&moment=<momentId>]` → 영상 상세 */
export default function Videos() {
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get('highlight');
  if (highlight) {
    const moment = searchParams.get('moment');
    const query = moment ? `?m=${encodeURIComponent(moment)}` : '';
    return <Navigate replace to={`/videos/${encodeURIComponent(highlight)}${query}`} />;
  }
  return <VideoCatalog />;
}

function VideoCatalog() {
  const { videos, moments, fetchVideos, fetchMoments } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const { momentId, open, close } = useViewerParam();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([fetchVideos(), fetchMoments()]).catch((error) => {
      console.error('Error loading videos:', error);
      setFailed(true);
    });
  }, [fetchVideos, fetchMoments]);

  // 필터는 URL(y, c, mb)에 둬서 상세에서 뒤로 오면 같은 조건으로 돌아온다
  const years = useMemo(() => (videos ? videoYears(videos) : []), [videos]);
  const yearParam = Number(searchParams.get('y'));
  const year = years.includes(yearParam) ? yearParam : years[0];
  const categoryParam = searchParams.get('c');
  const category = CATEGORIES.find(c => c.value === categoryParam)?.value ?? 'all';
  const memberParam = searchParams.get('mb');
  const member = category === 'live' && MEMBERS.some(m => m.value === memberParam) ? memberParam! : 'all';

  const setFilter = (key: 'y' | 'c' | 'mb', value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === 'all') next.delete(key);
      else next.set(key, value);
      if (key === 'c') next.delete('mb');
      return next;
    }, { replace: true });
  };

  const momentMap = useMemo(() => momentsByVideo(moments ?? []), [moments]);
  const filtered = useMemo(
    () => (videos && year !== undefined ? filterVideos(videos, { year, category, member }) : []),
    [videos, year, category, member],
  );
  const months = useMemo(() => groupByMonth(filtered), [filtered]);
  // 연도·칩이 바뀔 때마다 다시 뽑는다
  const hero = useMemo(() => pickHero(filtered, momentMap), [filtered, momentMap]);
  const heroMoments = hero ? momentMap.get(hero.id) ?? NO_MOMENTS : NO_MOMENTS;

  // 뷰어: `?m=`의 모먼트가 속한 영상의 모먼트 목록
  const viewer = useMemo(() => {
    if (!momentId || !moments) return null;
    const videoId = moments.find(m => m.id === momentId)?.video_id;
    const list = videoId ? momentMap.get(videoId) : undefined;
    const startIndex = list?.findIndex(m => m.id === momentId) ?? -1;
    return list && startIndex >= 0 ? { list, startIndex } : null;
  }, [momentId, moments, momentMap]);

  if ((!videos || !moments) && !failed) {
    return <Skeleton variant="list" count={6} />;
  }
  if (!videos || !moments) {
    return <p className="mc-empty">영상을 불러오지 못했어요</p>;
  }

  return (
    <div className="mc">
      {/* 연도 · 분류(라이브면 멤버) 한 줄. 연도 메뉴가 잘리지 않게 스크롤 영역 밖에 둔다 */}
      <div className="mc-filter">
        {year !== undefined && (
          <YearMenu years={years} year={year} onChange={y => setFilter('y', String(y))} />
        )}
        <div className="mc-chips">
          {category === 'live' ? (
            <>
              <button
                type="button"
                aria-pressed
                className="mc-chip active mc-chip-back"
                onClick={() => setFilter('c', 'all')}
              >
                <ArrowRightIcon size={12} />
                {CATEGORY_LABEL.live}
              </button>
              {MEMBERS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={m.value === member}
                  className={`mc-chip${m.value === member ? ' active' : ''}`}
                  onClick={() => setFilter('mb', m.value)}
                >
                  {m.label}
                </button>
              ))}
            </>
          ) : (
            CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                aria-pressed={c.value === category}
                className={`mc-chip${c.value === category ? ' active' : ''}`}
                onClick={() => setFilter('c', c.value)}
              >
                {c.label}
              </button>
            ))
          )}
        </div>
      </div>

      {hero && (
        <MomentHero
          key={hero.id}
          video={hero}
          moments={heroMoments}
          paused={viewer !== null}
          onOpen={() => open(heroMoments[0].id)}
        />
      )}

      {months.map(({ month, videos: list }) => (
        <section key={month} className="mc-month">
          <h2 className="mc-month-title">
            {month}월 <small>{list.length}개</small>
          </h2>
          <div className="mc-rail">
            {list.map(v => (
              <VideoCard key={v.id} video={v} moments={momentMap.get(v.id) ?? NO_MOMENTS} />
            ))}
          </div>
        </section>
      ))}

      {months.length === 0 && <p className="mc-empty">이 조건의 영상이 없어요</p>}

      {viewer && (
        <MomentViewer key={momentId} moments={viewer.list} startIndex={viewer.startIndex} onClose={close} />
      )}
    </div>
  );
}

function YearMenu({ years, year, onChange }: { years: number[]; year: number; onChange: (year: number) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="mc-year-menu" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="mc-chip mc-year-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`연도 ${year}`}
        onClick={() => setOpen(o => !o)}
      >
        {year} <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="mc-year-list" aria-label="연도">
          {years.map(y => (
            <li key={y}>
              <button
                type="button"
                aria-current={y === year ? 'true' : undefined}
                className={`mc-year-opt${y === year ? ' active' : ''}`}
                onClick={() => {
                  onChange(y);
                  setOpen(false);
                }}
              >
                {y}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
