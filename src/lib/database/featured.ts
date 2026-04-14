import { supabase } from '../supabase';
import type { FeaturedContent } from './types';

export async function getFeaturedContent(): Promise<FeaturedContent> {
  const { data, error } = await supabase
    .from('featured_content')
    .select('type, content_id')
    .eq('id', 1)
    .single();

  if (error) return { type: null, content_id: null };
  return data;
}

export async function setFeaturedContent(type: string | null, contentId: string | null): Promise<void> {
  const { error } = await supabase
    .from('featured_content')
    .update({ type, content_id: contentId, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) throw error;
}
