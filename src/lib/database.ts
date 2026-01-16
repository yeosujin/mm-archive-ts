import { supabase } from './supabase';

// 타입 정의
export interface Video {
  id: string;
  title: string;
  url: string;
  date: string;
}

export interface Moment {
  id: string;
  title: string;
  tweet_url: string;
  date: string;
  video_id?: string;
}

export interface Photo {
  id: string;
  title: string;
  image_url: string;
  date: string;
}

export interface Episode {
  id: string;
  title: string;
  date: string;
  messages: {
    type: 'text' | 'image';
    content: string;
    time: string;
  }[];
}

export interface Article {
  id: string;
  title: string;
  author: string;
  tags: string[];
  url: string;
  date: string;
}

export interface FeaturedContent {
  type: 'video' | 'photo' | 'moment' | 'episode' | null;
  content_id: string | null;
}

// ============ Videos ============
export async function getVideos(): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getVideo(id: string): Promise<Video | null> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

export async function createVideo(video: Omit<Video, 'id'>): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .insert(video)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============ Moments ============
export async function getMoments(): Promise<Moment[]> {
  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getMomentsByVideoId(videoId: string): Promise<Moment[]> {
  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .eq('video_id', videoId)
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createMoment(moment: Omit<Moment, 'id'>): Promise<Moment> {
  const { data, error } = await supabase
    .from('moments')
    .insert(moment)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteMoment(id: string): Promise<void> {
  const { error } = await supabase
    .from('moments')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============ Photos ============
export async function getPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createPhoto(photo: Omit<Photo, 'id'>): Promise<Photo> {
  const { data, error } = await supabase
    .from('photos')
    .insert(photo)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deletePhoto(id: string): Promise<void> {
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============ Episodes ============
export async function getEpisodes(): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createEpisode(episode: Omit<Episode, 'id'>): Promise<Episode> {
  const { data, error } = await supabase
    .from('episodes')
    .insert(episode)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteEpisode(id: string): Promise<void> {
  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============ Articles ============
export async function getArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createArticle(article: Omit<Article, 'id'>): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .insert(article)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============ Featured Content ============
export async function getFeaturedContent(): Promise<FeaturedContent> {
  const { data, error } = await supabase
    .from('featured_content')
    .select('type, content_id')
    .eq('id', 1)
    .single();
  
  if (error) return { type: null, content_id: null };
  return data;
}

export async function setFeaturedContent(type: string | null, contentId: string | null): Promise<void> {
  const { error } = await supabase
    .from('featured_content')
    .update({ type, content_id: contentId, updated_at: new Date().toISOString() })
    .eq('id', 1);
  
  if (error) throw error;
}
