import type { Episode, MemberSettings, Moment, Photo, Post, Video } from './database/types';
import { getVideoCover } from './videoCover';
import { detectVideoPlatform } from './platformUtils';
import { momentsByVideo } from './videoCatalog';

/** 캘린더 하루 칸에 들어가는 기록 하나 */
export type CalendarEntry =
  | { kind: 'video'; id: string; video: Video; moments: Moment[] }
  | { kind: 'moment'; id: string; title: string; path: string; cover: string | null }
  | { kind: 'post'; id: string; title: string; path: string; cover: string | null; post: Post }
  | { kind: 'photo'; id: string; title: string; path: string; cover: string; count: number; photos: Photo[] }
  | { kind: 'episode'; id: string; title: string; path: string; sender: string; tone: ChatTone; lines: ChatLine[]; episode: Episode };

/** 말풍선 색: DM은 보낸 멤버 색, 댓글·리스닝 파티는 회색 (에피소드 페이지와 같은 규칙) */
export type ChatTone = 'member1' | 'member2' | 'gray';

/** 에피소드 카드에 캡처처럼 보일 메시지 줄 */
export interface ChatLine { type: 'text' | 'image'; content: string }

/** 카드에 보일 메시지 수 */
const CHAT_PREVIEW = 3;

export interface CalendarData {
  videos: Video[];
  moments: Moment[];
  posts: Post[];
  photos: Photo[];
  episodes: Episode[];
  memberSettings: MemberSettings | null;
}

const EPISODE_TYPE_NAMES: Record<string, string> = {
  dm: 'DM',
  comment: '댓글',
  listening_party: '리스닝 파티',
};

const LP_PLATFORM_NAMES: Record<string, string> = {
  melon: '멜론',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  weverse: 'Weverse',
};

function postCover(post: Post): string | null {
  const first = post.media?.[0];
  if (!first) return null;
  return first.thumbnail ?? (first.type === 'image' ? first.url : null);
}

/** 모먼트 항목. 상위 영상이 있으면 그 영상 페이지의 모먼트로 연결 */
export function momentEntry(m: Moment, parent?: Video): Extract<CalendarEntry, { kind: 'moment' }> {
  const path = parent
    ? `/videos/${encodeURIComponent(parent.id)}?m=${encodeURIComponent(m.id)}`
    : `/moments?highlight=${encodeURIComponent(m.id)}`;
  return { kind: 'moment', id: m.id, title: m.title, path, cover: m.thumbnail_url ?? null };
}

export function postEntry(p: Post): Extract<CalendarEntry, { kind: 'post' }> {
  return {
    kind: 'post',
    id: p.id,
    title: p.title || p.platform,
    path: `/posts?highlight=${encodeURIComponent(p.id)}`,
    cover: postCover(p),
    post: p,
  };
}

/** 에피소드 항목 만들기. 제목에 멤버 이름·연결 콘텐츠 제목이 들어가서 데이터를 미리 받아 둔다 */
export function episodeEntryBuilder(data: Pick<CalendarData, 'videos' | 'moments' | 'posts' | 'memberSettings'>) {
  const { videos, moments, posts, memberSettings } = data;
  const videoById = new Map(videos.map(v => [v.id, v]));
  const memberName = (sender?: 'member1' | 'member2') =>
    (sender === 'member2' ? memberSettings?.member2_name : memberSettings?.member1_name) ?? '';

  // 연결된 콘텐츠 제목
  const linkedTitle = (ep: Episode) => {
    if (ep.linked_content_type === 'video') return videoById.get(ep.linked_content_id ?? '')?.title || '영상';
    if (ep.linked_content_type === 'moment') return moments.find(m => m.id === ep.linked_content_id)?.title || '모먼트';
    if (ep.linked_content_type === 'post') {
      const post = posts.find(p => p.id === ep.linked_content_id);
      return post?.title || post?.platform || '포스트';
    }
    return '콘텐츠';
  };

  return (e: Episode): Extract<CalendarEntry, { kind: 'episode' }> => {
    let title: string;
    if (e.episode_type === 'dm') {
      // DM: 항상 발신자 + DM 표시
      const firstMsg = e.messages?.[0];
      const preview = e.title || (firstMsg?.type === 'text' ? firstMsg.content : '📷');
      title = `${memberName(e.sender)} DM: ${preview}`;
    } else if (e.episode_type === 'comment') {
      // 댓글: 발신자 + 연결 콘텐츠
      title = e.linked_content_id
        ? `${memberName(e.sender)} → "${linkedTitle(e)}" 댓글`
        : e.title || `${memberName(e.sender)} 댓글`;
    } else if (e.episode_type === 'listening_party') {
      const content = e.title || e.messages?.[0]?.content || '';
      const platformName = e.platform ? LP_PLATFORM_NAMES[e.platform] : '';
      title = `${content} ${platformName || ''} 리스닝 파티`.replaceAll(/\s+/g, ' ').trim();
    } else {
      title = e.title || EPISODE_TYPE_NAMES[e.episode_type] || e.episode_type;
    }
    // 메시지가 없는 댓글은 댓글 본문 한 줄 (스토리 채팅 화면과 같은 규칙)
    const messages = e.messages?.length
      ? e.messages
      : e.comment_text ? [{ type: 'text' as const, content: e.comment_text }] : [];
    return {
      kind: 'episode',
      id: e.id,
      title,
      path: `/episodes?tab=${e.episode_type}&highlight=${encodeURIComponent(e.id)}`,
      sender: memberName(e.sender),
      tone: e.episode_type === 'dm' ? (e.sender === 'member2' ? 'member2' : 'member1') : 'gray',
      episode: e,
      lines: messages.slice(0, CHAT_PREVIEW).map(m => ({ type: m.type, content: m.content })),
    };
  };
}

/** 날짜(YYYY-MM-DD)별 기록. 같은 날 안에서는 영상 → 모먼트 → 사진 → 포스트 → 에피소드 순 */
export function buildCalendarDays(data: CalendarData): Map<string, CalendarEntry[]> {
  const { videos, moments, posts, photos, episodes } = data;
  const byDate = new Map<string, CalendarEntry[]>();
  const push = (date: string, entry: CalendarEntry) => {
    const key = date.slice(0, 10);
    byDate.set(key, [...(byDate.get(key) ?? []), entry]);
  };
  const videoById = new Map(videos.map(v => [v.id, v]));
  const momentMap = momentsByVideo(moments);

  videos.forEach(v => push(v.date, { kind: 'video', id: v.id, video: v, moments: momentMap.get(v.id) ?? [] }));

  // 상위 영상과 날짜가 같은 모먼트는 영상 항목으로 이미 표시되므로 제외.
  // 날짜가 다르면(독립 모먼트 포함) 자기 날짜에 별도 표시 — '그 해 오늘' 판정 규칙과 일치시킴
  moments.forEach(m => {
    const parent = m.video_id ? videoById.get(m.video_id) : undefined;
    if (parent && parent.date === m.date) return;
    push(m.date, momentEntry(m, parent));
  });

  // 사진은 같은 날 같은 제목(끝의 -1, -2 번호 제외)을 한 묶음으로. 누르면 첫 장이 라이트박스로 열린다
  const photoGroups = new Map<string, Photo[]>();
  photos.forEach(ph => {
    const key = `${ph.date}|${ph.title.replace(/-\d+$/, '')}`;
    photoGroups.set(key, [...(photoGroups.get(key) ?? []), ph]);
  });
  // 묶음 안은 끝 번호순(-1, -2 …) — 사진 페이지와 같은 순서
  const suffix = (t: string) => Number(/-(\d+)$/.exec(t)?.[1] ?? 0);
  photoGroups.forEach((unsorted, key) => {
    const [date, title] = key.split('|');
    const group = [...unsorted].sort((a, b) => suffix(a.title) - suffix(b.title));
    const first = group[0];
    push(date, {
      kind: 'photo',
      id: first.id,
      title,
      path: `/photos?highlight=${encodeURIComponent(first.id)}`,
      cover: first.thumbnail_url || first.image_url,
      count: group.length,
      photos: group,
    });
  });

  posts.forEach(p => push(p.date, postEntry(p)));

  const toEpisode = episodeEntryBuilder(data);
  episodes.forEach(e => push(e.date, toEpisode(e)));

  return byDate;
}

/**
 * 칸 표지. 영상 표지 > 모먼트 > 사진 > 포스트 미디어. 이미지 없는 영상은 플랫폼 색 블록,
 * 그것도 없고 에피소드가 있으면 그 에피소드 종류 알약
 */
export type DayCover = { src: string } | { platform: ReturnType<typeof detectVideoPlatform> } | { chat: ChatTone; type: Episode['episode_type'] } | null;

export function dayCover(entries: CalendarEntry[]): DayCover {
  const order: CalendarEntry['kind'][] = ['video', 'moment', 'photo', 'post'];
  let fallback: DayCover = null;
  for (const kind of order) {
    for (const e of entries) {
      if (e.kind !== kind) continue;
      if (e.kind === 'video') {
        // 유튜브 hqdefault는 4:3에 위아래 검은 띠가 있어 작은 칸에선 띠가 보인다 — 16:9인 mqdefault로 바꾼다
        const src = getVideoCover(e.video, e.moments)?.replace(/\/hqdefault\.jpg$/, '/mqdefault.jpg');
        if (src) return { src };
        fallback ??= { platform: detectVideoPlatform(e.video.url) };
      } else if (e.kind !== 'episode' && e.cover) {
        return { src: e.cover };
      }
    }
  }
  const episode = entries.find(e => e.kind === 'episode');
  return fallback ?? (episode ? { chat: episode.tone, type: episode.episode.episode_type } : null);
}

export interface StripMonth { year: number; month: number; days: number }

/** 고를 수 있는 달: 첫 기록이 있는 달부터 이번 달(또는 마지막 기록 달 중 늦은 쪽)까지, 달마다 기록 있는 날 수. month는 1~12 */
export function monthStrip(days: Map<string, CalendarEntry[]>, today: string): StripMonth[] {
  const counts = new Map<string, number>();
  let first = today.slice(0, 7);
  let last = today.slice(0, 7);
  for (const date of days.keys()) {
    const ym = date.slice(0, 7);
    counts.set(ym, (counts.get(ym) ?? 0) + 1);
    if (ym < first) first = ym;
    if (ym > last) last = ym;
  }
  const result: StripMonth[] = [];
  let y = Number(first.slice(0, 4));
  let m = Number(first.slice(5, 7));
  const endY = Number(last.slice(0, 4));
  const endM = Number(last.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    result.push({ year: y, month: m, days: counts.get(`${y}-${String(m).padStart(2, '0')}`) ?? 0 });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return result;
}
