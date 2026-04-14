import { supabase } from '../supabase';
import type { Post } from './types';

export async function getPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createPost(post: Omit<Post, 'id'>): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePost(id: string, post: Partial<Omit<Post, 'id'>>): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .update(post)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
