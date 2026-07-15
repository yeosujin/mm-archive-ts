import type { Video } from '../../src/lib/database';
import { detectVideoPlatform, getPlatformName } from '../../src/lib/platformUtils';

// 모먼트의 상위 영상 플랫폼 라벨. 기타면 platform_name, 상위 영상 없으면 null.
export function momentPlatformLabel(parentVideo: Video | undefined): string | null {
  if (!parentVideo) return null;
  const platform = detectVideoPlatform(parentVideo.url);
  if (platform === 'other') {
    return parentVideo.platform_name?.trim() || null;
  }
  return getPlatformName(platform);
}
