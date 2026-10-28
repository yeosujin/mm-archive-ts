import type { Video, Moment, Post, Episode, Ask, Photo, MemberSettings } from '../lib/database';

export interface DataState {
  videos: Video[] | null;
  moments: Moment[] | null;
  posts: Post[] | null;
  episodes: Episode[] | null;
  asks: Ask[] | null;
  photos: Photo[] | null;
  memberSettings: MemberSettings | null;
  lastFetched: Record<string, number>;
}

export interface DataContextType extends DataState {
  fetchVideos: (force?: boolean) => Promise<Video[]>;
  fetchMoments: (force?: boolean) => Promise<Moment[]>;
  fetchPosts: (force?: boolean) => Promise<Post[]>;
  fetchEpisodes: (force?: boolean) => Promise<Episode[]>;
  fetchAsks: (force?: boolean) => Promise<Ask[]>;
  fetchPhotos: (force?: boolean) => Promise<Photo[]>;
  fetchMemberSettings: (force?: boolean) => Promise<MemberSettings>;
  invalidateCache: (key: keyof DataState) => void;
}
