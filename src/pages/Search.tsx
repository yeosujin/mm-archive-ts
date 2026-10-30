import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { Video, Moment, Post, Episode } from '../lib/database';
import type { CalendarEntry } from '../lib/calendarDays';
import { episodeEntryBuilder, momentEntry, postEntry } from '../lib/calendarDays';
import { formatDotDate, momentsByVideo } from '../lib/videoCatalog';
import { SearchIcon } from '../components/Icons';
import { useData } from '../hooks/useData';
import { useViewerParam } from '../hooks/useViewerParam';
import { semanticSearch, type SemanticHit } from '../lib/semanticSearch';
import VideoCard from '../components/moments/VideoCard';
import VideoDetailModal from '../components/moments/VideoDetailModal';
import EntryCard from '../components/EntryCard';
import EntryDetail from '../components/calendar/EntryDetail';
import MomentViewer from '../components/MomentViewer';

type Kind = 'video' | 'moment' | 'post' | 'episode';
type FilterType = 'all' | Kind;
type SearchMode = 'keyword' | 'ai';

interface Result {
  kind: Kind;
  date: string;
  entry: CalendarEntry;
}

const KINDS: Kind[] = ['video', 'moment', 'post', 'episode'];
const KIND_LABEL: Record<Kind, string> = { video: '영상', moment: '모먼트', post: '포스트', episode: '에피소드' };

// AI 모드 placeholder 예시 (정확한 단어 없이도, 한국어/영어 모두 찾을 수 있음을 보여주기 위한 유도 문구)
const AI_EXAMPLES = ['비 오는 날 사진', 'smiling on stage', '데뷔 초 포스트', 'winter vibes'];

// 키워드 모드에서 매칭된 부분을 <mark>로 강조 (첫 번째 일치 지점). query가 비면 원본 그대로 반환
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const mode: SearchMode = searchParams.get('mode') === 'ai' ? 'ai' : 'keyword';

  const {
    videos, moments, posts, episodes, memberSettings,
    fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchMemberSettings,
  } = useData();
  // 상세는 그 자리 팝업: 영상 `?v=`, 모먼트 `?m=`, 포스트·에피소드 `?d=kind:id`
  const { value: momentParam, open: openMoment, close: closeMoment } = useViewerParam('m');
  const { value: detailParam, open: openDetail, close: closeDetail } = useViewerParam('v');
  const { value: entryParam, open: openEntry, close: closeEntry } = useViewerParam('d');

  const [failed, setFailed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [inputValue, setInputValue] = useState(query);
  // AI 검색 결과는 어떤 검색어의 것인지와 함께 둔다. 지금 검색어의 결과가 아직 없으면 불러오는 중
  const [ai, setAi] = useState<{ query: string; hits: SemanticHit[]; error: boolean } | null>(null);
  const [aiExampleIdx, setAiExampleIdx] = useState(0);

  // AI 모드일 때 placeholder 예시를 일정 주기로 회전
  useEffect(() => {
    if (mode !== 'ai') return;
    const id = setInterval(() => {
      setAiExampleIdx(i => (i + 1) % AI_EXAMPLES.length);
    }, 2800);
    return () => clearInterval(id);
  }, [mode]);

  // URL q → 입력창 동기화 (뒤로가기/홈 재진입 등). 검색어가 바뀌면 필터는 전체로
  const [syncedQuery, setSyncedQuery] = useState(query);
  if (syncedQuery !== query) {
    setSyncedQuery(query);
    setInputValue(query);
    setActiveFilter('all');
  }

  useEffect(() => {
    Promise.all([fetchVideos(), fetchMoments(), fetchPosts(), fetchEpisodes(), fetchMemberSettings()])
      .catch((error) => {
        console.error('Error loading data:', error);
        setFailed(true);
      });
  }, [fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchMemberSettings]);

  const setMode = (m: SearchMode) => {
    const params = new URLSearchParams(searchParams);
    if (m === 'ai') params.set('mode', 'ai');
    else params.delete('mode');
    navigate(`/search?${params.toString()}`, { replace: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const suffix = mode === 'ai' ? '&mode=ai' : '';
    navigate(`/search?q=${encodeURIComponent(trimmed)}${suffix}`);
  };

  const trimmedQuery = query.trim();
  const searchLower = trimmedQuery.toLowerCase();

  // AI(시멘틱) 검색: AI 모드일 때만 호출 (일반 모드에선 임베딩 쿼터를 쓰지 않음)
  const aiQuery = mode === 'ai' ? trimmedQuery : '';
  useEffect(() => {
    if (!aiQuery) return;
    let cancelled = false;
    semanticSearch(aiQuery, 30)
      .then((hits) => {
        if (!cancelled) setAi({ query: aiQuery, hits, error: false });
      })
      .catch((e) => {
        console.error('AI search failed:', e);
        if (!cancelled) setAi({ query: aiQuery, hits: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [aiQuery]);
  const aiResult = aiQuery && ai?.query === aiQuery ? ai : null;
  const aiHits = aiResult?.hits ?? [];
  const aiLoading = !!aiQuery && !aiResult;
  const aiError = !!aiResult?.error;

  const loaded = !!(videos && moments && posts && episodes);
  const momentMap = useMemo(() => momentsByVideo(moments ?? []), [moments]);

  // 검색 결과 하나를 카드 항목으로 (캘린더 카드와 같은 모양)
  const toResult = useMemo(() => {
    const videoById = new Map((videos ?? []).map(v => [v.id, v]));
    const toEpisode = episodeEntryBuilder({ videos: videos ?? [], moments: moments ?? [], posts: posts ?? [], memberSettings });
    return {
      toEpisode,
      video: (v: Video): Result => ({ kind: 'video', date: v.date, entry: { kind: 'video', id: v.id, video: v, moments: momentMap.get(v.id) ?? [] } }),
      moment: (m: Moment): Result => ({ kind: 'moment', date: m.date, entry: momentEntry(m, m.video_id ? videoById.get(m.video_id) : undefined) }),
      post: (p: Post): Result => ({ kind: 'post', date: p.date, entry: postEntry(p) }),
      episode: (e: Episode): Result => ({ kind: 'episode', date: e.date, entry: toEpisode(e) }),
    };
  }, [videos, moments, posts, memberSettings, momentMap]);

  // 유사도 점수가 압축돼 있어(대부분 0.65~0.72) 고정 임계값은 부적합.
  // "절대 바닥값(무관한 노이즈 제거) + 최고점 대비 상대 컷(뚜렷한 결과만 강조)" 조합.
  const AI_SIM_FLOOR = 0.64;   // 이보다 낮으면 사실상 무관 → 제거 (교차언어 매칭은 같은 언어보다 유사도가 낮게 나와 값을 낮춤)
  const AI_SIM_MARGIN = 0.05;  // 최고점보다 이만큼 이상 낮으면 제거
  const topSim = aiHits.length ? aiHits[0].similarity : 0;
  const aiCutoff = Math.max(AI_SIM_FLOOR, topSim - AI_SIM_MARGIN);
  const strongHits = mode === 'ai' ? aiHits.filter(h => h.similarity >= aiCutoff) : [];

  let results: Result[] = [];
  if (loaded && trimmedQuery) {
    if (mode === 'ai') {
      // AI: 유사도 순 그대로. 캐시 데이터에서 못 찾으면 제외
      results = strongHits.flatMap((h): Result[] => {
        if (h.content_type === 'video') { const v = videos.find(x => x.id === h.content_id); return v ? [toResult.video(v)] : []; }
        if (h.content_type === 'moment') { const m = moments.find(x => x.id === h.content_id); return m ? [toResult.moment(m)] : []; }
        if (h.content_type === 'post') { const p = posts.find(x => x.id === h.content_id); return p ? [toResult.post(p)] : []; }
        if (h.content_type === 'episode') { const e = episodes.find(x => x.id === h.content_id); return e ? [toResult.episode(e)] : []; }
        return [];
      });
    } else {
      // 키워드(글자 일치): 최신순, 같은 날이면 영상 → 모먼트 → 포스트 → 에피소드
      const hit = (title: string | undefined, date: string) =>
        !!title?.toLowerCase().includes(searchLower) || date.includes(trimmedQuery);
      results = [
        ...videos.filter(v => hit(v.title, v.date)).map(toResult.video),
        ...moments.filter(m => hit(m.title, m.date)).map(toResult.moment),
        ...posts.filter(p => hit(p.title, p.date)).map(toResult.post),
        ...episodes.filter(e => hit(e.title, e.date)).map(toResult.episode),
      ].sort((a, b) => b.date.localeCompare(a.date) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
    }
  }

  const counts = Object.fromEntries(KINDS.map(k => [k, results.filter(r => r.kind === k).length])) as Record<Kind, number>;
  // 모드를 바꿔 고른 종류가 0건이 되면 전체로
  const filter: FilterType = activeFilter !== 'all' && counts[activeFilter] ? activeFilter : 'all';
  const shown = filter === 'all' ? results : results.filter(r => r.kind === filter);

  // 하이라이트는 키워드 모드에서만 (AI 모드는 의미 기반이라 정확한 일치 지점이 없음)
  const kw = mode === 'keyword' ? trimmedQuery : '';

  // 뷰어: 영상에 딸린 모먼트는 그 영상의 모먼트 목록, 영상 없는 모먼트는 그 하나
  const momentViewer = useMemo(() => {
    if (!momentParam || !moments) return null;
    const moment = moments.find(m => m.id === momentParam);
    if (!moment) return null;
    const list = moment.video_id ? momentMap.get(moment.video_id) ?? [moment] : [moment];
    const startIndex = list.findIndex(m => m.id === momentParam);
    return startIndex >= 0 ? { list, startIndex } : null;
  }, [momentParam, moments, momentMap]);

  const entryDetail = (() => {
    if (!entryParam || !loaded) return null;
    const [kind, id] = entryParam.split(':');
    if (kind === 'post') {
      const p = posts.find(x => x.id === id);
      return p ? postEntry(p) : null;
    }
    if (kind === 'episode') {
      const e = episodes.find(x => x.id === id);
      return e ? toResult.toEpisode(e) : null;
    }
    return null;
  })();

  const detail = useMemo(() => {
    const video = detailParam ? videos?.find(v => v.id === detailParam) : undefined;
    return video ? { video, list: momentMap.get(video.id) ?? [] } : null;
  }, [detailParam, videos, momentMap]);

  const searchForm = (
    <div className="home-search-row">
      <form onSubmit={handleSubmit} className={`home-search ${mode === 'ai' ? 'ai-mode' : ''}`}>
        <input
          type="text"
          className="home-search-input"
          placeholder={mode === 'ai' ? `예: ${AI_EXAMPLES[aiExampleIdx]}` : '검색...'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          aria-label="검색어"
          autoFocus={!trimmedQuery}
        />
        <button
          type="button"
          className={`home-ai-switch ${mode === 'ai' ? 'on' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMode(mode === 'ai' ? 'keyword' : 'ai')}
          aria-pressed={mode === 'ai'}
          title={mode === 'ai' ? 'AI 검색 켜짐 (끄려면 클릭)' : 'AI 검색으로 전환'}
        >
          ✨ AI
        </button>
        <button type="submit" className="home-search-btn" aria-label="검색">
          <SearchIcon size={16} />
        </button>
      </form>
      {mode === 'ai' && (
        <p className="home-search-hint">정확한 단어를 몰라도 느낌·상황으로 찾아드려요</p>
      )}
    </div>
  );

  let body: React.ReactNode;
  if (!trimmedQuery) {
    body = <p className="mc-empty">검색어를 입력해 주세요</p>;
  } else if (!loaded) {
    body = failed
      ? <p className="mc-empty">검색할 기록을 불러오지 못했어요</p>
      : <div className="loading">불러오는 중</div>;
  } else if (mode === 'ai' && aiLoading) {
    body = <div className="loading">비슷한 기억조각 모으는 중</div>;
  } else if (mode === 'ai' && aiError) {
    body = <p className="mc-empty">AI 검색을 지금 사용할 수 없어요<br />잠시 후 다시 시도해 주세요</p>;
  } else if (results.length === 0) {
    body = (
      <div className="mc-empty">
        <p className="sr-empty-text">검색 결과가 없어요<br />{mode === 'ai' ? '다른 표현으로 검색해 보세요' : '다른 키워드로 검색해 보세요'}</p>
        {mode === 'keyword' && (
          <button type="button" className="ai-retry-btn" onClick={() => setMode('ai')}>
            ✨ AI로 다시 찾아볼까요?
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <>
        <p className="sr-count">‘{trimmedQuery}’ {mode === 'ai' ? 'AI 검색 · ' : ''}{results.length}건</p>
        <div className="mc-chips sr-chips">
          {(['all', ...KINDS] as FilterType[])
            .filter(k => k === 'all' || counts[k] > 0)
            .map(k => (
              <button
                key={k}
                type="button"
                aria-pressed={k === filter}
                className={`mc-chip${k === filter ? ' active' : ''}`}
                onClick={() => setActiveFilter(k)}
              >
                {k === 'all' ? '전체' : KIND_LABEL[k]} <small>{k === 'all' ? results.length : counts[k]}</small>
              </button>
            ))}
        </div>
        <div className="sr-grid">
          {shown.map(({ kind, date, entry }) => {
            const meta = `${KIND_LABEL[kind]} · ${formatDotDate(date)}`;
            return entry.kind === 'video' ? (
              <VideoCard
                key={`video:${entry.id}`}
                video={entry.video}
                moments={entry.moments}
                onOpen={openDetail}
                title={highlightText(entry.video.title, kw)}
                meta={meta}
              />
            ) : (
              <EntryCard
                key={`${entry.kind}:${entry.id}`}
                entry={entry}
                onOpen={() => (entry.kind === 'moment' ? openMoment(entry.id) : openEntry(`${entry.kind}:${entry.id}`))}
                title={highlightText(entry.title, kw)}
                meta={meta}
                badge={false}
              />
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div className="sr">
      {searchForm}
      {body}

      {/* 뷰어(1000)는 모달(900) 위. 모달 본문의 미리 받기 정리가 뷰어 effect 뒤에 돌도록 모달보다 앞에 둔다 */}
      {momentViewer && (
        <MomentViewer
          key={momentParam}
          moments={momentViewer.list}
          startIndex={momentViewer.startIndex}
          onClose={closeMoment}
          onOpenVideo={id => openDetail(id, ['m'])}
        />
      )}

      {entryDetail && (
        <EntryDetail
          key={entryParam}
          entry={entryDetail}
          videos={videos ?? []}
          moments={moments ?? []}
          posts={posts ?? []}
          memberSettings={memberSettings}
          onClose={closeEntry}
        />
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
