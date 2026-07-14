import { supabase } from '../supabase';
import type { Ask } from './types';
import { syncEmbedding } from './embeddings';

export async function getAsks(): Promise<Ask[]> {
  const { data, error } = await supabase
    .from('asks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAnsweredAsks(): Promise<Ask[]> {
  const { data, error } = await supabase
    .from('asks')
    .select('*')
    .eq('status', 'answered')
    .order('answered_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAsk(id: string): Promise<Ask | null> {
  const { data, error } = await supabase
    .from('asks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createAsk(ask: Pick<Ask, 'content' | 'image_url'>): Promise<Ask> {
  const { data, error } = await supabase
    .from('asks')
    .insert({
      content: ask.content,
      image_url: ask.image_url || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  syncEmbedding('ask', data.id);
  return data;
}

export async function answerAsk(id: string, answer: string): Promise<Ask> {
  const { data, error } = await supabase
    .from('asks')
    .update({
      answer,
      status: 'answered',
      answered_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  syncEmbedding('ask', data.id);
  return data;
}

export async function updateAsk(id: string, ask: Partial<Omit<Ask, 'id'>>): Promise<Ask> {
  const { data, error } = await supabase
    .from('asks')
    .update(ask)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  syncEmbedding('ask', data.id);
  return data;
}

export async function deleteAsk(id: string): Promise<void> {
  const { error } = await supabase
    .from('asks')
    .delete()
    .eq('id', id);

  if (error) throw error;
  syncEmbedding('ask', id);
}

export async function getExpiredImageAsks(): Promise<Ask[]> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('asks')
    .select('*')
    .eq('status', 'answered')
    .not('image_url', 'is', null)
    .lt('answered_at', threeDaysAgo);

  if (error) throw error;
  return data || [];
}

export async function clearAskImageUrl(id: string): Promise<void> {
  const { error } = await supabase
    .from('asks')
    .update({ image_url: null })
    .eq('id', id);

  if (error) throw error;
}
