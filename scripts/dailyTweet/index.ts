import 'dotenv/config';
import { filterOnThisDay } from '../../src/lib/dailyPick';
import type { Moment, Photo, Post, Video } from '../../src/lib/database';
import { getKstDateString } from './date';
import { normalizeMoments, normalizePhotos, normalizePosts, isR2Url } from './normalize';
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
  // 사진·포스트는 자체 날짜 기준, 모먼트는 상위 영상 날짜 기준(normalizeMoments 내부에서 처리)
  const fPhotos = filterOnThisDay(photos, runDate);
  const fPosts = filterOnThisDay(posts, runDate);

  const videosById = new Map(videos.map(v => [v.id, v]));
  const r2Public = process.env.VITE_R2_PUBLIC_URL!;

  const momentItems = normalizeMoments(moments, videosById, r2Public, runDate);
  const photoItems = normalizePhotos(fPhotos, r2Public);
  const postItems = normalizePosts(fPosts, r2Public);
  const items = [...momentItems, ...photoItems, ...postItems];
  const tweets = planTweets(items);

  console.log(`[bot] 계획된 트윗 ${tweets.length}개:`);
  tweets.forEach((t, i) => console.log(`  ${i + 1}. "${t.text}" (${t.mediaUrls.length}개 미디어)`));

  if (DRY_RUN) {
    // 진단: 그해 오늘로 매칭된 원본을 종류별로, R2 여부까지 출력.
    // 영상(Videos)은 봇 제외 대상이지만 "왜 안 올라갔는지" 확인용으로 함께 표시.
    const fVideos = filterOnThisDay(videos, runDate);
    console.log('[dry] --- 그해 오늘 매칭 (R2=업로드 가능 여부) ---');
    console.log(`[dry] moments(순간, 상위영상 날짜 반영): ${momentItems.length}건`);
    momentItems.forEach(it =>
      console.log(`   - ${it.date} | "${it.text}" | ${it.url}`));
    console.log(`[dry] photos(사진): ${fPhotos.length}건`);
    fPhotos.forEach(p =>
      console.log(`   - ${p.date} | ${p.title || '(제목없음)'} | R2=${isR2Url(p.image_url, r2Public)}`));
    console.log(`[dry] posts(포스트): ${fPosts.length}건`);
    fPosts.forEach(p => {
      const media = p.media ?? [];
      const r2count = media.filter(mm => isR2Url(mm.url, r2Public)).length;
      console.log(`   - ${p.date} | ${p.title || '(제목없음)'} | 미디어 ${media.length}개(R2 ${r2count}개) | platform=${p.platform}`);
    });
    console.log(`[dry] videos(영상=봇 제외대상): ${fVideos.length}건`);
    fVideos.forEach(v =>
      console.log(`   - ${v.date} | ${v.title || '(제목없음)'} | ${v.url}`));
    console.log('[dry] --- 매칭된 영상별 연결 순간(하위 모먼트) ---');
    fVideos.forEach(v => {
      const linked = moments.filter(m => m.video_id === v.id);
      console.log(`   [영상] ${v.date} | ${(v.title || '').slice(0, 25)} (id=${v.id}) → 연결 순간 ${linked.length}개`);
      linked.forEach(m =>
        console.log(`       · ${m.date} | ${m.title || '(제목없음)'} | R2=${isR2Url(m.tweet_url, r2Public)} | ${m.tweet_url}`));
    });
    console.log('[dry] ------------------------------------');
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

  if (posted.length > 0) {
    await recordRun(sb, runDate, posted.length);
    console.log('[bot] tweet_bot_log 기록 완료');
  } else {
    console.log('[bot] 게시된 트윗 없음 → 로그 미기록(재시도 가능)');
  }
}

main().catch(err => {
  console.error('[bot] 실패:', err);
  process.exit(1);
});
