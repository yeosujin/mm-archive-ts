import type { Video } from '../lib/database';

interface Props {
  videos: Video[];
}

export default function VideoGrid({ videos }: Props) {
  return (
    <div className="video-grid">
      {videos.map((video) => (
        <article key={video.id} className="video-card">
          <div className="video-thumbnail">
            <img src={video.thumbnail} alt={video.title} loading="lazy" />
            <div className="video-overlay">
              <span className="play-icon">▶</span>
            </div>
          </div>
          <div className="video-info">
            <h3 className="video-title">{video.title}</h3>
            <time className="video-date">{video.date}</time>
            <div className="video-tags">
              {video.tags.map((tag) => (
                <span key={tag} className="tag">#{tag}</span>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
