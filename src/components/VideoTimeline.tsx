import type { Video } from '../data/mockData';

interface Props {
  videos: Video[];
}

// 날짜별로 그룹화
function groupByDate(videos: Video[]) {
  const groups: Record<string, Video[]> = {};
  
  videos.forEach((video) => {
    const date = video.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(video);
  });

  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

export default function VideoTimeline({ videos }: Props) {
  const groupedVideos = groupByDate(videos);

  return (
    <div className="video-timeline">
      {groupedVideos.map(([date, dateVideos]) => (
        <div key={date} className="timeline-group">
          <div className="timeline-date">
            <span className="date-marker"></span>
            <time>{date}</time>
          </div>
          <div className="timeline-items">
            {dateVideos.map((video) => (
              <article key={video.id} className="timeline-card">
                <div className="timeline-thumbnail">
                  <img src={video.thumbnail} alt={video.title} loading="lazy" />
                  <div className="video-overlay">
                    <span className="play-icon">▶</span>
                  </div>
                </div>
                <div className="timeline-info">
                  <h3 className="video-title">{video.title}</h3>
                  <div className="video-tags">
                    {video.tags.map((tag) => (
                      <span key={tag} className="tag">#{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
