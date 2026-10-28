import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SearchIcon } from '../components/Icons';
import { useData } from '../hooks/useData';
import { useViewerParam } from '../hooks/useViewerParam';
import { getTodayString } from '../lib/dailyPick';
import {
  buildStoryForDate, buildStoryYears, fallbackLabel, frameMedia, groupStoryContents, parseStoryParam, pickFallbackDate,
  shouldAutoOpen,
} from '../lib/onThisDayStory';
import type { StoryData, StoryFrame, StoryYear } from '../lib/onThisDayStory';
import { isSaveData, prefersReducedMotion } from '../lib/networkPrefs';
import { entrySplashPhase, releaseEntrySplash, useEntrySplash } from '../lib/entrySplash';
import OnThisDayCards from '../components/home/OnThisDayCards';
import StoryViewer from '../components/StoryViewer';
import type { StoryOrigin } from '../components/StoryViewer';
import MomentViewer from '../components/MomentViewer';
import VideoCard from '../components/moments/VideoCard';
import VideoDetailModal from '../components/moments/VideoDetailModal';
import { latestVideos, momentsByVideo } from '../lib/videoCatalog';
import type { Moment } from '../lib/database/types';

// AI 모드 placeholder 예시 (정확한 단어 없이도, 한국어/영어 모두 찾을 수 있음을 보여주기 위한 유도 문구)
const AI_EXAMPLES = ['비 오는 날 사진', 'smiling on stage', '데뷔 초 포스트', 'winter vibes'];

const NO_MOMENTS: Moment[] = [];

const AUTO_SHOWN_KEY = 'mmemory.storyAutoShownDate';
// ?date=YYYY-MM-DD로 날짜를 바꿔 볼 때(확인용)는 '하루 한 번'·'대체 날 제외' 규칙 없이 항상 자동으로 연다
const DATE_OVERRIDDEN = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('date');
// 자동 열기: 로고 화면이 다 걷힌 뒤 홈을 잠깐 가만히 보여 주고 → 첫 카드를 들어 올리며 화면을 살짝 어둡게 한 뒤 →
// 그 카드에서 천천히 펼친다 (StoryViewer AUTO_ZOOM_MS)
const AUTO_DELAY_MS = 600;
const LIFT_MS = 320; // home.css .hm-card.is-lift · .hm-scrim과 같게

interface HomeStory {
  years: StoryYear[];
  /** 카드 위 이름 */
  label: string;
  isFallback: boolean;
}

/** 오늘 그 해 오늘. 없으면 날짜 시드로 고른 올해(없으면 가장 최근 해)의 하루 */
function computeHomeStory(data: StoryData, today: string): HomeStory {
  const years = buildStoryYears(data, today);
  if (years.length) {
    const [m, d] = today.slice(5).split('-').map(Number);
    return { years, label: `그 해 ${m}월 ${d}일`, isFallback: false };
  }
  const date = pickFallbackDate(data, today);
  const year = date ? buildStoryForDate(data, date) : null;
  if (!date || !year) return { years: [], label: '', isFallback: true };
  const label = fallbackLabel(date, today);
  return { years: [{ ...year, yearsAgo: Number(today.slice(0, 4)) - year.year, label }], label, isFallback: true };
}

/** 열린(또는 닫히는 중인) 스토리 뷰어. 해 목록은 열 때 고정한다 */
interface OpenStory {
  /** 뷰어 key. 열 때마다 새로 (닫히는 중에 다시 열어도 새 뷰어) */
  id: number;
  param: string;
  years: StoryYear[];
  year: number;
  frame: number;
  auto: boolean;
  closing: boolean;
}

/**
 * 홈 카드(OnThisDayCards의 data-story-card)의 화면 위치. 가로 줄에서 다 보이지 않으면 그 카드가 보이게 줄을 바로 옮긴 뒤 잰다.
 * 카드가 없거나 세로로 화면 밖이면 null
 */
function measureStoryCard(year: number, startIndex: number): StoryOrigin | null {
  const card = document.querySelector<HTMLElement>(`.hm-card[data-story-card="${year}:${startIndex}"]`);
  if (!card) return null;
  let r = card.getBoundingClientRect();
  const rail = card.closest<HTMLElement>('.hm-cards');
  if (rail) {
    const box = rail.getBoundingClientRect();
    if (r.left < box.left || r.right > box.right) {
      // 스냅 위치(카드 왼쪽 = 줄 왼쪽 + scroll-padding)로 맞춰 스냅이 다시 움직이지 않게
      const pad = parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0;
      rail.scrollLeft += r.left - (box.left + pad);
      r = card.getBoundingClientRect();
    }
  }
  if (!r.width || !r.height || r.bottom <= 0 || r.top >= window.innerHeight) return null;
  const img = card.querySelector('img');
  return {
    rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    radius: parseFloat(getComputedStyle(card).borderTopLeftRadius) || 12,
    image: img?.currentSrc || img?.getAttribute('src') || undefined,
  };
}

/** 화면 밖 video에 url을 넣어 미리 받는다. 없으면 만든다 */
function primeVideo(el: HTMLVideoElement | null, url: string): HTMLVideoElement {
  const video = el ?? Object.assign(document.createElement('video'), { muted: true, preload: 'auto' });
  if (video.getAttribute('src') !== url) video.src = url;
  return video;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'ai'>('ai');
  const [aiExampleIdx, setAiExampleIdx] = useState(0);
  const navigate = useNavigate();
  const {
    videos, moments, posts, episodes, photos,
    fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchPhotos, fetchMemberSettings,
  } = useData();
  const [today] = useState(getTodayString);
  const { value: storyParam, open: openStory, close: closeStory } = useViewerParam('s');
  const { value: momentParam, open: openMoment, close: closeMoment } = useViewerParam('m');
  // 새로 올라온 영상 상세 모달 (모먼트 탭 표지와 같은 `?v=`)
  const { value: detailParam, open: openDetail, close: closeDetail } = useViewerParam('v');
  // 자동으로 연 해. 스토리 뷰어는 마운트 때만 읽는다
  const [autoYear, setAutoYear] = useState<number | null>(null);
  const autoTriedRef = useRef(false);
  const [viewer, setViewer] = useState<OpenStory | null>(null);
  // 마지막으로 연 카드 (닫을 때 지금 콘텐츠 카드를 못 찾으면 여기로 줄어든다)
  const tappedRef = useRef<{ year: number; startIndex: number } | null>(null);
  // 자동 열기 직전에 들어 올리는 카드 `YEAR:startIndex`
  const [liftCard, setLiftCard] = useState<string | null>(null);
  // 자동 열기를 기다리는 동안엔 카드 미리보기 영상을 틀지 않는다 — 펼칠 때 카드 그림(썸네일)과 같은 장면에서 이어지게
  const [autoPending, setAutoPending] = useState(false);
  const autoTimerRef = useRef(0);
  // 그날 첫 방문이면 자동 열기를 정할 때까지 입장 로고 화면을 붙잡아 둔다
  const [autoCandidate] = useState(() => {
    if (storyParam !== null || momentParam !== null || detailParam !== null) return false;
    if (DATE_OVERRIDDEN) return true;
    try { return localStorage.getItem(AUTO_SHOWN_KEY) !== today; } catch { return false; }
  });
  const splash = useEntrySplash();
  // 로고 화면이 다 사라지면 열 해 (잠시 뒤 첫 카드에서 커지며 열린다)
  const pendingAutoRef = useRef<number | null>(null);
  // 칸을 누르는 순간부터 받아 두는 화면 밖 video. 뷰어가 열리면 버린다(같은 URL이라 캐시를 탄다)
  const preloadRef = useRef<HTMLVideoElement | null>(null);

  const story = useMemo(() => {
    if (!videos || !moments || !posts || !episodes || !photos) return null;
    return computeHomeStory({ videos, moments, posts, episodes, photos }, today);
  }, [videos, moments, posts, episodes, photos, today]);

  // `?s=YEAR` 또는 `?s=YEAR.FRAMEINDEX`
  const storyStart = parseStoryParam(storyParam);
  const storyYear = storyStart?.year ?? null;
  // 열린 뷰어의 해 목록은 열 때 고정한다. 뒤에 새 데이터가 와도 카드만 바뀌고 뷰어는 그대로
  // (StoryViewer는 years가 바뀌는 것을 다루지 않는다).
  // URL에서 빠지면(닫기·뒤로가기) 바로 내리지 않고 카드로 줄어드는 동안 그대로 둔다
  if (storyParam === null || storyYear === null) {
    if (viewer && !viewer.closing) setViewer({ ...viewer, closing: true });
  } else if ((!viewer || viewer.param !== storyParam || viewer.closing) && story?.years.some(y => y.year === storyYear)) {
    // 들어 올린 카드·어두운 막은 새 뷰어가 같은 자리·농도에서 이어받는다 — 같은 렌더에서 내려야 사이에 빈 장면이 없다
    // (URL 갱신은 따로 늦게 렌더되므로 여는 쪽에서 미리 내리지 않는다)
    if (liftCard) setLiftCard(null);
    if (autoPending) setAutoPending(false);
    setViewer({
      id: (viewer?.id ?? 0) + 1,
      param: storyParam,
      years: story.years,
      year: storyYear,
      frame: storyStart?.frame ?? 0,
      auto: autoYear === storyYear,
      closing: false,
    });
  }
  const showStory = !!viewer && !viewer.closing;

  const latest = useMemo(() => (videos ? latestVideos(videos) : null), [videos]);
  const momentMap = useMemo(() => momentsByVideo(moments ?? []), [moments]);

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

  // 그 사이 사용자가 직접 뭔가 열었으면 자동 열기는 그만둔다
  const userOpenedSomething = useEffectEvent(() => storyParam !== null || momentParam !== null || detailParam !== null);

  // 홈을 잠깐 보여 준 뒤 첫 카드를 들어 올리고, 그 카드에서 연다. 동작 줄이기 설정이면 들지 않고 바로(뷰어가 페이드)
  const scheduleAutoOpen = useEffectEvent((year: number) => {
    window.clearTimeout(autoTimerRef.current);
    const open = () => {
      if (userOpenedSomething()) { setLiftCard(null); setAutoPending(false); return; }
      tappedRef.current = { year, startIndex: 0 };
      openStory(String(year));
    };
    autoTimerRef.current = window.setTimeout(() => {
      if (userOpenedSomething()) { setAutoPending(false); return; }
      if (prefersReducedMotion()) { open(); return; }
      const key = `${year}:0`;
      document.querySelector(`.hm-card[data-story-card="${key}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      setLiftCard(key);
      autoTimerRef.current = window.setTimeout(open, LIFT_MS);
    }, AUTO_DELAY_MS);
  });

  // 그날 처음 홈에 오면 스토리 자동 열기 — 마운트당 한 번.
  // 기기에 저장된 데이터로 열 수 있으면 바로 열고, 아니면 새로 받은 데이터(final)로 정한다
  const maybeAutoOpen = useEffectEvent((s: HomeStory | null, final: boolean) => {
    if (autoTriedRef.current) return;
    const opens = !!s && s.years.length > 0 && (DATE_OVERRIDDEN || !s.isFallback);
    // 저장분엔 없어도 새 데이터엔 있을 수 있다
    if (!opens && !final) return;
    autoTriedRef.current = true;
    releaseEntrySplash();
    if (!s || momentParam !== null || detailParam !== null) return;
    let lastShown: string | null = null;
    try { lastShown = localStorage.getItem(AUTO_SHOWN_KEY); } catch { /* 저장소 막힘 */ }
    if (!DATE_OVERRIDDEN && !shouldAutoOpen(lastShown, today, s.years.length > 0, s.isFallback)) return;
    if (DATE_OVERRIDDEN && s.years.length === 0) return;
    if (storyParam === null) {
      const first = s.years[0];
      preloadFrame(first.frames[0]);
      setAutoYear(first.year);
      setAutoPending(true);
      if (entrySplashPhase() !== 'off') pendingAutoRef.current = first.year;
      else scheduleAutoOpen(first.year);
    }
    if (!DATE_OVERRIDDEN) {
      try { localStorage.setItem(AUTO_SHOWN_KEY, today); } catch { /* 저장소 막힘 */ }
    }
  });

  useEffect(() => maybeAutoOpen(story, false), [story]);

  // 자동 열기 대상이 아니면 기다릴 것이 없다 — 로고 화면을 바로 내린다
  useEffect(() => {
    if (!autoCandidate) releaseEntrySplash();
  }, [autoCandidate]);

  const openPendingAuto = useEffectEvent((phase: typeof splash) => {
    const year = pendingAutoRef.current;
    if (year === null || phase !== 'off') return;
    pendingAutoRef.current = null;
    scheduleAutoOpen(year);
  });
  useEffect(() => openPendingAuto(splash), [splash]);

  useEffect(() => {
    const timer = autoTimerRef;
    return () => window.clearTimeout(timer.current);
  }, []);

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

  // 뷰어가 열고 닫을 때 쓰는 카드 위치: 그 프레임이 든 콘텐츠 카드 → 없으면 마지막으로 연 카드
  const storyOrigin = (year: number, frameIndex: number): StoryOrigin | null => {
    const y = viewer?.years.find(v => v.year === year);
    const group = y && groupStoryContents(y).find(g => frameIndex >= g.startIndex && frameIndex < g.startIndex + g.frames.length);
    const tapped = tappedRef.current;
    return (group ? measureStoryCard(year, group.startIndex) : null)
      ?? (tapped ? measureStoryCard(tapped.year, tapped.startIndex) : null);
  };
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
    tappedRef.current = { year, startIndex: frameIndex };
    preloadFrame(story?.years.find(y => y.year === year)?.frames[frameIndex]);
    openStory(frameIndex > 0 ? `${year}.${frameIndex}` : String(year));
  };

  const detail = useMemo(() => {
    const video = detailParam ? videos?.find(v => v.id === detailParam) : undefined;
    return video ? { video, list: momentMap.get(video.id) ?? NO_MOMENTS } : null;
  }, [detailParam, videos, momentMap]);

  // 모먼트 뷰어: `?m=`의 모먼트가 속한 영상의 모먼트 목록 (모먼트 탭과 같게)
  const momentViewer = useMemo(() => {
    if (!momentParam || !moments) return null;
    const videoId = moments.find(m => m.id === momentParam)?.video_id;
    const list = videoId ? momentMap.get(videoId) : undefined;
    const startIndex = list?.findIndex(m => m.id === momentParam) ?? -1;
    return list && startIndex >= 0 ? { list, startIndex } : null;
  }, [momentParam, moments, momentMap]);

  return (
    <div className="hm">
      <OnThisDayCards
        years={story ? story.years : null}
        label={story?.label ?? ''}
        paused={autoPending || storyParam !== null || momentParam !== null || detailParam !== null}
        liftCard={liftCard}
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
          <h2 className="hm-sec-title">새로 올라온 영상</h2>
          <Link to="/videos" className="hm-sec-more">모먼트 탭 ›</Link>
        </div>
        <div className="mc-rail" aria-busy={latest ? undefined : true}>
          {latest
            ? latest.map(v => (
                <VideoCard key={v.id} video={v} moments={momentMap.get(v.id) ?? NO_MOMENTS} onOpen={openDetail} />
              ))
            : Array.from({ length: 3 }, (_, i) => <div key={i} className="mc-card hm-latest-skel skeleton-shimmer" />)}
        </div>
      </section>

      <Link to="/ask" className="hm-ask">궁금한 점이나 요청 남기러 가기 →</Link>

      {liftCard && <div className="hm-scrim" aria-hidden />}

      {viewer && (
        <StoryViewer
          key={viewer.id}
          years={viewer.years}
          startYear={viewer.year}
          startFrame={viewer.frame}
          autoStarted={viewer.auto}
          originFor={storyOrigin}
          closing={viewer.closing}
          onClose={closeStory}
          onExited={() => setViewer(v => (v?.id === viewer.id ? null : v))}
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
