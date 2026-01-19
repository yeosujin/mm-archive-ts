export function getPlatformName(platform: string): string {
  switch (platform) {
    case 'youtube': return 'YouTube';
    case 'twitter': return 'X';
    case 'instagram': return 'Instagram';
    case 'weverse': return 'Weverse';
    default: return '링크';
  }
}

export function detectVideoPlatform(url: string): 'youtube' | 'twitter' | 'weverse' | 'other' {
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
  
  return 'other';
}
