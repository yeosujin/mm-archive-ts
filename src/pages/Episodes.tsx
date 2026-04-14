import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Episode, MemberSettings, Video, Moment, Post } from '../lib/database';
import { useData } from '../hooks/useData';
import PlatformIcon from '../components/PlatformIcon';
import EpisodeContentBody from '../components/EpisodeContentBody';
import {
  getMemberName as getMemberNameHelper,
  getLinkedContentTitle as getLinkedContentTitleHelper,
  getCommentPlatform as getCommentPlatformHelper,
} from '../lib/episodeHelpers';

export default function Episodes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const tabParam = searchParams.get('tab') as 'dm' | 'comment' | 'listening_party' | null;
  const {
    episodes: cachedEpisodes,
    memberSettings: cachedSettings,
    videos: cachedVideos,
    moments: cachedMoments,
    posts: cachedPosts,
    fetchEpisodes,
    fetchMemberSettings,
    fetchVideos,
    fetchMoments,
    fetchPosts
  } = useData();

  const [episodes, setEpisodes] = useState<Episode[]>(cachedEpisodes || []);
  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);
  const [moments, setMoments] = useState<Moment[]>(cachedMoments || []);
  const [posts, setPosts] = useState<Post[]>(cachedPosts || []);
  const [memberSettings, setMemberSettings] = useState<MemberSettings>(cachedSettings || {
    member1_name: '멤버1',
    member2_name: '멤버2',
  });
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const activeTab = tabParam && ['dm', 'comment', 'listening_party'].includes(tabParam) ? tabParam : 'dm';
  const [loading, setLoading] = useState(!cachedEpisodes || !cachedSettings);

  const setActiveTab = (tab: 'dm' | 'comment' | 'listening_party') => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('tab', tab);
      return newParams;
    });
  };

  const loadData = useCallback(async () => {
    try {
      const [episodesData, settings, videosData, momentsData, postsData] = await Promise.all([
        fetchEpisodes(),
        fetchMemberSettings(),
        fetchVideos(),
        fetchMoments(),
        fetchPosts()
      ]);
      setEpisodes(episodesData);
      setMemberSettings(settings);
      setVideos(videosData);
      setMoments(momentsData);
      setPosts(postsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchEpisodes, fetchMemberSettings, fetchVideos, fetchMoments, fetchPosts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // highlight 파라미터 처리: 해당 에피소드 자동 확장 + 스크롤
  useEffect(() => {
    if (!highlightId || loading || episodes.length === 0) return;
    setExpandedEpisode(highlightId);
    setTimeout(() => {
      document.querySelector(`[data-episode-id="${highlightId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [highlightId, loading, episodes.length]);

  // Sync with cache
  useEffect(() => { if (cachedEpisodes) setEpisodes(cachedEpisodes); }, [cachedEpisodes]);
  useEffect(() => { if (cachedSettings) setMemberSettings(cachedSettings); }, [cachedSettings]);
  useEffect(() => { if (cachedVideos) setVideos(cachedVideos); }, [cachedVideos]);
  useEffect(() => { if (cachedMoments) setMoments(cachedMoments); }, [cachedMoments]);
  useEffect(() => { if (cachedPosts) setPosts(cachedPosts); }, [cachedPosts]);

  // 이미지 프리로딩
  useEffect(() => {
    if (!episodes.length) return;
    const imageUrls = episodes
      .flatMap(ep => ep.messages?.filter(m => m.type === 'image').map(m => m.content) || []);
    imageUrls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, [episodes]);

  // 탭 + 검색 필터링
  const filteredEpisodes = episodes
    .filter(episode => episode.episode_type === activeTab)
    .filter(episode => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return episode.date.includes(searchQuery) ||
        (episode.messages?.some(msg =>
          msg.content.toLowerCase().includes(q) ||
          msg.sender_name?.toLowerCase().includes(q)
        )) ||
        (episode.comment_text?.toLowerCase().includes(q));
    })
    .sort((a, b) =>
      sortOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );

  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisode(expandedEpisode === episodeId ? null : episodeId);
  };

  const getMemberName = (sender?: 'member1' | 'member2') => getMemberNameHelper(sender, memberSettings);
  const getLinkedContentTitle = (episode: Episode) => getLinkedContentTitleHelper(episode, videos, moments, posts);
  const getCommentPlatform = (episode: Episode) => getCommentPlatformHelper(episode, videos, posts);

  if (loading) {
    return (
      <div className="page episodes-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page episodes-page">
      <div className="page-header">
        <h1>에피소드</h1>
        <p className="page-desc">💬</p>
        <div className="episode-tabs">
          <button
            className={`episode-tab ${activeTab === 'dm' ? 'active' : ''}`}
            onClick={() => setActiveTab('dm')}
          >
            <PlatformIcon platform="weverse" size={16} />
            <span>DM</span>
          </button>
          <button
            className={`episode-tab ${activeTab === 'comment' ? 'active' : ''}`}
            onClick={() => setActiveTab('comment')}
          >댓글</button>
          <button
            className={`episode-tab ${activeTab === 'listening_party' ? 'active' : ''}`}
            onClick={() => setActiveTab('listening_party')}
          >리스닝파티</button>
        </div>
        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="날짜 또는 내용으로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sort-toggle-wrapper">
            <button
              type="button"
              className="sort-toggle"
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            >
              <span className="sort-icon">{sortOrder === 'newest' ? '▼' : '▲'}</span>
              {sortOrder === 'newest' ? '최신순' : '오래된순'}
            </button>
          </div>
        </div>
      </div>

      {filteredEpisodes.length === 0 ? (
        <div className="empty-state">
          <p>{searchQuery ? '검색 결과가 없어요 😢' : '아직 에피소드가 없어요 😢'}</p>
        </div>
      ) : (
        <div className="dm-timeline">
          {filteredEpisodes.map((episode) => {
            const senderName = getMemberName(episode.sender);
            const isComment = episode.episode_type === 'comment';
            const isListeningParty = episode.episode_type === 'listening_party';

            const getPreview = () => {
              if (isListeningParty) {
                return episode.title || episode.messages?.[0]?.content || '리스닝파티';
              }
              if (isComment) {
                return episode.linked_content_id
                  ? `"${getLinkedContentTitle(episode)}" 댓글`
                  : episode.comment_text;
              }
              return episode.title || (episode.messages?.[0]?.type === 'text'
                ? episode.messages[0].content
                : '📷 사진');
            };

            return (
              <div key={episode.id} className={`dm-thread ${isComment ? 'comment-thread' : ''} ${isListeningParty ? 'lp-thread' : ''}`} data-episode-id={episode.id}>
                <button
                  className="dm-thread-header"
                  onClick={() => toggleEpisode(episode.id)}
                >
                  {(isListeningParty || isComment) && (
                    <span className="dm-type-badge">
                      {isListeningParty ? (
                        episode.platform ? (
                          <PlatformIcon platform={episode.platform} size={16} />
                        ) : '🎧'
                      ) : (
                        getCommentPlatform(episode) ? (
                          <PlatformIcon platform={getCommentPlatform(episode)!} size={16} />
                        ) : '💬'
                      )}
                    </span>
                  )}
                  {!isListeningParty && (
                    <span className={`dm-member-name dm-member-name-${episode.sender || 'member1'}`}>{senderName}</span>
                  )}
                  <time className="dm-date">{episode.date}</time>
                  <span className="dm-preview">{getPreview()}</span>
                  <span className={`expand-arrow ${expandedEpisode === episode.id ? 'open' : ''}`}>
                    ▼
                  </span>
                </button>

                {expandedEpisode === episode.id && (
                  <EpisodeContentBody
                    episode={episode}
                    videos={videos}
                    moments={moments}
                    posts={posts}
                    memberSettings={memberSettings}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
