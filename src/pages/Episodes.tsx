import { useState, useEffect } from 'react';
import { getEpisodes } from '../lib/database';
import type { Episode } from '../lib/database';

export default function Episodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);
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
        <p className="page-desc">오늘 ㅇㅇ이랑 뭐했냐면요 💬</p>
      </div>

      {episodes.length === 0 ? (
        <div className="empty-state">
          <p>아직 에피소드가 없어요 😢</p>
        </div>
      ) : (
        <div className="dm-timeline">
          {episodes.map((episode) => (
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
