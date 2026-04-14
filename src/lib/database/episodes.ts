import { supabase } from '../supabase';
import type { Episode } from './types';

export async function getEpisodes(): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createEpisode(episode: Omit<Episode, 'id'>): Promise<Episode> {
  const { data, error } = await supabase
    .from('episodes')
    .insert(episode)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEpisode(id: string, episode: Partial<Omit<Episode, 'id'>>): Promise<Episode> {
  const { data, error } = await supabase
    .from('episodes')
    .update(episode)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEpisode(id: string): Promise<void> {
  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
