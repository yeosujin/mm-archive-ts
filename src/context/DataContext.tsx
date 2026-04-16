import { useCallback, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVideos,
  getMoments,
  getPosts,
  getEpisodes,
  getArticles,
  getAnsweredAsks,
  getPhotos,
  getMemberSettings,
} from '../lib/database';
import { DataContext } from './DataContextValue';
import type { DataState } from './types';

const CACHE_TIME = 1000 * 60 * 5;

// 키 이름은 기존 DataState 키와 맞춰서 invalidateCache(key) 호환성 유지
const queryKeys = {
  videos: ['videos'] as const,
  moments: ['moments'] as const,
  posts: ['posts'] as const,
  episodes: ['episodes'] as const,
  articles: ['articles'] as const,
  asks: ['asks'] as const,
  photos: ['photos'] as const,
  memberSettings: ['memberSettings'] as const,
} satisfies Record<keyof Omit<DataState, 'lastFetched'>, readonly string[]>;

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
  const qc = useQueryClient();

  // 캐시 구독만 수행 (enabled: false 이므로 자동 fetch 안 함)
  // 페이지 컴포넌트가 fetchX()를 호출할 때 queryClient.fetchQuery가 cache에 저장하고,
  // 이 useQuery들이 observer로 붙어 있어서 자동 리렌더됨.
  const { data: videos = null } = useQuery({
    queryKey: queryKeys.videos,
    queryFn: getVideos,
    enabled: false,
    staleTime: CACHE_TIME,
  });
  const { data: moments = null } = useQuery({
    queryKey: queryKeys.moments,
    queryFn: getMoments,
    enabled: false,
    staleTime: CACHE_TIME,
  });
  const { data: posts = null } = useQuery({
    queryKey: queryKeys.posts,
    queryFn: getPosts,
    enabled: false,
    staleTime: CACHE_TIME,
  });
  const { data: episodes = null } = useQuery({
    queryKey: queryKeys.episodes,
    queryFn: getEpisodes,
    enabled: false,
    staleTime: CACHE_TIME,
  });
  const { data: articles = null } = useQuery({
    queryKey: queryKeys.articles,
    queryFn: getArticles,
    enabled: false,
    staleTime: CACHE_TIME,
  });
  const { data: asks = null } = useQuery({
    queryKey: queryKeys.asks,
    queryFn: getAnsweredAsks,
    enabled: false,
    staleTime: CACHE_TIME,
  });
  const { data: photos = null } = useQuery({
    queryKey: queryKeys.photos,
    queryFn: getPhotos,
    enabled: false,
    staleTime: CACHE_TIME,
  });
  const { data: memberSettings = null } = useQuery({
    queryKey: queryKeys.memberSettings,
    queryFn: getMemberSettings,
    enabled: false,
    staleTime: CACHE_TIME,
  });

  const fetchVideos = useCallback(async (force = false) => {
    if (force) await qc.invalidateQueries({ queryKey: queryKeys.videos });
    const data = await qc.fetchQuery({
      queryKey: queryKeys.videos,
      queryFn: getVideos,
      staleTime: CACHE_TIME,
    });
    preloadThumbnails(data.map(v => v.thumbnail_url));
    return data;
  }, [qc]);

  const fetchMoments = useCallback(async (force = false) => {
    if (force) await qc.invalidateQueries({ queryKey: queryKeys.moments });
    const data = await qc.fetchQuery({
      queryKey: queryKeys.moments,
      queryFn: getMoments,
      staleTime: CACHE_TIME,
    });
    preloadThumbnails(data.map(m => m.thumbnail_url));
    return data;
  }, [qc]);

  const fetchPosts = useCallback(async (force = false) => {
    if (force) await qc.invalidateQueries({ queryKey: queryKeys.posts });
    return qc.fetchQuery({
      queryKey: queryKeys.posts,
      queryFn: getPosts,
      staleTime: CACHE_TIME,
    });
  }, [qc]);

  const fetchEpisodes = useCallback(async (force = false) => {
    if (force) await qc.invalidateQueries({ queryKey: queryKeys.episodes });
    return qc.fetchQuery({
      queryKey: queryKeys.episodes,
      queryFn: getEpisodes,
      staleTime: CACHE_TIME,
    });
  }, [qc]);

  const fetchArticles = useCallback(async (force = false) => {
    if (force) await qc.invalidateQueries({ queryKey: queryKeys.articles });
    return qc.fetchQuery({
      queryKey: queryKeys.articles,
      queryFn: getArticles,
      staleTime: CACHE_TIME,
    });
  }, [qc]);

  const fetchAsks = useCallback(async (force = false) => {
    if (force) await qc.invalidateQueries({ queryKey: queryKeys.asks });
    return qc.fetchQuery({
      queryKey: queryKeys.asks,
      queryFn: getAnsweredAsks,
      staleTime: CACHE_TIME,
    });
  }, [qc]);

  const fetchPhotos = useCallback(async (force = false) => {
    if (force) await qc.invalidateQueries({ queryKey: queryKeys.photos });
    return qc.fetchQuery({
      queryKey: queryKeys.photos,
      queryFn: getPhotos,
      staleTime: CACHE_TIME,
    });
  }, [qc]);

  const fetchMemberSettings = useCallback(async (force = false) => {
    if (force) await qc.invalidateQueries({ queryKey: queryKeys.memberSettings });
    return qc.fetchQuery({
      queryKey: queryKeys.memberSettings,
      queryFn: getMemberSettings,
      staleTime: CACHE_TIME,
    });
  }, [qc]);

  const invalidateCache = useCallback((key: keyof DataState) => {
    if (key === 'lastFetched') return;
    const queryKey = queryKeys[key];
    if (queryKey) qc.invalidateQueries({ queryKey });
  }, [qc]);

  const contextValue = useMemo(() => ({
    videos,
    moments,
    posts,
    episodes,
    articles,
    asks,
    photos,
    memberSettings,
    lastFetched: {},
    fetchVideos,
    fetchMoments,
    fetchPosts,
    fetchEpisodes,
    fetchArticles,
    fetchAsks,
    fetchPhotos,
    fetchMemberSettings,
    invalidateCache,
  }), [
    videos, moments, posts, episodes, articles, asks, photos, memberSettings,
    fetchVideos, fetchMoments, fetchPosts, fetchEpisodes, fetchArticles, fetchAsks, fetchPhotos, fetchMemberSettings, invalidateCache,
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
}
