import { useState } from 'react';
import { episodes } from '../data/mockData';

export default function Episodes() {
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null);

  const toggleEpisode = (episodeId: string) => {
    setExpandedEpisode(expandedEpisode === episodeId ? null : episodeId);
  };

  // 날짜 내림차순 정렬
  const sortedEpisodes = [...episodes].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="page episodes-page">
      <div className="page-header">
        <h1>에피소드</h1>
        <p className="page-desc">오늘 ㅇㅇ이랑 뭐했냐면요 💬</p>
      </div>

      {sortedEpisodes.length === 0 ? (
        <div className="empty-state">
          <p>아직 에피소드가 없어요 😢</p>
        </div>
      ) : (
        <div className="dm-timeline">
          {sortedEpisodes.map((episode) => (
            <div key={episode.id} className="dm-thread">
              <div 
                className="dm-thread-header"
                onClick={() => toggleEpisode(episode.id)}
                onKeyDown={(e) => e.key === 'Enter' && toggleEpisode(episode.id)}
                role="button"
                tabIndex={0}
              >
                <span className="dm-icon">💬</span>
                <time className="dm-date">{episode.date}</time>
                <span className="dm-preview">
                  {episode.messages[0]?.text || '📷 사진'}
                </span>
                <span className={`expand-arrow ${expandedEpisode === episode.id ? 'open' : ''}`}>
                  ▼
                </span>
              </div>

              {expandedEpisode === episode.id && (
                <div className="dm-messages">
                  {episode.messages.map((msg) => (
                    <div key={msg.id} className="dm-message">
                      {msg.text && (
                        <p className="dm-text">{msg.text}</p>
                      )}
                      {msg.imageUrl && (
                        <div className="dm-image">
                          <img src={msg.imageUrl} alt="" />
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
