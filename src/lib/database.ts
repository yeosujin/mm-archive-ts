import { supabase } from './supabase';

// 타입 정의
export interface Video {
  id: string;
  title: string;
  url: string;
  date: string;
  icon?: string; // 위버스 등 외부 링크용 아이콘 (💙, 🩵, 🖤, 🤍)
}

export interface Moment {
  id: string;
  title: string;
  tweet_url: string;
  date: string;
  video_id?: string;
  position?: number;
}

export interface Post {
  id: string;
  title: string;
  url: string;
  platform: 'twitter' | 'instagram' | 'weverse' | 'other';
  date: string;
}

export interface Episode {
  id: string;
  title?: string;
  date: string;
  episode_type: 'dm' | 'comment'; // dm: 팬소통에서 언급, comment: 콘텐츠에 댓글
  sender: 'member1' | 'member2'; // 이 에피소드를 보낸 멤버
  // DM 타입용
  messages?: {
    type: 'text' | 'image';
    content: string;
    time: string;
  }[];
  // Comment 타입용
  linked_content_type?: 'video' | 'moment' | 'post'; // 연결된 콘텐츠 타입
  linked_content_id?: string; // 연결된 콘텐츠 ID
  comment_text?: string; // 댓글 내용
}

// 멤버 설정
export interface MemberSettings {
  member1_name: string;
  member2_name: string;
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
  type: 'video' | 'post' | 'moment' | 'episode' | null;
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

export async function updateVideo(id: string, video: Partial<Omit<Video, 'id'>>): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .update(video)
    .eq('id', id)
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
    .order('date', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function getMomentsByVideoId(videoId: string): Promise<Moment[]> {
  const { data, error } = await supabase
    .from('moments')
    .select('*')
    .eq('video_id', videoId)
    .order('date', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  
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

export async function updateMoment(id: string, moment: Partial<Omit<Moment, 'id'>>): Promise<Moment> {
  const { data, error } = await supabase
    .from('moments')
    .update(moment)
    .eq('id', id)
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

export async function updateMomentPositions(updates: { id: string; position: number }[]): Promise<void> {
  const promises = updates.map((update) =>
    supabase
      .from('moments')
      .update({ position: update.position })
      .eq('id', update.id)
  );

  const results = await Promise.all(promises);
  const firstError = results.find(r => r.error)?.error;
  
  if (firstError) throw firstError;
}

// ============ Posts ============
export async function getPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createPost(post: Omit<Post, 'id'>): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .insert(post)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updatePost(id: string, post: Partial<Omit<Post, 'id'>>): Promise<Post> {
  const { data, error } = await supabase
    .from('posts')
    .update(post)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
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

export async function updateEpisode(id: string, episode: Partial<Omit<Episode, 'id'>>): Promise<Episode> {
  const { data, error } = await supabase
    .from('episodes')
    .update(episode)
    .eq('id', id)
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

export async function updateArticle(id: string, article: Partial<Omit<Article, 'id'>>): Promise<Article> {
  const { data, error } = await supabase
    .from('articles')
    .update(article)
    .eq('id', id)
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

// ============ Member Settings ============
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
