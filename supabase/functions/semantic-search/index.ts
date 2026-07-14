import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { embedText } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { query, limit = 20, content_type = null } = await req.json();
    if (!query || typeof query !== 'string') {
      return jsonResponse({ error: 'query required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const embedding = await embedText(query, 'RETRIEVAL_QUERY');

    const { data, error } = await supabase.rpc('match_content', {
      query_embedding: embedding,
      match_count: limit,
      filter_type: content_type,
    });
    if (error) throw error;

    // text는 검색 응답에서 제외(페이로드 절약)
    const results = (data ?? []).map(
      (r: { content_type: string; content_id: string; similarity: number }) => ({
        content_type: r.content_type,
        content_id: r.content_id,
        similarity: r.similarity,
      }),
    );

    return jsonResponse({ results });
  } catch (e) {
    console.error('semantic-search error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
