import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getArticlesVisibility } from '../lib/database';
import type { Video, Moment, Post, Episode, Article } from '../lib/database';
import VideoEmbed from '../components/VideoEmbed';
import { ArrowRightIcon, VideoIcon, PostIcon, ChatIcon, BookIcon } from '../components/Icons';
import { useData } from '../hooks/useData';
import { semanticSearch, type SemanticHit } from '../lib/semanticSearch';

type FilterType = 'all' | 'video' | 'moment' | 'post' | 'episode' | 'article';
type SearchMode = 'keyword' | 'ai';

export default function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const mode: SearchMode = searchParams.get('mode') === 'ai' ? 'ai' : 'keyword';

  const {
    videos: cachedVideos,
    moments: cachedMoments,
    posts: cachedPosts,
    episodes: cachedEpisodes,
    articles: cachedArticles,
    fetchVideos,
    fetchMoments,
    fetchPosts,
    fetchEpisodes,
    fetchArticles,
  } = useData();

  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);
  const [moments, setMoments] = useState<Moment[]>(cachedMoments || []);
  const [posts, setPosts] = useState<Post[]>(cachedPosts || []);
  const [episodes, setEpisodes] = useState<Episode[]>(cachedEpisodes || []);
  const [articles, setArticles] = useState<Article[]>(cachedArticles || []);
  const [articlesVisible, setArticlesVisible] = useState(false);
  const [loading, setLoading] = useState(
    !(cachedVideos && cachedMoments && cachedPosts && cachedEpisodes)
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [inputValue, setInputValue] = useState(query);
  const [aiHits, setAiHits] = useState<SemanticHit[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);

  // URL q → 입력창 동기화 (뒤로가기/홈 재진입 등)
  useEffect(() => {
    setInputValue(query);
    setActiveFilter('all');
  }, [query]);

  const loadAllData = useCallback(async () => {
    try {
      const articlesVisibleData = await getArticlesVisibility();
      setArticlesVisible(articlesVisibleData);

      const [videosData, momentsData, postsData, episodesData, articlesData] = await Promise.all([
        fetchVideos(),
        fetchMoments(),
        fetchPosts(),
        fetchEpisodes(),
        articlesVisibleData ? fetchArticles() : Promise.resolve([]),
      ]);
      setVideos(videosData);
      setMoments(momentsData);
      setPosts(postsData);
      setEpisodes(episodesData);
      setArticles(articlesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchArticles]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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
  useEffect(() => {
    if (mode !== 'ai' || !trimmedQuery) {
      setAiHits([]);
      setAiError(false);
      return;
    }
    let cancelled = false;
    setAiLoading(true);
    setAiError(false);
    semanticSearch(trimmedQuery, 30)
      .then((hits) => {
        if (!cancelled) setAiHits(hits);
      })
      .catch((e) => {
        console.error('AI search failed:', e);
        if (!cancelled) {
          setAiHits([]);
          setAiError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setAiLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trimmedQuery, mode]);

  // 키워드(글자 일치) 결과
  const matchedVideos = trimmedQuery
    ? videos.filter(v => v.title.toLowerCase().includes(searchLower) || v.date.includes(trimmedQuery))
    : [];
  const matchedMoments = trimmedQuery
    ? moments.filter(m => m.title.toLowerCase().includes(searchLower) || m.date.includes(trimmedQuery))
    : [];
  const matchedPosts = trimmedQuery
    ? posts.filter(p => p.title.toLowerCase().includes(searchLower) || p.date.includes(trimmedQuery))
    : [];
  const matchedEpisodes = trimmedQuery
    ? episodes.filter(e => e.title?.toLowerCase().includes(searchLower) || e.date.includes(trimmedQuery))
    : [];
  const matchedArticles = trimmedQuery && articlesVisible
    ? articles.filter(a =>
        a.title.toLowerCase().includes(searchLower) ||
        a.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        a.date.includes(trimmedQuery)
      )
    : [];

  // 유사도 점수가 압축돼 있어(대부분 0.65~0.72) 고정 임계값은 부적합.
  // "절대 바닥값(무관한 노이즈 제거) + 최고점 대비 상대 컷(뚜렷한 결과만 강조)" 조합.
  const AI_SIM_FLOOR = 0.64;   // 이보다 낮으면 사실상 무관 → 제거 (교차언어 매칭은 같은 언어보다 유사도가 낮게 나와 값을 낮춤)
  const AI_SIM_MARGIN = 0.05;  // 최고점보다 이만큼 이상 낮으면 제거
  const topSim = aiHits.length ? aiHits[0].similarity : 0;
  const aiCutoff = Math.max(AI_SIM_FLOOR, topSim - AI_SIM_MARGIN);
  const strongHits = mode === 'ai' ? aiHits.filter(h => h.similarity >= aiCutoff) : [];

  // AI(시멘틱) 결과: 유사도 순 hits를 캐시 데이터에 매핑 (못 찾으면 제외)
  const aiVideos = strongHits.filter(h => h.content_type === 'video')
    .map(h => videos.find(v => v.id === h.content_id))
    .filter((v): v is Video => !!v);
  const aiMoments = strongHits.filter(h => h.content_type === 'moment')
    .map(h => moments.find(m => m.id === h.content_id))
    .filter((m): m is Moment => !!m);
  const aiPosts = strongHits.filter(h => h.content_type === 'post')
    .map(h => posts.find(p => p.id === h.content_id))
    .filter((p): p is Post => !!p);
  const aiEpisodes = strongHits.filter(h => h.content_type === 'episode')
    .map(h => episodes.find(e => e.id === h.content_id))
    .filter((e): e is Episode => !!e);
  const aiArticles = articlesVisible
    ? strongHits.filter(h => h.content_type === 'article')
        .map(h => articles.find(a => a.id === h.content_id))
        .filter((a): a is Article => !!a)
    : [];

  // 현재 모드에 따라 렌더할 결과
  const rVideos = mode === 'ai' ? aiVideos : matchedVideos;
  const rMoments = mode === 'ai' ? aiMoments : matchedMoments;
  const rPosts = mode === 'ai' ? aiPosts : matchedPosts;
  const rEpisodes = mode === 'ai' ? aiEpisodes : matchedEpisodes;
  const rArticles = mode === 'ai' ? aiArticles : matchedArticles;
  const totalResults =
    rVideos.length + rMoments.length + rPosts.length + rEpisodes.length + rArticles.length;

  const searchBox = (
    <form className="page-controls" onSubmit={handleSubmit}>
      <div className={`search-box ${mode === 'ai' ? 'ai-mode' : ''}`}>
        <span className="search-box-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder={mode === 'ai' ? 'AI로 검색해요' : '검색어를 입력하세요'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          className={`search-ai-switch ${mode === 'ai' ? 'on' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setMode(mode === 'ai' ? 'keyword' : 'ai')}
          aria-pressed={mode === 'ai'}
          title={mode === 'ai' ? 'AI 검색 켜짐 (끄려면 클릭)' : 'AI 검색으로 전환'}
        >
          ✨ AI
        </button>
      </div>
    </form>
  );

  if (loading) {
    return (
      <div className="page search-page">
        <div className="page-header">
          <h1>검색 결과</h1>
          {searchBox}
        </div>
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page search-page">
      <div className="page-header">
        <h1>검색 결과</h1>
        {searchBox}
      </div>

      {!trimmedQuery ? (
        <div className="empty-state">
          <p>검색어를 입력해주세요 {mode === 'ai' ? '✨' : '🔍'}</p>
        </div>
      ) : mode === 'ai' && aiLoading ? (
        <div className="loading">비슷한 기억조각 모으는 중...</div>
      ) : mode === 'ai' && aiError ? (
        <div className="empty-state">
          <p>AI 검색을 지금 사용할 수 없어요 😢</p>
          <p>잠시 후 다시 시도해주세요</p>
        </div>
      ) : totalResults === 0 ? (
        <div className="empty-state">
          <p>검색 결과가 없어요 😢</p>
          <p>{mode === 'ai' ? '다른 표현으로 검색해보세요' : '다른 키워드로 검색해보세요'}</p>
        </div>
      ) : (
        <div className="search-results">
          <p className="page-desc search-count">
            "{trimmedQuery}" {mode === 'ai' ? 'AI 검색' : '검색'} 결과 {totalResults}건
          </p>
          {/* 필터 탭 */}
          <div className="search-filter-tabs">
            <button
              className={`search-filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              전체 ({totalResults})
            </button>
            {rVideos.length > 0 && (
              <button
                className={`search-filter-tab ${activeFilter === 'video' ? 'active' : ''}`}
                onClick={() => setActiveFilter('video')}
              >
                <VideoIcon size={14} /> 영상 ({rVideos.length})
              </button>
            )}
            {rMoments.length > 0 && (
              <button
                className={`search-filter-tab ${activeFilter === 'moment' ? 'active' : ''}`}
                onClick={() => setActiveFilter('moment')}
              >
                <VideoIcon size={14} /> 모먼트 ({rMoments.length})
              </button>
            )}
            {rPosts.length > 0 && (
              <button
                className={`search-filter-tab ${activeFilter === 'post' ? 'active' : ''}`}
                onClick={() => setActiveFilter('post')}
              >
                <PostIcon size={14} /> 포스트 ({rPosts.length})
              </button>
            )}
            {rEpisodes.length > 0 && (
              <button
                className={`search-filter-tab ${activeFilter === 'episode' ? 'active' : ''}`}
                onClick={() => setActiveFilter('episode')}
              >
                <ChatIcon size={14} /> 에피소드 ({rEpisodes.length})
              </button>
            )}
            {rArticles.length > 0 && (
              <button
                className={`search-filter-tab ${activeFilter === 'article' ? 'active' : ''}`}
                onClick={() => setActiveFilter('article')}
              >
                <BookIcon size={14} /> 글 ({rArticles.length})
              </button>
            )}
          </div>
          {/* 영상 결과 */}
          {rVideos.length > 0 && (activeFilter === 'all' || activeFilter === 'video') && (
            <div className="search-section">
              <h2><VideoIcon size={18} /> 영상 ({rVideos.length})</h2>
              <div className="search-list">
                {rVideos.map(video => (
                  <Link to={`/videos?highlight=${video.id}`} key={video.id} className="search-item">
                    <span className="search-item-title">{video.title}</span>
                    <span className="search-item-date">{video.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 모먼트 결과 */}
          {rMoments.length > 0 && (activeFilter === 'all' || activeFilter === 'moment') && (
            <div className="search-section">
              <h2><VideoIcon size={18} /> 모먼트 ({rMoments.length})</h2>
              <div className="search-moments-grid">
                {rMoments.map(moment => (
                  <div key={moment.id} className="moment-card">
                    <div className="moment-card-header">
                      <h4 className="moment-card-title">{moment.title}</h4>
                      {moment.video_id && (
                        <Link to={`/videos?highlight=${moment.video_id}`} className="moment-card-link">
                          영상 보러가기 <ArrowRightIcon size={14} />
                        </Link>
                      )}
                    </div>
                    <VideoEmbed
                      url={moment.tweet_url}
                      title={moment.title}
                      thumbnailUrl={moment.thumbnail_url}
                      priority
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 포스트 결과 */}
          {rPosts.length > 0 && (activeFilter === 'all' || activeFilter === 'post') && (
            <div className="search-section">
              <h2><PostIcon size={18} /> 포스트 ({rPosts.length})</h2>
              <div className="search-list">
                {rPosts.map(post => (
                  <Link to={`/posts?highlight=${post.id}`} key={post.id} className="search-item">
                    <span className="search-item-title">{post.title || post.platform}</span>
                    <span className="search-item-date">{post.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 에피소드 결과 */}
          {rEpisodes.length > 0 && (activeFilter === 'all' || activeFilter === 'episode') && (
            <div className="search-section">
              <h2><ChatIcon size={18} /> 에피소드 ({rEpisodes.length})</h2>
              <div className="search-list">
                {rEpisodes.map(episode => (
                  <Link to={`/episodes?highlight=${episode.id}`} key={episode.id} className="search-item">
                    <span className="search-item-title">{episode.title || episode.date}</span>
                    <span className="search-item-date">{episode.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 글 결과 - articlesVisible이 true일 때만 표시 */}
          {rArticles.length > 0 && (activeFilter === 'all' || activeFilter === 'article') && (
            <div className="search-section">
              <h2><BookIcon size={18} /> 글 ({rArticles.length})</h2>
              <div className="search-list">
                {rArticles.map(article => (
                  <Link to={`/articles?highlight=${article.id}`} key={article.id} className="search-item">
                    <span className="search-item-title">{article.title}</span>
                    <span className="search-item-date">{article.date}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
