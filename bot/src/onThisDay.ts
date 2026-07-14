import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { isOnThisDay } from './dates.js';
import type { Video, Moment, Post, Photo } from './types.js';
import type { OnThisDayContent } from './threadPlan.js';

const supabase = createClient(config.supabase.url, config.supabase.key);

// 앱의 DB 정렬을 그대로 미러링한다("모든 순서 그대로").
//   videos:  date desc
//   moments: date desc, position asc, created_at asc
//   photos:  date desc
//   posts:   date desc

async function fetchAll<T>(table: string, order: { col: string; asc: boolean }[]): Promise<T[]> {
  let query = supabase.from(table).select('*');
  for (const o of order) query = query.order(o.col, { ascending: o.asc });
  const { data, error } = await query.limit(10000);
  if (error) throw new Error(`${table} 조회 실패: ${error.message}`);
  return (data ?? []) as T[];
}

export async function loadOnThisDayContent(todayString: string): Promise<OnThisDayContent> {
  const [videos, moments, photos, posts] = await Promise.all([
    fetchAll<Video>('videos', [{ col: 'date', asc: false }]),
    fetchAll<Moment>('moments', [
      { col: 'date', asc: false },
      { col: 'position', asc: true },
      { col: 'created_at', asc: true },
    ]),
    fetchAll<Photo>('photos', [{ col: 'date', asc: false }]),
    fetchAll<Post>('posts', [{ col: 'date', asc: false }]),
  ]);

  // 오늘(MM-DD) 필터
  const todayMoments = moments.filter((m) => isOnThisDay(m.date, todayString));
  const todayPhotos = photos.filter((p) => isOnThisDay(p.date, todayString));
  const todayPosts = posts.filter((p) => isOnThisDay(p.date, todayString));

  // 모먼트를 영상 출처(video_id)별로 그룹핑.
  // 출처 순서는 해당 영상의 date desc (videos 배열 순서)를 따른다.
  const momentsByVideo = new Map<string, Moment[]>();
  for (const m of todayMoments) {
    if (!m.video_id) continue; // 출처 없는 모먼트는 제외
    const list = momentsByVideo.get(m.video_id) ?? [];
    list.push(m);
    momentsByVideo.set(m.video_id, list);
  }

  const momentGroups: OnThisDayContent['momentGroups'] = [];
  for (const v of videos) {
    const ms = momentsByVideo.get(v.id);
    if (ms && ms.length > 0) momentGroups.push({ video: v, moments: ms });
  }

  return { momentGroups, photos: todayPhotos, posts: todayPosts };
}
