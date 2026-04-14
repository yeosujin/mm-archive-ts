import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { Episode, MemberSettings, Video, Moment, Post } from './database';
import { VideoIcon, PostIcon } from '../components/Icons';

export function getMemberName(sender: 'member1' | 'member2' | undefined, memberSettings: MemberSettings): string {
  if (sender === 'member2') return memberSettings.member2_name;
  return memberSettings.member1_name;
}

export function getTargetMemberName(sender: 'member1' | 'member2' | undefined, memberSettings: MemberSettings): string {
  if (sender === 'member2') return memberSettings.member1_name;
  return memberSettings.member2_name;
}

export function getLinkedContentTitle(
  episode: Episode,
  videos: Video[],
  moments: Moment[],
  posts: Post[]
): string {
  if (episode.linked_content_type === 'video' && episode.linked_content_id) {
    const video = videos.find(v => v.id === episode.linked_content_id);
    return video?.title || '영상';
  }
  if (episode.linked_content_type === 'moment' && episode.linked_content_id) {
    const moment = moments.find(m => m.id === episode.linked_content_id);
    return moment?.title || '모먼트';
  }
  if (episode.linked_content_type === 'post' && episode.linked_content_id) {
    const post = posts.find(p => p.id === episode.linked_content_id);
    return post?.title || post?.platform || '포스트';
  }
  return '콘텐츠';
}

export function getContentTypeIcon(type?: string): ReactNode {
  switch (type) {
    case 'video': return createElement(VideoIcon, { size: 16 });
    case 'moment': return createElement(VideoIcon, { size: 16 });
    case 'post': return createElement(PostIcon, { size: 16 });
    default: return createElement(VideoIcon, { size: 16 });
  }
}

export function getCommentPlatform(
  episode: Episode,
  videos: Video[],
  posts: Post[]
): 'twitter' | 'instagram' | 'weverse' | 'youtube' | 'other' | null {
  if (!episode.linked_content_id) return null;

  if (episode.linked_content_type === 'video') {
    const video = videos.find(v => v.id === episode.linked_content_id);
    if (video?.url?.includes('youtube.com') || video?.url?.includes('youtu.be')) {
      return 'youtube';
    }
    return 'weverse';
  }
  if (episode.linked_content_type === 'moment') {
    return 'twitter';
  }
  if (episode.linked_content_type === 'post') {
    const post = posts.find(p => p.id === episode.linked_content_id);
    return post?.platform || 'other';
  }
  return null;
}

export function getLinkedContentPath(episode: Episode): string | null {
  if (!episode.linked_content_id) return null;
  switch (episode.linked_content_type) {
    case 'video': return `/videos?highlight=${episode.linked_content_id}`;
    case 'moment': return `/moments?highlight=${episode.linked_content_id}`;
    case 'post': return `/posts?highlight=${episode.linked_content_id}`;
    default: return null;
  }
}

// 시간 포맷: "14:30" → "오후 02:30"
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return time;
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
