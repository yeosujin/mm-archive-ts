import { supabase } from '../supabase';
import type { MemberSettings } from './types';

export async function getMemberSettings(): Promise<MemberSettings> {
  const { data, error } = await supabase
    .from('settings')
    .select('member1_name, member2_name')
    .eq('id', 1)
    .single();

  if (error) return { member1_name: '멤버1', member2_name: '멤버2' };
  return data;
}

export async function updateMemberSettings(settings: MemberSettings): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });

  if (error) throw error;
}
