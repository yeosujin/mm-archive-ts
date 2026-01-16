import { useState, useEffect } from 'react';
import { getEpisodes } from '../lib/database';
import type { Episode } from '../lib/database';

export default function Episodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEpisodes();
  }, []);

  const loadEpisodes = async () => {
    try {
      const data = await getEpisodes();
      setEpisodes(data);
    } catch (error) {
      console.error('Error loading episodes:', error);
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
          {filteredEpisodes.map((episode) => (
            <div key={episode.id} className="dm-thread">
              <button 
                className="dm-thread-header"
                onClick={() => toggleEpisode(episode.id)}
              >
                <span className="dm-icon">💬</span>
                <time className="dm-date">{episode.date}</time>
                <span className="dm-preview">
                  {episode.messages[0]?.type === 'text' 
                    ? episode.messages[0].content 
                    : '📷 사진'}
                </span>
                <span className={`expand-arrow ${expandedEpisode === episode.id ? 'open' : ''}`}>
                  ▼
                </span>
              </button>

              {expandedEpisode === episode.id && (
                <div className="dm-messages">
                  {episode.messages.map((msg, idx) => (
                    <div key={idx} className="dm-message">
                      {msg.type === 'text' && (
                        <p className="dm-text">{msg.content}</p>
                      )}
                      {msg.type === 'image' && (
                        <div className="dm-image">
                          <img src={msg.content} alt="" />
                        </div>
                      )}
                      <span className="dm-time">{msg.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
