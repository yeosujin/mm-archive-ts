import type { Video } from '../../src/lib/database';
import { detectVideoPlatform } from '../../src/lib/platformUtils';

// 영상 플랫폼 한글 라벨
const PLATFORM_KO: Record<string, string> = {
  youtube: '유튜브',
  weverse: '위버스',
  instagram: '인스타그램',
  twitter: '트위터',
};

// 모먼트의 상위 영상 플랫폼 라벨(한글). 기타면 platform_name, 상위 영상 없으면 null.
export function momentPlatformLabel(parentVideo: Video | undefined): string | null {
  if (!parentVideo) return null;
  const platform = detectVideoPlatform(parentVideo.url);
  if (platform === 'other') {
    return parentVideo.platform_name?.trim() || null;
  }
  return PLATFORM_KO[platform] ?? null;
}
