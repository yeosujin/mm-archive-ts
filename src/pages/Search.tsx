import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams, useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import type { Video, Moment, Post, Episode } from '../lib/database';
import type { CalendarEntry } from '../lib/calendarDays';
import { episodeEntryBuilder, momentEntry, postEntry } from '../lib/calendarDays';
import { formatDotDate, momentsByVideo } from '../lib/videoCatalog';
import { useData } from '../hooks/useData';
import { useViewerParam } from '../hooks/useViewerParam';
import { semanticSearch, type SemanticHit } from '../lib/semanticSearch';
import VideoCard from '../components/moments/VideoCard';
import VideoDetailModal from '../components/moments/VideoDetailModal';
import EntryCard from '../components/EntryCard';
import EntryDetail from '../components/calendar/EntryDetail';
import MomentViewer from '../components/MomentViewer';
import { VideoIcon, PostIcon, PhotoIcon, ChatIcon, CalendarIcon, SearchIcon } from '../components/Icons';
import type { LayoutContext } from '../components/Layout';

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

// 검색 결과 끝 '○○ 탭에서 전체 보기'. 영상·모먼트는 둘 다 모먼트 탭(/videos)
const KIND_TAB: Record<Kind, { to: string; label: string }> = {
  video: { to: '/videos', label: '모먼트 탭' },
  moment: { to: '/videos', label: '모먼트 탭' },
  post: { to: '/posts', label: '포스트 탭' },
  episode: { to: '/episodes', label: '에피소드 탭' },
};

// 검색어가 없을 때 보이는 바로가기 (검색 화면엔 탭 줄이 없다)
const SHORTCUTS = [
  { to: '/videos', label: '모먼트', desc: '영상과 모먼트', Icon: VideoIcon },
  { to: '/posts', label: '포스트', desc: 'SNS 게시물', Icon: PostIcon },
  { to: '/photos', label: '사진', desc: '사진 묶음', Icon: PhotoIcon },
  { to: '/episodes', label: '에피소드', desc: 'DM · 댓글 · 리스닝', Icon: ChatIcon },
  { to: '/calendar', label: '캘린더', desc: '날짜로 보기', Icon: CalendarIcon },
];

/** 입력하는 동안 보여 줄 자동완성 개수 */
const SUGGEST_LIMIT = 8;

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
  const location = useLocation();
  const { searchSlot } = useOutletContext<LayoutContext>();
  const query = searchParams.get('q') || '';
  // 기본은 AI (글자가 맞는 결과 + 비슷한 결과). `?mode=keyword`면 글자가 맞는 것만
  const mode: SearchMode = searchParams.get('mode') === 'keyword' ? 'keyword' : 'ai';

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
  // 자동완성: 입력하면 열고, 검색·선택·Esc·포커스 이탈이면 닫는다
  const [suggestOpen, setSuggestOpen] = useState(false);

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
    if (m === 'keyword') params.set('mode', 'keyword');
    else params.delete('mode');
    navigate(`/search?${params.toString()}`, { replace: true });
  };

  const runSearch = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSuggestOpen(false);
    const suffix = mode === 'keyword' ? '&mode=keyword' : '';
    navigate(`/search?q=${encodeURIComponent(trimmed)}${suffix}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(inputValue);
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

  // 키워드(글자 일치): 최신순, 같은 날이면 영상 → 모먼트 → 포스트 → 에피소드
  let results: Result[] = [];
  if (loaded && trimmedQuery) {
    const hit = (title: string | undefined, date: string) =>
      !!title?.toLowerCase().includes(searchLower) || date.includes(trimmedQuery);
    results = [
      ...videos.filter(v => hit(v.title, v.date)).map(toResult.video),
      ...moments.filter(m => hit(m.title, m.date)).map(toResult.moment),
      ...posts.filter(p => hit(p.title, p.date)).map(toResult.post),
      ...episodes.filter(e => hit(e.title, e.date)).map(toResult.episode),
    ].sort((a, b) => b.date.localeCompare(a.date) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));

    // AI 모드: 글자가 맞는 결과를 먼저, 그 뒤에 AI가 찾은 결과 중 겹치지 않는 것을 유사도 순으로.
    // AI는 30개 상한·점수 컷 때문에 글자가 맞는 결과도 놓칠 수 있다
    if (mode === 'ai') {
      const seen = new Set(results.map(r => `${r.kind}:${r.entry.id}`));
      const aiOnly = strongHits.flatMap((h): Result[] => {
        if (seen.has(`${h.content_type}:${h.content_id}`)) return [];
        if (h.content_type === 'video') { const v = videos.find(x => x.id === h.content_id); return v ? [toResult.video(v)] : []; }
        if (h.content_type === 'moment') { const m = moments.find(x => x.id === h.content_id); return m ? [toResult.moment(m)] : []; }
        if (h.content_type === 'post') { const p = posts.find(x => x.id === h.content_id); return p ? [toResult.post(p)] : []; }
        if (h.content_type === 'episode') { const e = episodes.find(x => x.id === h.content_id); return e ? [toResult.episode(e)] : []; }
        return [];
      });
      results = [...results, ...aiOnly];
    }
  }

  const counts = Object.fromEntries(KINDS.map(k => [k, results.filter(r => r.kind === k).length])) as Record<Kind, number>;
  // 모드를 바꿔 고른 종류가 0건이 되면 전체로
  const filter: FilterType = activeFilter !== 'all' && counts[activeFilter] ? activeFilter : 'all';
  const shown = filter === 'all' ? results : results.filter(r => r.kind === filter);

  // 검색어 강조. AI만 찾은 결과는 글자가 없어 강조되지 않는다
  const kw = trimmedQuery;

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

  // 앱 안에서 왔으면 뒤로, 링크로 바로 들어왔으면 홈으로
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/'));

  // 헤더 첫 줄에 띄우는 검색창 (Layout의 searchSlot)
  // 자동완성: 입력한 글자가 든 제목. 제목이 그 글자로 시작하는 것 먼저, 그다음 최신순. 같은 제목은 하나만
  const typed = inputValue.trim().toLowerCase();
  const suggestions: { title: string; kind: Kind }[] = [];
  if (suggestOpen && typed && loaded) {
    const pool: { title: string; kind: Kind; date: string }[] = [
      ...videos.map(v => ({ title: v.title, kind: 'video' as const, date: v.date })),
      ...moments.map(m => ({ title: m.title, kind: 'moment' as const, date: m.date })),
      ...posts.map(p => ({ title: p.title ?? '', kind: 'post' as const, date: p.date })),
      ...episodes.map(e => ({ title: e.title ?? '', kind: 'episode' as const, date: e.date })),
    ];
    const seen = new Set<string>();
    pool
      .filter(x => x.title.toLowerCase().includes(typed))
      .sort((a, b) =>
        Number(b.title.toLowerCase().startsWith(typed)) - Number(a.title.toLowerCase().startsWith(typed))
        || b.date.localeCompare(a.date))
      .forEach(x => {
        const key = x.title.trim().toLowerCase();
        if (suggestions.length >= SUGGEST_LIMIT || seen.has(key)) return;
        seen.add(key);
        suggestions.push({ title: x.title.trim(), kind: x.kind });
      });
  }

  const searchBar = (
    <>
      <button type="button" className="sr-back" onClick={goBack} aria-label="뒤로">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      <form onSubmit={handleSubmit} className={`sr-bar${mode === 'ai' ? ' ai-mode' : ''}`}>
        <input
          type="text"
          enterKeyHint="search"
          className="sr-input"
          placeholder="제목이나 날짜로 검색"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setSuggestOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSuggestOpen(false);
          }}
          onBlur={() => setSuggestOpen(false)}
          aria-label="검색어"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls="sr-suggest"
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
      </form>
      {suggestions.length > 0 && (
        <ul id="sr-suggest" className="sr-suggest" role="listbox" aria-label="자동완성">
          {suggestions.map(({ title, kind }) => (
            <li key={title} role="option" aria-selected={false}>
              <button
                type="button"
                className="sr-suggest-item"
                // 입력창 포커스를 지켜야 onBlur로 목록이 먼저 닫히지 않는다
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setInputValue(title);
                  runSearch(title);
                }}
              >
                <SearchIcon size={14} />
                <span className="sr-suggest-title">{highlightText(title, inputValue.trim())}</span>
                <small>{KIND_LABEL[kind]}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  let body: React.ReactNode;
  // 검색어가 없거나 입력창을 비우면 바로가기
  if (!trimmedQuery || !inputValue.trim()) {
    body = (
      <section className="sr-browse">
        <h2 className="sr-browse-title">둘러보기</h2>
        <div className="sr-browse-grid">
          {SHORTCUTS.map(({ to, label, desc, Icon }) => (
            <Link key={to} to={to} className="sr-browse-item">
              <span className="sr-browse-icon"><Icon size={20} /></span>
              <span className="sr-browse-text">
                <strong>{label}</strong>
                <small>{desc}</small>
              </span>
            </Link>
          ))}
        </div>
        <p className="sr-browse-tip">제목이나 날짜로 찾을 수 있어요. AI가 켜져 있으면 정확한 단어가 아니어도 비슷한 기록을 함께 찾아요.</p>
      </section>
    );
  } else if (!loaded) {
    body = failed
      ? <p className="mc-empty">검색할 기록을 불러오지 못했어요</p>
      : <div className="loading">불러오는 중</div>;
  } else if (mode === 'ai' && aiLoading && results.length === 0) {
    body = <div className="loading">비슷한 기억조각 모으는 중</div>;
  } else if (mode === 'ai' && aiError && results.length === 0) {
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
        {/* 검색어·모드·칩이 바뀔 때마다 새로 그려 카드가 차례로 올라오게 */}
        <div className="sr-grid" key={`${trimmedQuery}|${mode}|${filter}`}>
          {shown.map(({ kind, date, entry }, i) => {
            const meta = `${KIND_LABEL[kind]} · ${formatDotDate(date)}`;
            const card = entry.kind === 'video' ? (
              <VideoCard
                video={entry.video}
                moments={entry.moments}
                onOpen={openDetail}
                title={highlightText(entry.video.title, kw)}
                meta={meta}
              />
            ) : (
              <EntryCard
                entry={entry}
                onOpen={() => (entry.kind === 'moment' ? openMoment(entry.id) : openEntry(`${entry.kind}:${entry.id}`))}
                title={highlightText(entry.title, kw)}
                meta={meta}
                badge={false}
              />
            );
            return (
              <div key={`${entry.kind}:${entry.id}`} className="sr-cell" style={{ '--i': Math.min(i, 12) } as React.CSSProperties}>
                {card}
              </div>
            );
          })}
        </div>
        {mode === 'ai' && aiLoading && <div className="loading sr-ai-more">비슷한 기억조각 더 모으는 중</div>}
        {mode === 'ai' && aiError && <p className="sr-ai-note">AI 검색을 지금 쓸 수 없어 글자가 맞는 결과만 보여요</p>}
        {filter !== 'all' && (
          <Link to={KIND_TAB[filter].to} className="sr-tab-link">
            {KIND_TAB[filter].label}에서 전체 보기 ›
          </Link>
        )}
      </>
    );
  }

  return (
    <div className="sr">
      {searchSlot && createPortal(searchBar, searchSlot)}
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
