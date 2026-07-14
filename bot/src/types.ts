// 앱(src/lib/database/types.ts)에서 봇이 쓰는 타입만 가져와 재정의.
// 봇은 별도 패키지라 앱 소스에 의존하지 않도록 최소 형태로 복제한다.

export interface Video {
  id: string;
  title: string;
  url: string;
  date: string;
  channel_name?: string;
  platform_name?: string;
  thumbnail_url?: string;
}

export interface Moment {
  id: string;
  title: string;
  tweet_url: string; // 실제로는 R2 영상 파일 URL 또는 외부 링크
  date: string;
  video_id?: string;
  position?: number;
  thumbnail_url?: string;
}

export interface PostMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

export interface Post {
  id: string;
  title: string;
  url: string;
  platform: 'twitter' | 'instagram' | 'weverse' | 'other';
  date: string;
  media?: PostMedia[];
}

export interface Photo {
  id: string;
  title: string;
  date: string;
  tags: string[];
  image_url: string;
}

// ── 게시 계획(순수 데이터) ────────────────────────────────────
export type MediaKind = 'image' | 'video';

export interface PlannedMedia {
  url: string;
  kind: MediaKind;
}

export interface PlannedTweet {
  text: string;
  media: PlannedMedia[];
}

// 하나의 독립 스레드 (root + replies)
export interface PlannedThread {
  label: string; // 로그용 (예: "moment:위버스", "photos", "post:제목")
  tweets: PlannedTweet[];
}
