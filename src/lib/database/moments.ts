import { supabase } from '../supabase';
import type { Moment } from './types';

export async function getMoments(): Promise<Moment[]> {
  const allData: Moment[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('moments')
      .select('*')
      .order('date', { ascending: false })
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
      .range(from, from + 999);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allData.push(...data);
    if (data.length < 1000) break;

    from += 1000;
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
  return data;
}

export async function deleteMoment(id: string): Promise<void> {
  const { error } = await supabase
    .from('moments')
    .delete()
    .eq('id', id);

  if (error) throw error;
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
