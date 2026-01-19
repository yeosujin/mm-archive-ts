import { useState, useEffect } from 'react';
import { getEpisodes, getMemberSettings } from '../lib/database';
import type { Episode, MemberSettings } from '../lib/database';

export default function Episodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
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
      const [episodesData, settings] = await Promise.all([
        getEpisodes(),
        getMemberSettings()
      ]);
      setEpisodes(episodesData);
      setMemberSettings(settings);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 검색 필터링 (날짜, 메시지 내용)
  const filteredEpisodes = searchQuery
    ? episodes.filter(episode => 
        episode.date.includes(searchQuery) ||
        episode.messages.some(msg => 
          msg.type === 'text' && msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : episodes;

  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisode(expandedEpisode === episodeId ? null : episodeId);
  };

  const getMemberName = (sender?: 'member1' | 'member2') => {
    if (sender === 'member2') return memberSettings.member2_name;
    return memberSettings.member1_name;
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
        <p className="page-desc">뭐했냐면요 💬</p>
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
            const bubbleClass = episode.sender === 'member2' ? 'dm-bubble-right' : 'dm-bubble-left';
            
            return (
              <div key={episode.id} className="dm-thread">
                <button 
                  className="dm-thread-header"
                  onClick={() => toggleEpisode(episode.id)}
                >
                  <span className="dm-member-name">{senderName}</span>
                  <time className="dm-date">{episode.date}</time>
                  <span className="dm-preview">
                    {episode.title || (episode.messages[0]?.type === 'text' 
                      ? episode.messages[0].content 
                      : '📷 사진')}
                  </span>
                  <span className={`expand-arrow ${expandedEpisode === episode.id ? 'open' : ''}`}>
                    ▼
                  </span>
                </button>

                {expandedEpisode === episode.id && (
                  <div className="dm-messages">
                    {episode.messages.map((msg, idx) => {
                      const prevMsg = episode.messages[idx - 1];
                      const nextMsg = episode.messages[idx + 1];
                      
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
