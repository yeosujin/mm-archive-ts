import { memo } from 'react';
import { Link } from 'react-router-dom';
import type { Moment, Video } from '../../lib/database/types';
import { classifyVideo, formatDotDate } from '../../lib/videoCatalog';
import { detectVideoPlatform, getPlatformName } from '../../lib/platformUtils';
import VideoCover from './VideoCover';

interface Props {
  video: Video;
  /** 이 영상의 모먼트 */
  moments: Moment[];
}

/** 출처 태그: 위버스는 `{아이콘} LIVE`, 외부 출연은 채널명(없으면 플랫폼 이름), 아일릿 채널은 없음 */
function sourceTag(video: Video): string | null {
  const category = classifyVideo(video);
  if (category === 'live') return `${video.icon ?? ''} LIVE`.trim();
  if (category === 'external') {
    return video.channel_name || video.platform_name || getPlatformName(detectVideoPlatform(video.url));
  }
  return null;
}

/** 월별 레일 카드. 모먼트가 있으면 상세로, 없으면 원본 새 탭 */
const VideoCard = memo(({ video, moments }: Props) => {
  const count = moments.length;
  const tag = sourceTag(video);
  const body = (
    <>
      <span className="mc-card-thumb">
        <VideoCover video={video} moments={moments} />
        {tag && <span className="mc-tag">{tag}</span>}
        <span className={`mc-badge${count ? '' : ' is-ext'}`}>{count ? `모먼트 ${count}` : '보러가기'}</span>
      </span>
      <span className="mc-card-title">{video.title}</span>
      <span className="mc-card-date">{formatDotDate(video.date).slice(5)}</span>
    </>
  );
  return count ? (
    <Link to={`/videos/${video.id}`} className="mc-card">{body}</Link>
  ) : (
    <a href={video.url} target="_blank" rel="noreferrer" className="mc-card">{body}</a>
  );
});

export default VideoCard;
