import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

// 색인 대상 content_type 목록 (activity는 name만이라 제외)
export const INDEXABLE_TYPES = [
  'video', 'moment', 'post', 'episode', 'article', 'photo', 'ask',
] as const;
export type ContentType = (typeof INDEXABLE_TYPES)[number];

const TABLE: Record<ContentType, string> = {
  video: 'videos',
  moment: 'moments',
  post: 'posts',
  episode: 'episodes',
  article: 'articles',
  photo: 'photos',
  ask: 'asks',
};

function join(parts: (string | null | undefined)[]): string {
  return parts.filter((p) => p && p.trim()).join(' \n');
}

// 원본 행을 조회해 임베딩용 텍스트를 만든다. 원본이 없으면 null(→ 삭제 처리).
export async function buildEmbeddingText(
  supabase: SupabaseClient,
  contentType: ContentType,
  contentId: string,
): Promise<string | null> {
  const { data: row, error } = await supabase
    .from(TABLE[contentType])
    .select('*')
    .eq('id', contentId)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  switch (contentType) {
    case 'video':
      return join([row.title, row.channel_name, row.icon_text, row.date]);
    case 'moment':
      return join([row.title, row.date]);
    case 'post':
      return join([row.title, row.writer, row.content, row.platform, row.date]);
    case 'episode': {
      const msgs = Array.isArray(row.messages)
        ? row.messages
            .filter((m: { type: string }) => m.type === 'text')
            .map((m: { content: string }) => m.content)
            .join(' ')
        : '';
      return join([row.title, row.comment_text, msgs, row.date]);
    }
    case 'article': {
      const tags = Array.isArray(row.tags) ? row.tags.join(' ') : '';
      return join([row.title, row.author, tags, row.date]);
    }
    case 'photo': {
      const tags = Array.isArray(row.tags) ? row.tags.join(' ') : '';
      return join([row.title, tags, row.date]);
    }
    case 'ask':
      return join([row.content, row.answer]);
  }
}
