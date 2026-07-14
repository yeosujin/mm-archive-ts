import { supabase } from './supabase';

export interface SemanticHit {
  content_type: 'video' | 'moment' | 'post' | 'episode' | 'article' | 'photo' | 'ask';
  content_id: string;
  similarity: number;
}

export async function semanticSearch(
  query: string,
  limit = 20,
): Promise<SemanticHit[]> {
  const { data, error } = await supabase.functions.invoke('semantic-search', {
    body: { query, limit },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.results ?? []) as SemanticHit[];
}

export interface RagSource {
  content_type: SemanticHit['content_type'];
  content_id: string;
}

export interface RagResult {
  answer: string;
  sources: RagSource[];
}

export async function askArchive(query: string): Promise<RagResult> {
  const { data, error } = await supabase.functions.invoke('rag-answer', {
    body: { query },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as RagResult;
}
