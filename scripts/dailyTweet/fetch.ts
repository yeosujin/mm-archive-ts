import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE = 1000;

// Supabase 기본 1000행 제한을 넘어 테이블 전체 행을 페이지네이션으로 가져온다.
// (앱의 getMoments 등과 동일한 방식. id 정렬로 페이지 경계 안정화)
export async function fetchAllRows<T>(sb: SupabaseClient, table: string): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
