import type {
  Video,
  Moment,
  Post,
  Photo,
  PlannedThread,
  PlannedTweet,
  PlannedMedia,
} from './types';
import { MAX_MEDIA_PER_TWEET } from './constants';
import { toYYMMDD } from './dates';
import { isR2Url } from './media';

// 배열을 size 개씩 끊는다. chunk([1..11], 4) → [[4],[4],[3]]
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// 미디어 배열 → 트윗 배열 (4개씩 스레드). 각 트윗 본문은 동일한 caption.
function mediaToTweets(media: PlannedMedia[], caption: string): PlannedTweet[] {
  return chunk(media, MAX_MEDIA_PER_TWEET).map((group) => ({
    text: caption,
    media: group,
  }));
}

export interface OnThisDayContent {
  // 모먼트: 영상 출처(video)별로 이미 그룹핑됨. 출처 순서 = 배열 순서.
  momentGroups: { video: Video; moments: Moment[] }[];
  photos: Photo[];
  posts: Post[];
}

export interface BuildOptions {
  r2PublicUrl: string;
  // 본문 접두 날짜. 기본은 오늘(YYMMDD).
  yymmdd: string;
}

/**
 * "그 해 오늘" 콘텐츠 → 게시할 스레드 목록.
 *
 * 규칙(확정 스펙):
 *  - 순서: 모먼트 → 사진 → 포스트
 *  - 스레드는 전부 나눔:
 *      · 모먼트: 영상 출처마다 독립 스레드 (R2 영상 파일만)
 *      · 사진: 전체를 하나의 스레드
 *      · 포스트: 포스트마다 독립 스레드
 *  - 각 스레드 안에서 미디어는 4개씩 (4+4+3…)
 *  - 본문: 모먼트=`YYMMDD 플랫폼`, 사진=`YYMMDD #태그`, 포스트=`YYMMDD 제목`
 *  - 본문에 URL 없음 (X URL 과금 회피)
 */
export function buildThreads(content: OnThisDayContent, opts: BuildOptions): PlannedThread[] {
  const threads: PlannedThread[] = [];
  const { r2PublicUrl, yymmdd } = opts;

  // 1) 모먼트 — 영상 출처별 독립 스레드, R2 영상만
  for (const { video, moments } of content.momentGroups) {
    const media: PlannedMedia[] = moments
      .filter((m) => isR2Url(m.tweet_url, r2PublicUrl))
      .map((m) => ({ url: m.tweet_url, kind: 'video' as const }));
    if (media.length === 0) continue; // 올릴 R2 영상이 없으면 이 출처는 건너뜀

    const platform = video.platform_name?.trim() || video.channel_name?.trim() || '';
    const caption = [yymmdd, platform].filter(Boolean).join(' ');
    threads.push({
      label: `moment:${platform || video.id}`,
      tweets: mediaToTweets(media, caption),
    });
  }

  // 2) 사진 — 전체를 하나의 스레드. 각 트윗 caption = 날짜 + 그 트윗에 담긴 사진들의 태그 합집합
  const r2Photos = content.photos.filter((p) => isR2Url(p.image_url, r2PublicUrl));
  if (r2Photos.length > 0) {
    const tweets: PlannedTweet[] = chunk(r2Photos, MAX_MEDIA_PER_TWEET).map((photos) => {
      const tags = uniqueTags(photos);
      const caption = [yymmdd, ...tags.map((t) => `#${t}`)].filter(Boolean).join(' ');
      return {
        text: caption,
        media: photos.map((p) => ({ url: p.image_url, kind: 'image' as const })),
      };
    });
    threads.push({ label: 'photos', tweets });
  }

  // 3) 포스트 — 포스트마다 독립 스레드, R2 미디어만
  for (const post of content.posts) {
    const media: PlannedMedia[] = (post.media ?? [])
      .filter((m) => isR2Url(m.url, r2PublicUrl))
      .map((m): PlannedMedia => ({ url: m.url, kind: m.type === 'video' ? 'video' : 'image' }));
    if (media.length === 0) continue;

    const caption = [yymmdd, post.title?.trim()].filter(Boolean).join(' ');
    threads.push({
      label: `post:${post.title || post.id}`,
      tweets: mediaToTweets(media, caption),
    });
  }

  return threads;
}

function uniqueTags(photos: Photo[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of photos) {
    for (const raw of p.tags ?? []) {
      const t = raw.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out;
}

// caption 미리보기(로그용)
export function summarize(threads: PlannedThread[]): string {
  if (threads.length === 0) return '(게시할 콘텐츠 없음)';
  const lines: string[] = [];
  for (const t of threads) {
    lines.push(`▸ [${t.label}] 트윗 ${t.tweets.length}개`);
    t.tweets.forEach((tw, i) => {
      const kinds = tw.media.map((m) => m.kind).join(',');
      lines.push(`   ${i + 1}. "${tw.text}"  (미디어 ${tw.media.length}: ${kinds})`);
    });
  }
  return lines.join('\n');
}

// re-export (yymmdd 계산 편의)
export { toYYMMDD };
