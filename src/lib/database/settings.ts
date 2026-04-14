import { supabase } from '../supabase';
import type { MemberSettings } from './types';

export async function getMemberSettings(): Promise<MemberSettings> {
  const { data, error } = await supabase
    .from('settings')
    .select('member1_name, member2_name, articles_visible')
    .eq('id', 1)
    .single();

  if (error) return { member1_name: '멤버1', member2_name: '멤버2', articles_visible: false };
  return data;
}

export async function updateMemberSettings(settings: MemberSettings): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .upsert({ id: 1, ...settings, updated_at: new Date().toISOString() });

  if (error) throw error;
}

export async function getArticlesVisibility(): Promise<boolean> {
  const settings = await getMemberSettings();
  return settings.articles_visible ?? false;
}

export async function setArticlesVisibility(visible: boolean): Promise<void> {
  const { error } = await supabase
    .from('settings')
    .update({ articles_visible: visible, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) throw error;
}
