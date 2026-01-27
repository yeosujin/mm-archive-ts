import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type { Episode, MemberSettings, Video, Moment, Post } from '../lib/database';
import { useData } from '../hooks/useData';
import PlatformIcon from '../components/PlatformIcon';
import { ArrowRightIcon } from '../components/Icons';

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
    });

  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisode(expandedEpisode === episodeId ? null : episodeId);
  };

  const getMemberName = (sender?: 'member1' | 'member2') => {
    if (sender === 'member2') return memberSettings.member2_name;
    return memberSettings.member1_name;
  };

  // 연결된 콘텐츠 정보 가져오기
  const getLinkedContentTitle = (episode: Episode) => {
    if (episode.linked_content_type === 'video' && episode.linked_content_id) {
      const video = videos.find(v => v.id === episode.linked_content_id);
      return video?.title || '영상';
    }
    if (episode.linked_content_type === 'moment' && episode.linked_content_id) {
      const moment = moments.find(m => m.id === episode.linked_content_id);
      return moment?.title || '모먼트';
    }
    if (episode.linked_content_type === 'post' && episode.linked_content_id) {
      const post = posts.find(p => p.id === episode.linked_content_id);
      return post?.title || post?.platform || '포스트';
    }
    return '콘텐츠';
  };

  const getContentTypeIcon = (type?: string) => {
    switch (type) {
      case 'video': return '📹';
      case 'moment': return '✨';
      case 'post': return '📱';
      default: return '📄';
    }
  };

  // 댓글의 연결 콘텐츠에서 플랫폼 가져오기
  const getCommentPlatform = (episode: Episode): 'twitter' | 'instagram' | 'weverse' | 'youtube' | 'other' | null => {
    if (!episode.linked_content_id) return null;

    if (episode.linked_content_type === 'video') {
      const video = videos.find(v => v.id === episode.linked_content_id);
      if (video?.url?.includes('youtube.com') || video?.url?.includes('youtu.be')) {
        return 'youtube';
      }
      return 'weverse'; // 위버스 영상
    }
    if (episode.linked_content_type === 'moment') {
      return 'twitter'; // 모먼트는 트윗 기반
    }
    if (episode.linked_content_type === 'post') {
      const post = posts.find(p => p.id === episode.linked_content_id);
      return post?.platform || 'other';
    }
    return null;
  };

  // 댓글 대상 멤버 이름 (sender의 반대)
  const getTargetMemberName = (sender?: 'member1' | 'member2') => {
    if (sender === 'member2') return memberSettings.member1_name;
    return memberSettings.member2_name;
  };

  // 연결된 콘텐츠로 이동하는 경로
  const getLinkedContentPath = (episode: Episode) => {
    if (!episode.linked_content_id) return null;
    switch (episode.linked_content_type) {
      case 'video': return `/videos?highlight=${episode.linked_content_id}`;
      case 'moment': return `/moments?highlight=${episode.linked_content_id}`;
      case 'post': return `/posts?highlight=${episode.linked_content_id}`;
      default: return null;
    }
  };

  // 시간 포맷: "14:30" → "오후 02:30"
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return time;
    const period = h < 12 ? '오전' : '오후';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${period} ${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

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
            const bubbleClass = episode.sender === 'member2' ? 'dm-bubble-right' : 'dm-bubble-left';

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
                    <span className="dm-member-name">{senderName}</span>
                  )}
                  <time className="dm-date">{episode.date}</time>
                  <span className="dm-preview">{getPreview()}</span>
                  <span className={`expand-arrow ${expandedEpisode === episode.id ? 'open' : ''}`}>
                    ▼
                  </span>
                </button>

                {expandedEpisode === episode.id && (
                  <div className="dm-messages">
                    {/* 리스닝파티 타입 */}
                    {isListeningParty && (
                      <div className="lp-content">
                        {episode.messages?.map((msg, idx) => (
                          <div key={`${msg.time || ''}-${msg.sender_name || ''}-${idx}`} className="lp-message">
                            <span className="lp-message-name">{msg.sender_name || '?'}</span>
                            {msg.time && (
                              <span className="lp-message-time">{formatTime(msg.time)}</span>
                            )}
                            <p className="lp-message-text">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 댓글 타입 */}
                    {isComment && (
                      <div className="comment-content">
                        {episode.linked_content_id && (
                          <div className="comment-context">
                            <span className="comment-context-icon">
                              {getContentTypeIcon(episode.linked_content_type)}
                            </span>
                            <span className="comment-context-text">
                              {getTargetMemberName(episode.sender)}의 "{getLinkedContentTitle(episode)}"
                            </span>
                            {getLinkedContentPath(episode) && (
                              <Link to={getLinkedContentPath(episode)!} className="comment-context-link">
                                <ArrowRightIcon size={14} />
                              </Link>
                            )}
                          </div>
                        )}
                        {(episode.messages && episode.messages.length > 0)
                          ? episode.messages.map((msg, idx) => (
                            <div key={`${msg.time || ''}-${msg.content.slice(0, 20)}-${idx}`} className="comment-bubble">
                              <div className="comment-bubble-header">
                                <span className="comment-bubble-name">{senderName}</span>
                                {msg.time && (
                                  <span className="comment-bubble-time">{formatTime(msg.time)}</span>
                                )}
                              </div>
                              <p className="comment-bubble-text">{msg.content}</p>
                            </div>
                          ))
                          : (
                            <div className="comment-bubble">
                              <div className="comment-bubble-header">
                                <span className="comment-bubble-name">{senderName}</span>
                              </div>
                              <p className="comment-bubble-text">{episode.comment_text}</p>
                            </div>
                          )
                        }
                      </div>
                    )}

                    {/* DM 타입 */}
                    {!isComment && !isListeningParty && episode.messages?.map((msg, idx) => {
                      const prevMsg = episode.messages?.[idx - 1];
                      const nextMsg = episode.messages?.[idx + 1];
                      
                      // 같은 시간이면 그룹
                      const isSameGroupAsPrev = prevMsg && prevMsg.time === msg.time;
                      const isSameGroupAsNext = nextMsg && nextMsg.time === msg.time;
                      
                      const isFirstInGroup = !isSameGroupAsPrev;
                      const isLastInGroup = !isSameGroupAsNext;
                      
                      return (
                        <div
                          key={`${msg.time || ''}-${msg.type}-${idx}`}
                          className="dm-row dm-row-left"
                        >
                          <div className="dm-bubble-row">
                            <div 
                              className={`dm-bubble ${bubbleClass} ${!isFirstInGroup ? 'dm-bubble-grouped' : ''} ${isLastInGroup ? 'dm-bubble-last' : ''}`}
                            >
                              {msg.type === 'text' && (
                                <p className="dm-text">{msg.content}</p>
                              )}
                              {msg.type === 'image' && (
                                <div className="dm-image">
                                  <img src={msg.content} alt="" />
                                </div>
                              )}
                            </div>
                            {isLastInGroup && msg.time && (
                              <span className="dm-time">{msg.time}</span>
                            )}
            </div>
          </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
