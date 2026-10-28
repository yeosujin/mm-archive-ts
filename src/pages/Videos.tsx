import { useEffect, useMemo, useState } from 'react';
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
import ChipMenu from '../components/moments/ChipMenu';
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
  const { value: momentId, open, close } = useViewerParam();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    Promise.all([fetchVideos(), fetchMoments()]).catch((error) => {
      console.error('Error loading videos:', error);
      setFailed(true);
    });
  }, [fetchVideos, fetchMoments]);

  // 필터는 URL(y, c, mb)에 둬서 상세에서 뒤로 오면 같은 조건으로 돌아온다
  const years = useMemo(() => (videos ? videoYears(videos) : []), [videos]);
  const yearParam = searchParams.get('y');
  const year: number | 'all' | undefined =
    yearParam === 'all' ? 'all' : years.includes(Number(yearParam)) ? Number(yearParam) : years[0];
  const categoryParam = searchParams.get('c');
  const category = CATEGORIES.find(c => c.value === categoryParam)?.value ?? 'all';
  const memberParam = searchParams.get('mb');
  const member = category === 'live' && MEMBERS.some(m => m.value === memberParam) ? memberParam! : 'all';

  const setFilter = (key: 'y' | 'c' | 'mb', value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      // 연도는 '전체'도 남긴다 — 비우면 기본값(최근 연도)으로 돌아가 버린다
      if (value === 'all' && key !== 'y') next.delete(key);
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
      {/* 연도 · 분류 한 줄. 라이브를 고르면 그 줄이 '← 위버스 라이브' + 멤버 메뉴로 바뀐다 */}
      <div className="mc-filter">
        {year !== undefined && (
          <ChipMenu
            className="mc-year-btn"
            label="연도"
            buttonLabel={`연도 ${year === 'all' ? '전체' : year}`}
            options={[{ value: 'all' as const, label: '전체' }, ...years.map(y => ({ value: y, label: String(y) }))]}
            value={year}
            onChange={y => setFilter('y', String(y))}
          >
            {year === 'all' ? '전체' : year}
          </ChipMenu>
        )}
        <div className="mc-chips">
          {category === 'live' ? (
            <>
              <button
                type="button"
                className="mc-chip mc-chip-back active"
                onClick={() => setFilter('c', 'all')}
              >
                <ArrowRightIcon size={12} /> {CATEGORY_LABEL.live}
              </button>
              <ChipMenu
                className={member === 'all' ? '' : 'active'}
                label="라이브 멤버"
                options={MEMBERS}
                value={member}
                onChange={m => setFilter('mb', m)}
              >
                {MEMBERS.find(m => m.value === member)!.label}
              </ChipMenu>
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

      {months.map(({ year: y, month, videos: list }) => (
        <section key={`${y}-${month}`} className="mc-month">
          <h2 className="mc-month-title">
            {year === 'all' ? `${y}년 ${month}월` : `${month}월`} <small>{list.length}개</small>
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
