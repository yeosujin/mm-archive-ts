import { supabase } from '../supabase';
import type { Moment } from './types';
import { syncEmbedding } from './embeddings';

const PAGE_SIZE = 1000;

// supabase 쿼리는 await할 때 요청이 나가므로 async로 감싸 부르는 즉시 보낸다
async function momentsPage(from: number) {
  return await supabase
    .from('moments')
    .select('*')
    .order('date', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
}

// 1000행씩 나눠 받는다. 전체 개수와 첫 장을 함께 요청하고, 나머지 장은 한꺼번에 받는다
export async function getMoments(): Promise<Moment[]> {
  const firstRequest = momentsPage(0);
  const { count, error: countError } = await supabase.from('moments').select('*', { count: 'exact', head: true });
  if (countError) throw countError;

  const rest: ReturnType<typeof momentsPage>[] = [];
  for (let from = PAGE_SIZE; from < (count ?? 0); from += PAGE_SIZE) rest.push(momentsPage(from));
  const pages = await Promise.all([firstRequest, ...rest]);

  const allData: Moment[] = [];
  for (const { data, error } of pages) {
    if (error) throw error;
    allData.push(...(data ?? []));
  }

  // 세는 사이에 늘었으면 마지막 장이 꽉 찬다 — 짧은 장이 나올 때까지 이어 받는다
  let lastLength = pages[pages.length - 1].data?.length ?? 0;
  let from = pages.length * PAGE_SIZE;
  while (lastLength === PAGE_SIZE) {
    const { data, error } = await momentsPage(from);
    if (error) throw error;
    allData.push(...(data ?? []));
    lastLength = data?.length ?? 0;
    from += PAGE_SIZE;
  }

  return allData;
}

export async function getMomentsByVideoId(videoId: string): Promise<Moment[]> {
  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .eq('video_id', videoId)
    .order('date', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(5000);

  if (error) throw error;
  return data || [];
}

export async function createMoment(moment: Omit<Moment, 'id'>): Promise<Moment> {
  const { data, error } = await supabase
    .from('moments')
    .insert(moment)
    .select()
    .single();

  if (error) throw error;
  syncEmbedding('moment', data.id);
  return data;
}

export async function updateMoment(id: string, moment: Partial<Omit<Moment, 'id'>>): Promise<Moment> {
  const { data, error } = await supabase
    .from('moments')
    .update(moment)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  syncEmbedding('moment', data.id);
  return data;
}

export async function deleteMoment(id: string): Promise<void> {
  const { error } = await supabase
    .from('moments')
    .delete()
    .eq('id', id);

  if (error) throw error;
  syncEmbedding('moment', id);
}

export async function updateMomentPositions(updates: { id: string; position: number }[]): Promise<void> {
  const promises = updates.map((update) =>
    supabase
      .from('moments')
      .update({ position: update.position })
      .eq('id', update.id)
  );

  const results = await Promise.all(promises);
  const firstError = results.find(r => r.error)?.error;

  if (firstError) throw firstError;
}
