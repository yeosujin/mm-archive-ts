import type { QueryClient } from '@tanstack/react-query';

/**
 * 목록 데이터를 기기(localStorage)에 남겨 다음 방문 때 바로 보여준다 (stale-while-revalidate).
 * 되살린 데이터는 updatedAt 0으로 넣어 항상 '오래됨' — 첫 fetchX()는 반드시 네트워크를 탄다.
 * 저장은 네트워크로 받은 성공 결과만 (setQueryData로 넣은 것은 다시 쓰지 않는다).
 */

// 데이터 모양이 바뀌면 v를 올려 예전 저장분을 버린다
export const CACHE_PREFIX = 'mmemory.cache.v1.';
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24;

// DataContext의 queryKeys와 같은 이름 (키는 [name])
export const PERSISTED_KEYS = ['videos', 'moments', 'posts', 'episodes', 'photos', 'memberSettings'] as const;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface CacheEntry { savedAt: number; data: unknown }

/** 저장된 문자열 → 데이터. 깨졌거나 하루 넘었거나 미래 시각이면 null */
export function parseCacheEntry(raw: string | null, now: number): CacheEntry | null {
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as Partial<CacheEntry> | null;
    if (!entry || typeof entry.savedAt !== 'number' || entry.data == null) return null;
    const age = now - entry.savedAt;
    if (age < 0 || age > CACHE_MAX_AGE) return null;
    return { savedAt: entry.savedAt, data: entry.data };
  } catch {
    return null;
  }
}

function defaultStorage(): StorageLike | null {
  try { return window.localStorage; } catch { return null; }
}

/** 저장분을 QueryClient에 넣는다. 첫 렌더 전에 부른다 */
export function hydrateQueryCache(qc: QueryClient, storage = defaultStorage(), now = Date.now()) {
  if (!storage) return;
  for (const name of PERSISTED_KEYS) {
    let raw: string | null = null;
    try { raw = storage.getItem(CACHE_PREFIX + name); } catch { /* 저장소 막힘 */ }
    const entry = parseCacheEntry(raw, now);
    if (entry) qc.setQueryData([name], entry.data, { updatedAt: 0 });
  }
}

/** 네트워크로 받은 결과를 저장소에 쓴다. 해제 함수를 돌려준다 */
export function persistQueryCache(qc: QueryClient, storage = defaultStorage()): () => void {
  if (!storage) return () => {};
  const names = new Set<string>(PERSISTED_KEYS);
  return qc.getQueryCache().subscribe(event => {
    if (event.type !== 'updated' || event.action.type !== 'success' || event.action.manual) return;
    const name = event.query.queryKey[0];
    if (event.query.queryKey.length !== 1 || typeof name !== 'string' || !names.has(name)) return;
    const data = event.action.data;
    // 직렬화가 크다(모먼트 ~0.8MB) — 화면 갱신을 먼저 보내고 쓴다
    setTimeout(() => {
      try {
        storage.setItem(CACHE_PREFIX + name, JSON.stringify({ savedAt: Date.now(), data }));
      } catch {
        // 용량 초과 등: 예전 저장분이 남아 계속 되살아나지 않게 지운다
        try { storage.removeItem(CACHE_PREFIX + name); } catch { /* 무시 */ }
      }
    }, 0);
  });
}
