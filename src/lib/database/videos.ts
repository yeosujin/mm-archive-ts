import { supabase } from '../supabase';
import type { Video } from './types';

export async function getVideos(): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('date', { ascending: false })
    .limit(5000);

  if (error) throw error;
  return data || [];
}

export async function getVideo(id: string): Promise<Video | null> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createVideo(video: Omit<Video, 'id'>): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .insert(video)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVideo(id: string, video: Partial<Omit<Video, 'id'>>): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .update(video)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
