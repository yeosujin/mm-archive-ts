import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { embedText } from '../_shared/gemini.ts';
import {
  buildEmbeddingText,
  INDEXABLE_TYPES,
  type ContentType,
} from '../_shared/content.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { content_type, content_id } = await req.json();
    if (!INDEXABLE_TYPES.includes(content_type)) {
      return jsonResponse({ error: `invalid content_type: ${content_type}` }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const text = await buildEmbeddingText(
      supabase,
      content_type as ContentType,
      content_id,
    );

    // 원본이 삭제된 경우 → 임베딩 행도 제거
    if (!text) {
      await supabase
        .from('content_embeddings')
        .delete()
        .match({ content_type, content_id });
      return jsonResponse({ deleted: true });
    }

    const embedding = await embedText(text, 'RETRIEVAL_DOCUMENT');

    const { error } = await supabase.from('content_embeddings').upsert(
      {
        content_type,
        content_id,
        text,
        embedding,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'content_type,content_id' },
    );
    if (error) throw error;

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error('embed-content error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
