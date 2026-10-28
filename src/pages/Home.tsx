import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CloseIcon, SearchIcon } from '../components/Icons';
import { useData } from '../hooks/useData';
import { useViewerParam } from '../hooks/useViewerParam';
import { getTodayString } from '../lib/dailyPick';
import { buildStoryYears, fallbackDay, frameMedia, latestMoments, parseStoryParam, shouldAutoOpen, storyDays } from '../lib/onThisDayStory';
import type { StoryData, StoryFrame, StoryYear } from '../lib/onThisDayStory';
import { isSaveData, prefersReducedMotion } from '../lib/networkPrefs';
import OnThisDayCards from '../components/home/OnThisDayCards';
import StoryViewer from '../components/StoryViewer';
import MomentViewer from '../components/MomentViewer';

// AI 모드 placeholder 예시 (정확한 단어 없이도, 한국어/영어 모두 찾을 수 있음을 보여주기 위한 유도 문구)
const AI_EXAMPLES = ['비 오는 날 사진', 'smiling on stage', '데뷔 초 포스트', 'winter vibes'];

const AUTO_SHOWN_KEY = 'mmemory.storyAutoShownDate';

/**
 * 자동 열기 로딩 화면 단계.
 * wait: 아직 정하지 않음 · opening: 열기로 함(뷰어가 뜰 때까지 로딩 화면 유지) · fading: 안 열기로 함(로딩 화면 사라지는 중) · done
 */
type AutoPhase = 'wait' | 'opening' | 'fading' | 'done';

interface HomeStory {
  years: StoryYear[];
  /** 카드에 보이는 날 `MM-DD` (대체 날이면 대체 날짜) */
  day: string | null;
  isFallback: boolean;
}

/** 오늘 그 해 오늘. 없으면 날짜 시드로 고른 대체 날 */
function computeHomeStory(data: StoryData, today: string): HomeStory {
  const years = buildStoryYears(data, today);
  if (years.length) return { years, day: today.slice(5), isFallback: false };
  // 올해 콘텐츠만 있는 날은 '과거 연도만' 규칙에 걸려 비므로, 올해 기준으로 스토리가 나오는 날만 후보로 둔다
  const year = today.slice(0, 4);
  const candidates = storyDays(data).filter(d => buildStoryYears(data, `${year}-${d}`).length > 0);
  const day = fallbackDay(today, candidates);
  return { years: day ? buildStoryYears(data, `${year}-${day}`) : [], day, isFallback: true };
}

function cardLabel(story: HomeStory | null): string {
  if (!story?.day) return '';
  const [m, d] = story.day.split('-').map(Number);
  return story.isFallback ? `오늘은 기록이 없어요 · 대신 ${m}월 ${d}일` : `그 해 오늘 · ${m}월 ${d}일`;
}

/** 화면 밖 video에 url을 넣어 미리 받는다. 없으면 만든다 */
function primeVideo(el: HTMLVideoElement | null, url: string): HTMLVideoElement {
  const video = el ?? Object.assign(document.createElement('video'), { muted: true, preload: 'auto' });
  if (video.getAttribute('src') !== url) video.src = url;
  return video;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'ai'>('keyword');
  const [aiExampleIdx, setAiExampleIdx] = useState(0);
  const navigate = useNavigate();
  const {
    videos, moments, posts, episodes, photos,
    fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchPhotos, fetchMemberSettings,
  } = useData();
  const [today] = useState(getTodayString);
  const { value: storyParam, open: openStory, close: closeStory } = useViewerParam('s');
  const { value: momentParam, open: openMoment, close: closeMoment } = useViewerParam('m');
  // 자동으로 연 해. 스토리 뷰어는 마운트 때만 읽는다
  const [autoYear, setAutoYear] = useState<number | null>(null);
  const autoTriedRef = useRef(false);
  const [openYears, setOpenYears] = useState<{ param: string; years: StoryYear[] } | null>(null);
  // 그날 첫 방문이면 데이터를 기다리는 동안 로딩 화면을 띄운다
  const [autoPhase, setAutoPhase] = useState<AutoPhase>(() => {
    if (storyParam !== null || momentParam !== null) return 'done';
    try { return localStorage.getItem(AUTO_SHOWN_KEY) !== today ? 'wait' : 'done'; } catch { return 'done'; }
  });
  const [autoInstant, setAutoInstant] = useState(false);
  // 칸을 누르는 순간부터 받아 두는 화면 밖 video. 뷰어가 열리면 버린다(같은 URL이라 캐시를 탄다)
  const preloadRef = useRef<HTMLVideoElement | null>(null);

  const story = useMemo(() => {
    if (!videos || !moments || !posts || !episodes || !photos) return null;
    return computeHomeStory({ videos, moments, posts, episodes, photos }, today);
  }, [videos, moments, posts, episodes, photos, today]);

  const storyOpens = !!story && story.years.length > 0 && !story.isFallback;
  // `?s=YEAR` 또는 `?s=YEAR.FRAMEINDEX`
  const storyStart = parseStoryParam(storyParam);
  const storyYear = storyStart?.year ?? null;
  // 열린 뷰어의 해 목록은 열 때 고정한다. 뒤에 새 데이터가 와도 카드만 바뀌고 뷰어는 그대로
  // (StoryViewer는 years가 바뀌는 것을 다루지 않는다)
  if (storyYear === null) {
    if (openYears) setOpenYears(null);
  } else if (openYears?.param !== storyParam && story?.years.some(y => y.year === storyYear)) {
    setOpenYears({ param: storyParam!, years: story.years });
  }
  const viewerYears = openYears?.param === storyParam ? openYears.years : null;
  const showStory = !!viewerYears && storyYear !== null && viewerYears.some(y => y.year === storyYear);
  // 뷰어가 떴으면 로딩 화면을 내린다 (같은 렌더에 바뀌어 홈이 비치지 않는다)
  if (autoPhase === 'opening' && showStory) setAutoPhase('done');
  // 저장분으로 '오늘은 없음'이면 로딩 화면 없이 홈을 보여주고 새 데이터를 기다린다
  const overlayOn = autoPhase === 'opening' || autoPhase === 'fading' || (autoPhase === 'wait' && (!story || storyOpens));

  const latest = useMemo(() => (moments ? latestMoments(moments) : null), [moments]);

  const preload = (url: string) => {
    if (isSaveData()) return;
    preloadRef.current = primeVideo(preloadRef.current, url);
  };

  // 스토리 첫 장면을 뷰어가 뜨기 전에 받아 둔다
  const preloadFrame = (frame: StoryFrame | undefined) => {
    if (isSaveData()) return;
    const { video, image } = frameMedia(frame);
    if (image) new Image().src = image;
    if (video) preload(video);
  };

  // 그날 처음 홈에 오면 스토리 자동 열기 — 마운트당 한 번.
  // 기기에 저장된 데이터로 열 수 있으면 바로 열고, 아니면 새로 받은 데이터(final)로 정한다
  const maybeAutoOpen = useEffectEvent((s: HomeStory | null, final: boolean) => {
    if (autoTriedRef.current) return;
    const opens = !!s && s.years.length > 0 && !s.isFallback;
    // 저장분엔 없어도 새 데이터엔 있을 수 있다
    if (!opens && !final) return;
    autoTriedRef.current = true;
    const skip = () => setAutoPhase(overlayOn && !prefersReducedMotion() ? 'fading' : 'done');
    if (!s || momentParam !== null) { skip(); return; }
    let lastShown: string | null = null;
    try { lastShown = localStorage.getItem(AUTO_SHOWN_KEY); } catch { /* 저장소 막힘 */ }
    if (!shouldAutoOpen(lastShown, today, s.years.length > 0, s.isFallback)) { skip(); return; }
    if (storyParam === null) {
      const first = s.years[0];
      preloadFrame(first.frames[0]);
      setAutoYear(first.year);
      setAutoInstant(overlayOn);
      setAutoPhase('opening');
      openStory(String(first.year));
    } else {
      setAutoPhase('done');
    }
    try { localStorage.setItem(AUTO_SHOWN_KEY, today); } catch { /* 저장소 막힘 */ }
  });

  // 로딩 화면 ✕: 오늘은 다시 띄우지 않는다
  const cancelAuto = () => {
    autoTriedRef.current = true;
    try { localStorage.setItem(AUTO_SHOWN_KEY, today); } catch { /* 저장소 막힘 */ }
    setAutoPhase('done');
  };

  useEffect(() => maybeAutoOpen(story, false), [story]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchVideos(), fetchMoments(), fetchPosts(), fetchEpisodes(), fetchPhotos(),
      // 스토리 채팅 프레임용. 실패해도 스토리는 연다
      fetchMemberSettings().catch(() => null),
    ])
      .then(([videos, moments, posts, episodes, photos]) => {
        if (alive) maybeAutoOpen(computeHomeStory({ videos, moments, posts, episodes, photos }, today), true);
      })
      .catch((error) => {
        console.error('Error loading home:', error);
        if (alive) maybeAutoOpen(null, true);
      });
    return () => { alive = false; };
  }, [fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchPhotos, fetchMemberSettings, today]);

  // AI 모드일 때 placeholder 예시를 일정 주기로 회전
  useEffect(() => {
    if (searchMode !== 'ai') return;
    const id = setInterval(() => {
      setAiExampleIdx(i => (i + 1) % AI_EXAMPLES.length);
    }, 2800);
    return () => clearInterval(id);
  }, [searchMode]);

  const discardPreload = useCallback(() => {
    const el = preloadRef.current;
    if (!el) return;
    el.removeAttribute('src');
    el.load();
    preloadRef.current = null;
  }, []);

  // 뷰어(자식) effect가 먼저 돌아 src를 넣은 뒤에 버린다
  useEffect(() => {
    if (momentParam || showStory) discardPreload();
  }, [momentParam, showStory, discardPreload]);
  useEffect(() => discardPreload, [discardPreload]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const suffix = searchMode === 'ai' ? '&mode=ai' : '';
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}${suffix}`);
    }
  };

  const handleOpenContent = (year: number, frameIndex: number) => {
    setAutoYear(null);
    preloadFrame(story?.years.find(y => y.year === year)?.frames[frameIndex]);
    openStory(frameIndex > 0 ? `${year}.${frameIndex}` : String(year));
  };

  const momentIndex = latest && momentParam ? latest.findIndex(m => m.id === momentParam) : -1;

  return (
    <div className="hm">
      <OnThisDayCards
        years={story ? story.years : null}
        label={cardLabel(story)}
        paused={storyParam !== null || momentParam !== null}
        onOpen={handleOpenContent}
      />

      <div className="home-search-row">
        <form onSubmit={handleSearch} className={`home-search ${searchMode === 'ai' ? 'ai-mode' : ''}`}>
          <input
            type="text"
            className="home-search-input"
            placeholder={searchMode === 'ai' ? `예: ${AI_EXAMPLES[aiExampleIdx]}` : '검색...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="button"
            className={`home-ai-switch ${searchMode === 'ai' ? 'on' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setSearchMode(searchMode === 'ai' ? 'keyword' : 'ai')}
            aria-pressed={searchMode === 'ai'}
            title={searchMode === 'ai' ? 'AI 검색 켜짐 (끄려면 클릭)' : 'AI 검색으로 전환'}
          >
            ✨ AI
          </button>
          <button type="submit" className="home-search-btn" aria-label="검색">
            <SearchIcon size={16} />
          </button>
        </form>
        {searchMode === 'ai' && (
          <p className="home-search-hint">정확한 단어를 몰라도 느낌·상황으로 찾아드려요</p>
        )}
      </div>

      <section className="hm-latest">
        <div className="hm-sec">
          <h2 className="hm-sec-title">새로 올라온 모먼트</h2>
          <Link to="/videos" className="hm-sec-more">모먼트 탭 ›</Link>
        </div>
        <div className="hm-grid" aria-busy={latest ? undefined : true}>
          {latest
            ? latest.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className="hm-cell"
                  onPointerDown={() => preload(m.tweet_url)}
                  onClick={() => openMoment(m.id)}
                  aria-label={m.title || '모먼트'}
                >
                  {m.thumbnail_url && <img src={m.thumbnail_url} alt="" loading="lazy" decoding="async" />}
                </button>
              ))
            : Array.from({ length: 9 }, (_, i) => <div key={i} className="hm-cell skeleton-shimmer" />)}
        </div>
      </section>

      <Link to="/ask" className="hm-ask">궁금한 점이나 요청 남기러 가기 →</Link>

      {overlayOn && (
        <div
          className={autoPhase === 'fading' ? 'st st-wait is-out' : 'st st-wait'}
          role="dialog"
          aria-modal="true"
          aria-label="그 해 오늘 불러오는 중"
          aria-busy="true"
          onAnimationEnd={e => { if (e.target === e.currentTarget && autoPhase === 'fading') setAutoPhase('done'); }}
        >
          <span className="st-spinner" aria-hidden />
          <div className="st-top">
            {/* 뷰어와 ✕ 자리를 맞추려고 진행 막대 높이만 둔다 */}
            <div className="st-bars" aria-hidden><i style={{ visibility: 'hidden' }} /></div>
            <div className="st-row">
              <span />
              <span className="st-actions">
                <button type="button" className="st-btn" onClick={cancelAuto} aria-label="닫기">
                  <CloseIcon size={24} />
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {showStory && viewerYears && storyYear !== null && (
        <StoryViewer
          key={storyParam}
          years={viewerYears}
          startYear={storyYear}
          startFrame={storyStart?.frame ?? 0}
          autoStarted={autoYear === storyYear}
          instant={autoInstant && autoYear === storyYear}
          onClose={closeStory}
        />
      )}

      {latest && momentIndex >= 0 && (
        <MomentViewer key={momentParam} moments={latest} startIndex={momentIndex} onClose={closeMoment} />
      )}
    </div>
  );
}
