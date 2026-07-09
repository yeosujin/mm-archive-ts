export interface Video {
  id: string;
  title: string;
  url: string;
  date: string;
  icon?: string;
  icon_text?: string;
  thumbnail_url?: string;
  channel_name?: string;
  platform_name?: string;
}

export interface Moment {
  id: string;
  title: string;
  tweet_url: string;
  date: string;
  video_id?: string;
  position?: number;
  thumbnail_url?: string;
}

export interface PostMedia {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  thumb_hash?: string;
}

export interface Post {
  id: string;
  title: string;
  url: string;
  platform: 'twitter' | 'instagram' | 'weverse' | 'other';
  date: string;
  writer?: string;
  content?: string;
  media?: PostMedia[];
}

export interface Episode {
  id: string;
  title?: string;
  date: string;
  episode_type: 'dm' | 'comment' | 'listening_party';
  sender?: 'member1' | 'member2';
  platform?: 'weverse' | 'melon' | 'spotify' | 'apple_music';
  messages?: {
    type: 'text' | 'image';
    content: string;
    time: string;
    sender_name?: string;
  }[];
  linked_content_type?: 'video' | 'moment' | 'post';
  linked_content_id?: string;
  comment_text?: string;
}

export interface MemberSettings {
  member1_name: string;
  member2_name: string;
  articles_visible?: boolean;
}

export interface Article {
  id: string;
  title: string;
  author: string;
  tags: string[];
  url: string;
  date: string;
}

export interface Ask {
  id: string;
  content: string;
  image_url?: string;
  answer?: string;
  status: 'pending' | 'answered';
  created_at: string;
  answered_at?: string;
}

export interface FeaturedContent {
  type: 'video' | 'post' | 'moment' | 'episode' | null;
  content_id: string | null;
}

export interface Photo {
  id: string;
  title: string;
  date: string;
  tags: string[];
  image_url: string;
  thumbnail_url?: string;
  thumb_hash?: string;
}

export interface Activity {
  id: string;
  name: string;
  created_at?: string;
}
