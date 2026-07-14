import { supabase } from '../supabase';

export type EmbeddingContentType =
  | 'video' | 'moment' | 'post' | 'episode' | 'article' | 'photo' | 'ask';

// 색인 재생성을 백그라운드로 요청한다. 실패해도 원 작업을 막지 않는다(fire-and-forget).
// 정합성은 backfill:embeddings 재실행으로 보정 가능.
export function syncEmbedding(
  contentType: EmbeddingContentType,
  contentId: string,
): void {
  void supabase.functions
    .invoke('embed-content', {
      body: { content_type: contentType, content_id: contentId },
    })
    .catch((e) => console.error('syncEmbedding failed:', contentType, contentId, e));
}
