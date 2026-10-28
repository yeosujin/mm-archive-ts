import { describe, it, expect, vi, beforeEach } from 'vitest';

// 가짜 supabase: range 요청마다 행 조각을 돌려주고, 요청이 언제 나갔는지 기록한다
const state = vi.hoisted(() => ({
  rows: [] as { id: string }[],
  count: 0,
  log: [] as string[],
  pending: 0,
  maxPending: 0,
}));

vi.mock('./embeddings', () => ({ syncEmbedding: vi.fn() }));
vi.mock('../supabase', () => {
  const builder = () => {
    const calls: string[] = [];
    let head = false;
    let range: [number, number] | null = null;
    const b = {
      select: (_cols: string, opts?: { head?: boolean }) => { head = !!opts?.head; return b; },
      order: (col: string, opts: { ascending: boolean }) => { calls.push(`${col}:${opts.ascending}`); return b; },
      range: (from: number, to: number) => { range = [from, to]; return b; },
      then: (resolve: (v: unknown) => void) => {
        state.log.push(head ? 'count' : `range:${range![0]}:${calls.join(',')}`);
        state.pending++;
        state.maxPending = Math.max(state.maxPending, state.pending);
        setTimeout(() => {
          state.pending--;
          if (head) resolve({ count: state.count, error: null });
          else resolve({ data: state.rows.slice(range![0], range![1] + 1), error: null });
        }, 5);
      },
    };
    return b;
  };
  return { supabase: { from: () => builder() } };
});

import { getMoments } from './moments';

const makeRows = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `m${i}` }));

beforeEach(() => {
  state.log = [];
  state.pending = 0;
  state.maxPending = 0;
});

describe('getMoments', () => {
  it('2500행: 모든 장을 순서대로 이어 붙이고, 첫 장과 개수 요청을 동시에 보낸다', async () => {
    state.rows = makeRows(2500);
    state.count = 2500;
    const result = await getMoments();
    expect(result.map(r => r.id)).toEqual(state.rows.map(r => r.id));
    expect(state.log[0]).toBe('range:0:date:false,position:true,created_at:true');
    expect(state.log[1]).toBe('count');
    expect(state.log.slice(2)).toEqual([
      'range:1000:date:false,position:true,created_at:true',
      'range:2000:date:false,position:true,created_at:true',
    ]);
    // 나머지 두 장이 동시에 나감
    expect(state.maxPending).toBeGreaterThanOrEqual(2);
  });

  it('1000행 미만: 한 장만 받는다', async () => {
    state.rows = makeRows(10);
    state.count = 10;
    expect((await getMoments()).length).toBe(10);
    expect(state.log.filter(l => l.startsWith('range'))).toHaveLength(1);
  });

  it('세는 사이에 늘었으면 짧은 장이 나올 때까지 이어 받는다', async () => {
    state.rows = makeRows(2100);
    state.count = 1500; // 셀 때는 1500이었음
    const result = await getMoments();
    expect(result.map(r => r.id)).toEqual(state.rows.map(r => r.id));
  });

  it('빈 테이블', async () => {
    state.rows = [];
    state.count = 0;
    expect(await getMoments()).toEqual([]);
  });
});
