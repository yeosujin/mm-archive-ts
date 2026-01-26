import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { getVideos, getMoments, getPosts, getEpisodes, getArticles, getMemberSettings } from '../lib/database';
import { DataContext } from './DataContextValue';
import type { DataState } from './types';

const CACHE_TIME = 1000 * 60 * 5;

const preloadedThumbnails = new Set<string>();

function preloadThumbnails(urls: (string | undefined | null)[]) {
  const validUrls = urls.filter((url): url is string => !!url && !preloadedThumbnails.has(url));
  if (validUrls.length === 0) return;

  const BATCH_SIZE = 3;
  let index = 0;

  const loadBatch = () => {
    const batch = validUrls.slice(index, index + BATCH_SIZE);
    if (batch.length === 0) return;
    batch.forEach(url => {
      preloadedThumbnails.add(url);
      const img = new Image();
      img.src = url;
    });
    index += BATCH_SIZE;
    if (index < validUrls.length) {
      setTimeout(loadBatch, 100);
    }
  };

  loadBatch();
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

  const contextValue = useMemo(() => ({
    ...state,
    fetchVideos,
    fetchMoments,
    fetchPosts,
    fetchEpisodes,
    fetchArticles,
    fetchMemberSettings,
    invalidateCache
  }), [state, fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchArticles, fetchMemberSettings, invalidateCache]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}
