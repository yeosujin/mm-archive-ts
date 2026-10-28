import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { CACHE_MAX_AGE, CACHE_PREFIX, hydrateQueryCache, parseCacheEntry, persistQueryCache } from './dataCache';

const NOW = 1_800_000_000_000;

function memoryStorage(init: Record<string, string> = {}) {
  const map = new Map(Object.entries(init));
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: vi.fn((k: string, v: string) => { map.set(k, v); }),
    removeItem: (k: string) => { map.delete(k); },
  };
}

describe('parseCacheEntry', () => {
  it('하루 안이면 데이터', () => {
    const raw = JSON.stringify({ savedAt: NOW - 1000, data: [1] });
    expect(parseCacheEntry(raw, NOW)).toEqual({ savedAt: NOW - 1000, data: [1] });
  });
  it('하루 넘으면 null', () => {
    expect(parseCacheEntry(JSON.stringify({ savedAt: NOW - CACHE_MAX_AGE - 1, data: [1] }), NOW)).toBeNull();
  });
  it('미래 시각·깨진 문자열·모양 다름·없음이면 null', () => {
    expect(parseCacheEntry(JSON.stringify({ savedAt: NOW + 60_000, data: [1] }), NOW)).toBeNull();
    expect(parseCacheEntry('{oops', NOW)).toBeNull();
    expect(parseCacheEntry(JSON.stringify({ data: [1] }), NOW)).toBeNull();
    expect(parseCacheEntry(JSON.stringify({ savedAt: NOW, data: null }), NOW)).toBeNull();
    expect(parseCacheEntry('null', NOW)).toBeNull();
    expect(parseCacheEntry(null, NOW)).toBeNull();
  });
});

describe('hydrateQueryCache', () => {
  it('저장분을 넣되 오래된 것으로 표시해 fetchQuery가 네트워크를 탄다', async () => {
    const qc = new QueryClient();
    const storage = memoryStorage({
      [`${CACHE_PREFIX}videos`]: JSON.stringify({ savedAt: NOW - 1000, data: ['cached'] }),
      [`${CACHE_PREFIX}articles`]: JSON.stringify({ savedAt: NOW - 1000, data: ['x'] }),
    });
    hydrateQueryCache(qc, storage, NOW);
    expect(qc.getQueryData(['videos'])).toEqual(['cached']);
    expect(qc.getQueryData(['articles'])).toBeUndefined();

    const queryFn = vi.fn(async () => ['fresh']);
    const data = await qc.fetchQuery({ queryKey: ['videos'], queryFn, staleTime: 1000 * 60 * 5 });
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(data).toEqual(['fresh']);
  });
});

describe('persistQueryCache', () => {
  it('네트워크 결과만 저장하고, 되살린 값·다른 키는 쓰지 않는다', async () => {
    vi.useFakeTimers();
    const qc = new QueryClient();
    const storage = memoryStorage();
    persistQueryCache(qc, storage);

    qc.setQueryData(['moments'], ['manual']);
    await qc.fetchQuery({ queryKey: ['asks'], queryFn: async () => ['a'] });
    await qc.fetchQuery({ queryKey: ['moments'], queryFn: async () => ['fresh'] });
    vi.runAllTimers();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    const entry = parseCacheEntry(storage.map.get(`${CACHE_PREFIX}moments`) ?? null, Date.now());
    expect(entry?.data).toEqual(['fresh']);
    vi.useRealTimers();
  });

  it('용량 초과면 조용히 넘기고 예전 저장분을 지운다', async () => {
    vi.useFakeTimers();
    const qc = new QueryClient();
    const storage = memoryStorage({ [`${CACHE_PREFIX}photos`]: 'old' });
    storage.setItem.mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    persistQueryCache(qc, storage);
    await qc.fetchQuery({ queryKey: ['photos'], queryFn: async () => ['p'] });
    expect(() => vi.runAllTimers()).not.toThrow();
    expect(storage.map.has(`${CACHE_PREFIX}photos`)).toBe(false);
    vi.useRealTimers();
  });
});
