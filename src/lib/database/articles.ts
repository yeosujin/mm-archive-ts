import { supabase } from '../supabase';
import type { Article } from './types';

export async function getArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createArticle(article: Omit<Article, 'id'>): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .insert(article)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateArticle(id: string, article: Partial<Omit<Article, 'id'>>): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .update(article)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
