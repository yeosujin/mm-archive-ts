export function getPlatformName(platform: string): string {
  switch (platform) {
    case 'youtube': return 'YouTube';
    case 'twitter': return 'X';
    case 'instagram': return 'Instagram';
    case 'weverse': return 'Weverse';
    default: return '링크';
  }
}

export function detectVideoPlatform(url: string): 'youtube' | 'twitter' | 'instagram' | 'weverse' | 'other' {
  if (!url) return 'other';

  const lowerUrl = url.toLowerCase();

  // YouTube (일반 영상, Shorts 포함)
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return 'youtube';
  }

  // Weverse (weverse.io, weverseweb 등)
  if (lowerUrl.includes('weverse')) {
    return 'weverse';
  }

  // X/Twitter
  if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) {
    return 'twitter';
  }

  // Instagram
  if (lowerUrl.includes('instagram.com')) {
    return 'instagram';
  }

  return 'other';
}

// URL에서 기타 플랫폼명 자동 감지
const PLATFORM_NAME_MAP: [string, string][] = [
  ['tiktok.com', 'TikTok'],
  ['weibo.com', 'Weibo'],
  ['weibo.cn', 'Weibo'],
  ['bilibili.com', 'Bilibili'],
  ['v.qq.com', '腾讯视频'],
  ['nicovideo.jp', 'niconico'],
  ['dailymotion.com', 'Dailymotion'],
];

export function detectPlatformName(url: string): string {
  if (!url) return '';
  const lowerUrl = url.toLowerCase();
  for (const [domain, name] of PLATFORM_NAME_MAP) {
    if (lowerUrl.includes(domain)) return name;
  }
  return '';
}

// URL에서 플랫폼 자동 감지
export function detectPlatform(url: string): 'twitter' | 'instagram' | 'weverse' | 'other' {
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  }
  if (url.includes('instagram.com')) {
    return 'instagram';
  }
  if (url.includes('weverse.io')) {
    return 'weverse';
  }
  return 'other';
}
