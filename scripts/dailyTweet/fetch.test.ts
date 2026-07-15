import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from './fetch';

// range(from,to)로 슬라이스만 돌려주는 가짜 Supabase 클라이언트
function fakeSb(totalRows: number): SupabaseClient {
  const rows = Array.from({ length: totalRows }, (_, i) => ({ id: `id${i}` }));
  return {
    from: () => ({
      select: () => ({
        order: () => ({
          range: async (from: number, to: number) => ({
            data: rows.slice(from, to + 1),
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe('fetchAllRows', () => {
  it('1000행 이하면 한 페이지로 전부', async () => {
    const rows = await fetchAllRows<{ id: string }>(fakeSb(500), 'moments');
    expect(rows).toHaveLength(500);
  });

  it('1000행 초과면 여러 페이지로 전부 가져온다 (버그 재현 방지)', async () => {
    const rows = await fetchAllRows<{ id: string }>(fakeSb(2500), 'moments');
    expect(rows).toHaveLength(2500);
    expect(rows[0].id).toBe('id0');
    expect(rows[2499].id).toBe('id2499');
  });

  it('정확히 1000행이면 두 번째 페이지(0건)에서 멈춘다', async () => {
    const rows = await fetchAllRows<{ id: string }>(fakeSb(1000), 'moments');
    expect(rows).toHaveLength(1000);
  });
});
