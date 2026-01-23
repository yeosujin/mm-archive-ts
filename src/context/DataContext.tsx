import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getVideos, getMoments, getPosts, getEpisodes, getArticles, getMemberSettings } from '../lib/database';
import type { Video, Moment, Post, Episode, Article, MemberSettings } from '../lib/database';

interface DataState {
  videos: Video[] | null;
  moments: Moment[] | null;
  posts: Post[] | null;
  episodes: Episode[] | null;
  articles: Article[] | null;
  memberSettings: MemberSettings | null;
  lastFetched: Record<string, number>;
}

interface DataContextType extends DataState {
  fetchVideos: (force?: boolean) => Promise<Video[]>;
  fetchMoments: (force?: boolean) => Promise<Moment[]>;
  fetchPosts: (force?: boolean) => Promise<Post[]>;
  fetchEpisodes: (force?: boolean) => Promise<Episode[]>;
  fetchArticles: (force?: boolean) => Promise<Article[]>;
  fetchMemberSettings: (force?: boolean) => Promise<MemberSettings>;
  invalidateCache: (key: keyof DataState) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

// 썸네일 프리로드 캐시 (중복 로드 방지)
const preloadedThumbnails = new Set<string>();

/**
 * 썸네일 이미지들을 백그라운드에서 프리로드
 * - 브라우저 캐시에 저장되어 VideoPlayer에서 즉시 표시
 * - 이미 로드된 URL은 스킵
 */
function preloadThumbnails(urls: (string | undefined | null)[]) {
  urls.forEach(url => {
    if (!url || preloadedThumbnails.has(url)) return;
    
    preloadedThumbnails.add(url);
    const img = new Image();
    img.src = url;
    // 로드 실패해도 무시 (백그라운드 작업)
  });
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({
    videos: null,
    moments: null,
    posts: null,
    episodes: null,
    articles: null,
    memberSettings: null,
    lastFetched: {},
  });

  const shouldFetch = useCallback((key: string, force: boolean) => {
    if (force) return true;
    const now = Date.now();
    const last = state.lastFetched[key] || 0;
    return !state[key as keyof DataState] || (now - last > CACHE_TIME);
  }, [state]);

  const fetchVideos = useCallback(async (force = false) => {
    if (shouldFetch('videos', force)) {
      const data = await getVideos();
      
      // 썸네일 프리로드
      preloadThumbnails(data.map(v => v.thumbnail_url));
      
      setState(prev => ({
        ...prev,
        videos: data,
        lastFetched: { ...prev.lastFetched, videos: Date.now() }
      }));
      return data;
    }
    return state.videos!;
  }, [shouldFetch, state.videos]);

  const fetchMoments = useCallback(async (force = false) => {
    if (shouldFetch('moments', force)) {
      const data = await getMoments();
      
      // 썸네일 프리로드
      preloadThumbnails(data.map(m => m.thumbnail_url));
      
      setState(prev => ({
        ...prev,
        moments: data,
        lastFetched: { ...prev.lastFetched, moments: Date.now() }
      }));
      return data;
    }
    return state.moments!;
  }, [shouldFetch, state.moments]);

  const fetchPosts = useCallback(async (force = false) => {
    if (shouldFetch('posts', force)) {
      const data = await getPosts();
      setState(prev => ({
        ...prev,
        posts: data,
        lastFetched: { ...prev.lastFetched, posts: Date.now() }
      }));
      return data;
    }
    return state.posts!;
  }, [shouldFetch, state.posts]);

  const fetchEpisodes = useCallback(async (force = false) => {
    if (shouldFetch('episodes', force)) {
      const data = await getEpisodes();
      setState(prev => ({
        ...prev,
        episodes: data,
        lastFetched: { ...prev.lastFetched, episodes: Date.now() }
      }));
      return data;
    }
    return state.episodes!;
  }, [shouldFetch, state.episodes]);

  const fetchArticles = useCallback(async (force = false) => {
    if (shouldFetch('articles', force)) {
      const data = await getArticles();
      setState(prev => ({
        ...prev,
        articles: data,
        lastFetched: { ...prev.lastFetched, articles: Date.now() }
      }));
      return data;
    }
    return state.articles!;
  }, [shouldFetch, state.articles]);

  const fetchMemberSettings = useCallback(async (force = false) => {
    if (shouldFetch('memberSettings', force)) {
      const data = await getMemberSettings();
      setState(prev => ({
        ...prev,
        memberSettings: data,
        lastFetched: { ...prev.lastFetched, memberSettings: Date.now() }
      }));
      return data;
    }
    return state.memberSettings!;
  }, [shouldFetch, state.memberSettings]);

  const invalidateCache = useCallback((key: keyof DataState) => {
    setState(prev => ({
      ...prev,
      lastFetched: { ...prev.lastFetched, [key]: 0 }
    }));
  }, []);

  return (
    <DataContext.Provider value={{ 
      ...state, 
      fetchVideos, 
      fetchMoments, 
      fetchPosts, 
      fetchEpisodes, 
      fetchArticles, 
      fetchMemberSettings,
      invalidateCache 
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}