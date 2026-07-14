import { supabase } from '../supabase';
import type { Photo } from './types';
import { syncEmbedding } from './embeddings';

export async function getPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPhoto(photo: Omit<Photo, 'id'>): Promise<Photo> {
  const { data, error } = await supabase
    .from('photos')
    .insert(photo)
    .select()
    .single();

  if (error) throw error;
  syncEmbedding('photo', data.id);
  return data;
}

export async function updatePhoto(id: string, photo: Partial<Omit<Photo, 'id'>>): Promise<Photo> {
  const { data, error } = await supabase
    .from('photos')
    .update(photo)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  syncEmbedding('photo', data.id);
  return data;
}

export async function deletePhoto(id: string): Promise<void> {
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', id);

  if (error) throw error;
  syncEmbedding('photo', id);
}
