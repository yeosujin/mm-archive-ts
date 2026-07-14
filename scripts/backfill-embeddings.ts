/**
 * 전체 콘텐츠를 content_embeddings에 일괄 색인합니다. (재실행 가능 = 정합성 안전망)
 *
 * 실행:
 *   npx tsx scripts/backfill-embeddings.ts
 *
 * 환경변수 (.env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * 동작:
 *   1. 색인 대상 7개 테이블에서 id 전체 조회
 *   2. 각 (content_type, id)에 대해 embed-content Edge Function 호출 (동시 5개)
 *   3. 실패 항목은 모아서 마지막에 리포트
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TYPE_TABLE: Record<string, string> = {
  video: 'videos',
  moment: 'moments',
  post: 'posts',
  episode: 'episodes',
  article: 'articles',
  photo: 'photos',
  ask: 'asks',
};

const CONCURRENCY = 5;
const failures: { type: string; id: string; error: string }[] = [];

async function embedOne(type: string, id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('embed-content', {
    body: { content_type: type, content_id: id },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

async function runPool(
  items: { type: string; id: string }[],
): Promise<void> {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const item = items[i++];
      try {
        await embedOne(item.type, item.id);
      } catch (e) {
        failures.push({ type: item.type, id: item.id, error: String(e) });
      }
      if (i % 20 === 0) console.log(`  ...${i}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

async function main() {
  const all: { type: string; id: string }[] = [];
  for (const [type, table] of Object.entries(TYPE_TABLE)) {
    const { data, error } = await supabase.from(table).select('id').limit(10000);
    if (error) {
      console.error(`${table} 조회 실패:`, error.message);
      continue;
    }
    for (const row of data ?? []) all.push({ type, id: row.id });
    console.log(`${type}: ${data?.length ?? 0}건`);
  }

  console.log(`\n총 ${all.length}건 색인 시작...`);
  await runPool(all);

  console.log(`\n완료. 성공 ${all.length - failures.length} / 실패 ${failures.length}`);
  if (failures.length) {
    console.log('실패 목록:');
    for (const f of failures) console.log(`  [${f.type}] ${f.id}: ${f.error}`);
    process.exit(1);
  }
}

main();
