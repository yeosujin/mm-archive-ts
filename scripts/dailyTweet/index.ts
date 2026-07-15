import 'dotenv/config';
import { filterOnThisDay } from '../../src/lib/dailyPick';
import type { Moment, Photo, Post, Video } from '../../src/lib/database';
import { getKstDateString } from './date';
import { normalizeMoments, normalizePhotos, normalizePosts } from './normalize';
import { planTweets } from './group';
import { mimeFromUrl } from './mime';
import { makeR2Client, urlToKey, downloadFromR2 } from './r2';
import { makeXClient, uploadMedia, postThread, type PreparedTweet } from './x';
import { makeSupabase, alreadyPosted, recordRun } from './dedup';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const runDate = getKstDateString();
  console.log(`[bot] 실행일(KST)=${runDate}${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const sb = makeSupabase();

  if (!DRY_RUN && (await alreadyPosted(sb, runDate))) {
    console.log('[bot] 이미 오늘 게시함 → 스킵');
    return;
  }

  // 콘텐츠 조회
  const [momentsRes, photosRes, postsRes, videosRes] = await Promise.all([
    sb.from('moments').select('*'),
    sb.from('photos').select('*'),
    sb.from('posts').select('*'),
    sb.from('videos').select('*'),
  ]);
  for (const r of [momentsRes, photosRes, postsRes, videosRes]) {
    if (r.error) throw r.error;
  }
  const moments = (momentsRes.data ?? []) as Moment[];
  const photos = (photosRes.data ?? []) as Photo[];
  const posts = (postsRes.data ?? []) as Post[];
  const videos = (videosRes.data ?? []) as Video[];

  // 그해 오늘 필터 (KST)
  const fMoments = filterOnThisDay(moments, runDate);
  const fPhotos = filterOnThisDay(photos, runDate);
  const fPosts = filterOnThisDay(posts, runDate);

  const videosById = new Map(videos.map(v => [v.id, v]));
  const r2Public = process.env.VITE_R2_PUBLIC_URL!;

  const items = [
    ...normalizeMoments(fMoments, videosById, r2Public),
    ...normalizePhotos(fPhotos, r2Public),
    ...normalizePosts(fPosts, r2Public),
  ];
  const tweets = planTweets(items);

  console.log(`[bot] 계획된 트윗 ${tweets.length}개:`);
  tweets.forEach((t, i) => console.log(`  ${i + 1}. "${t.text}" (${t.mediaUrls.length}개 미디어)`));

  if (DRY_RUN) {
    console.log('[bot] DRY RUN 종료 (게시 안 함)');
    return;
  }
  if (tweets.length === 0) {
    console.log('[bot] 오늘 게시할 콘텐츠 없음');
    return;
  }

  // 미디어 다운로드 + 업로드
  const r2 = makeR2Client();
  const x = makeXClient();
  const bucket = process.env.VITE_R2_BUCKET_NAME!;

  const prepared: PreparedTweet[] = [];
  for (const tw of tweets) {
    const mediaIds: string[] = [];
    for (const url of tw.mediaUrls) {
      try {
        const buf = await downloadFromR2(r2, bucket, urlToKey(url, r2Public));
        const id = await uploadMedia(x, buf, mimeFromUrl(url));
        mediaIds.push(id);
      } catch (e) {
        console.error(`[bot] 미디어 스킵: ${url}`, e);
      }
    }
    if (mediaIds.length > 0) prepared.push({ text: tw.text, mediaIds });
  }

  if (prepared.length === 0) {
    console.log('[bot] 업로드 성공한 미디어 없음 → 게시 안 함');
    return;
  }

  const posted = await postThread(x, prepared);
  console.log(`[bot] ${posted.length}개 트윗 게시 완료`);

  await recordRun(sb, runDate, posted.length);
  console.log('[bot] tweet_bot_log 기록 완료');
}

main().catch(err => {
  console.error('[bot] 실패:', err);
  process.exit(1);
});
