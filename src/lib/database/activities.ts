import { supabase } from '../supabase';
import type { Activity } from './types';

export async function getActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createActivity(activity: Omit<Activity, 'id' | 'created_at'>): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert(activity)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
