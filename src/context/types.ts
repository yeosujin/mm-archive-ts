import type { Video, Moment, Post, Episode, Article, Ask, MemberSettings } from '../lib/database';

export interface DataState {
  videos: Video[] | null;
  moments: Moment[] | null;
  posts: Post[] | null;
  episodes: Episode[] | null;
  articles: Article[] | null;
  asks: Ask[] | null;
  memberSettings: MemberSettings | null;
  lastFetched: Record<string, number>;
}

export interface DataContextType extends DataState {
  fetchVideos: (force?: boolean) => Promise<Video[]>;
  fetchMoments: (force?: boolean) => Promise<Moment[]>;
  fetchPosts: (force?: boolean) => Promise<Post[]>;
  fetchEpisodes: (force?: boolean) => Promise<Episode[]>;
  fetchArticles: (force?: boolean) => Promise<Article[]>;
  fetchAsks: (force?: boolean) => Promise<Ask[]>;
  fetchMemberSettings: (force?: boolean) => Promise<MemberSettings>;
  invalidateCache: (key: keyof DataState) => void;
}
