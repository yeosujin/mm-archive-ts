import type { Moment, Video } from '../../lib/database/types';
import { getVideoCover } from '../../lib/videoCover';
import { detectVideoPlatform } from '../../lib/platformUtils';

interface Props {
  video: Pick<Video, 'url' | 'thumbnail_url'>;
  /** 이 영상의 모먼트 */
  moments: Moment[];
  className?: string;
  /** 첫 화면에 바로 보이는 표지(히어로·상세)는 지연 로딩하지 않는다 */
  eager?: boolean;
}

/** 영상 표지. 이미지가 없으면 플랫폼 색 블록 */
export default function VideoCover({ video, moments, className = '', eager = false }: Props) {
  const src = getVideoCover(video, moments);
  if (!src) {
    return <span className={`vcover vcover-${detectVideoPlatform(video.url)} ${className}`} aria-hidden />;
  }
  return (
    <img
      className={`vcover ${className}`}
      src={src}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
