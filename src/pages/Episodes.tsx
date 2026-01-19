import { useState, useEffect } from 'react';
import { getEpisodes, getMemberSettings, getVideos, getMoments, getPosts } from '../lib/database';
import type { Episode, MemberSettings, Video, Moment, Post } from '../lib/database';

export default function Episodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [memberSettings, setMemberSettings] = useState<MemberSettings>({
    member1_name: '멤버1',
    member2_name: '멤버2',
  });
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [episodesData, settings, videosData, momentsData, postsData] = await Promise.all([
        getEpisodes(),
        getMemberSettings(),
        getVideos(),
        getMoments(),
        getPosts()
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
  };

  // 검색 필터링 (날짜, 메시지 내용, 댓글 내용)
  const filteredEpisodes = searchQuery
    ? episodes.filter(episode => 
        episode.date.includes(searchQuery) ||
        (episode.messages?.some(msg => 
          msg.type === 'text' && msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        )) ||
        (episode.comment_text?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : episodes;

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

  const getContentTypeName = (type?: string) => {
    switch (type) {
      case 'video': return '영상';
      case 'moment': return '모먼트';
      case 'post': return '포스트';
      default: return '콘텐츠';
    }
  };

  const getContentTypeIcon = (type?: string) => {
    switch (type) {
      case 'video': return '📹';
      case 'moment': return '✨';
      case 'post': return '📱';
      default: return '📄';
    }
  };

  // 댓글 대상 멤버 이름 (sender의 반대)
  const getTargetMemberName = (sender?: 'member1' | 'member2') => {
    if (sender === 'member2') return memberSettings.member1_name;
    return memberSettings.member2_name;
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
        <p className="page-desc">케미 모먼트 💬</p>
        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="날짜 또는 내용으로 검색... (예: 2025-01-01)"
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
            const bubbleClass = episode.sender === 'member2' ? 'dm-bubble-right' : 'dm-bubble-left';
            
            return (
              <div key={episode.id} className={`dm-thread ${isComment ? 'comment-thread' : ''}`}>
                <button 
                  className="dm-thread-header"
                  onClick={() => toggleEpisode(episode.id)}
                >
                  <span className="dm-type-badge">
                    {isComment ? '💬' : '📱'}
                  </span>
                  <span className="dm-member-name">{senderName}</span>
                  <time className="dm-date">{episode.date}</time>
                  <span className="dm-preview">
                    {isComment 
                      ? (episode.linked_content_id 
                          ? `${getTargetMemberName(episode.sender)}의 ${getContentTypeName(episode.linked_content_type)}에 댓글`
                          : episode.comment_text)
                      : (episode.title || (episode.messages?.[0]?.type === 'text' 
                          ? episode.messages[0].content 
                          : '📷 사진'))
                    }
                  </span>
                  <span className={`expand-arrow ${expandedEpisode === episode.id ? 'open' : ''}`}>
                    ▼
                  </span>
                </button>

                {expandedEpisode === episode.id && (
                  <div className="dm-messages">
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
                          </div>
                        )}
                        <div className={`dm-row ${episode.sender === 'member2' ? 'dm-row-right' : 'dm-row-left'}`}>
                          <div className="dm-bubble-row">
                            <div className={`dm-bubble ${bubbleClass} dm-bubble-last`}>
                              <p className="dm-text">{episode.comment_text}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DM 타입 */}
                    {!isComment && episode.messages?.map((msg, idx) => {
                      const prevMsg = episode.messages?.[idx - 1];
                      const nextMsg = episode.messages?.[idx + 1];
                      
                      // 같은 시간이면 그룹
                      const isSameGroupAsPrev = prevMsg && prevMsg.time === msg.time;
                      const isSameGroupAsNext = nextMsg && nextMsg.time === msg.time;
                      
                      const isFirstInGroup = !isSameGroupAsPrev;
                      const isLastInGroup = !isSameGroupAsNext;
                      
                      return (
                        <div 
                          key={idx} 
                          className={`dm-row ${episode.sender === 'member2' ? 'dm-row-right' : 'dm-row-left'}`}
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
