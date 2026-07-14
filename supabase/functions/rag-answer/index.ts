import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { embedText, generateAnswer } from '../_shared/gemini.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return jsonResponse({ error: 'query required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const embedding = await embedText(query, 'RETRIEVAL_QUERY');
    const { data: hits, error } = await supabase.rpc('match_content', {
      query_embedding: embedding,
      match_count: 8,
      filter_type: null,
    });
    if (error) throw error;

    const rows = (hits ?? []) as {
      content_type: string;
      content_id: string;
      text: string;
      similarity: number;
    }[];

    if (rows.length === 0) {
      return jsonResponse({
        answer: '관련된 내용을 아카이브에서 찾지 못했어요.',
        sources: [],
      });
    }

    const context = rows
      .map((r, i) => `[${i + 1}] (${r.content_type}) ${r.text}`)
      .join('\n\n');

    const prompt = [
      '너는 팬 아카이브의 검색 도우미야. 아래 "자료"만 근거로 사용자 질문에 한국어로 간결하게 답해.',
      '자료에 없는 내용은 지어내지 말고, 모르면 모른다고 답해. 추측 금지.',
      '',
      `질문: ${query}`,
      '',
      '자료:',
      context,
    ].join('\n');

    const answer = await generateAnswer(prompt);

    return jsonResponse({
      answer,
      sources: rows.map((r) => ({
        content_type: r.content_type,
        content_id: r.content_id,
      })),
    });
  } catch (e) {
    console.error('rag-answer error:', e);
    return jsonResponse({ error: String(e) }, 500);
  }
});
