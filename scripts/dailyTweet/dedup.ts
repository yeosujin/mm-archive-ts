import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 봇은 service role 키로 접근한다 (RLS 우회, tweet_bot_log 쓰기 필요).
export function makeSupabase(): SupabaseClient {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function alreadyPosted(sb: SupabaseClient, runDate: string): Promise<boolean> {
  const { data, error } = await sb
    .from('tweet_bot_log')
    .select('run_date')
    .eq('run_date', runDate)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function recordRun(sb: SupabaseClient, runDate: string, tweetCount: number): Promise<void> {
  // upsert: --force 재게시 시에도 run_date 중복 에러 없이 갱신
  const { error } = await sb
    .from('tweet_bot_log')
    .upsert({ run_date: runDate, tweet_count: tweetCount }, { onConflict: 'run_date' });
  if (error) throw error;
}
