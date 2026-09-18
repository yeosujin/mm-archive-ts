import 'dotenv/config';
import { filterOnThisDay } from '../../src/lib/dailyPick';
import type { Episode, Moment, Photo, Post, Video } from '../../src/lib/database';
import { getKstDateString, msUntilKstMidnight } from './date';
import {
  normalizeMoments,
  normalizePhotos,
  normalizePosts,
  normalizeEpisodes,
  isR2Url,
} from './normalize';
import { planTweets } from './group';
import { mimeFromUrl } from './mime';
import { makeR2Client, urlToKey, downloadFromR2 } from './r2';
import {
  makeXClient,
  uploadMedia,
  postThread,
  tweetUrl,
  describeError,
  type PreparedTweet,
} from './x';
import { makeSupabase, alreadyPosted, recordRun } from './dedup';
import { fetchAllRows } from './fetch';
import {
  notifyDiscord,
  notifyDiscordAlert,
  buildFailureSummary,
  buildCrashSummary,
} from './notify';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force'); // 중복 방지(tweet_bot_log) 무시하고 재게시

// cron은 KST 21:50에 트리거된다. GitHub 스케줄 디스패치는 이 저장소에서 상습적으로 60~90분
// 밀려(실측), 자정 직전 트리거로는 새벽 1시 넘어 게시됐다. 그래서 자정 2시간여 전에 트리거만
// 걸어두고, 스케줄 실행이면 KST 자정까지 대기했다가 게시한다(runDate가 전날이 되는 것도 함께 막는다).
// 대기값이 비정상적으로 크면(=이미 자정을 넘겨 시작) 지연이 버퍼를 초과한 것이므로 즉시 게시한다.
const MAX_WAIT_MS = 3 * 60 * 60 * 1000;

async function waitForKstMidnight() {
  // 스케줄 실행만 대기. 수동(workflow_dispatch)·로컬 실행은 즉시 진행한다.
  if (process.env.GITHUB_EVENT_NAME !== 'schedule') return;
  const wait = msUntilKstMidnight();
  if (wait === 0 || wait > MAX_WAIT_MS) return;
  console.log(`[bot] KST 자정까지 ${Math.ceil(wait / 1000)}초 대기`);
  await new Promise(resolve => setTimeout(resolve, wait));
}

async function main() {
  if (!DRY_RUN) await waitForKstMidnight();

  const runDate = getKstDateString();
  console.log(`[bot] 실행일(KST)=${runDate}${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const sb = makeSupabase();

  if (!DRY_RUN && !FORCE && (await alreadyPosted(sb, runDate))) {
    console.log('[bot] 이미 오늘 게시함 → 스킵 (재게시하려면 --force)');
    return;
  }
  if (FORCE && !DRY_RUN) {
    console.log('[bot] --force: 중복 방지 무시하고 재게시 (기존 게시분과 중복될 수 있음)');
  }

  // 콘텐츠 조회 (Supabase 기본 1000행 제한 회피: 전체 페이지네이션)
  const [moments, photos, posts, videos, episodes] = await Promise.all([
    fetchAllRows<Moment>(sb, 'moments'),
    fetchAllRows<Photo>(sb, 'photos'),
    fetchAllRows<Post>(sb, 'posts'),
    fetchAllRows<Video>(sb, 'videos'),
    fetchAllRows<Episode>(sb, 'episodes'),
  ]);

  // 그해 오늘 필터 (KST)
  // 사진·포스트·에피소드는 자체 날짜 기준, 모먼트는 상위 영상 날짜 기준(normalizeMoments 내부에서 처리)
  const fPhotos = filterOnThisDay(photos, runDate);
  const fPosts = filterOnThisDay(posts, runDate);
  const fEpisodes = filterOnThisDay(episodes, runDate);

  const videosById = new Map(videos.map(v => [v.id, v]));
  const r2Public = process.env.VITE_R2_PUBLIC_URL!;

  const momentItems = normalizeMoments(moments, videosById, r2Public, runDate);
  const photoItems = normalizePhotos(fPhotos, r2Public);
  const postItems = normalizePosts(fPosts, r2Public);
  const episodeItems = normalizeEpisodes(fEpisodes, r2Public);
  const items = [...momentItems, ...photoItems, ...postItems, ...episodeItems];
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
    console.log(`[dry] episodes(에피소드, 트윗 이미지 첨부된 것만): ${fEpisodes.length}건`);
    fEpisodes.forEach(ep => {
      const imgs = ep.tweet_images ?? [];
      const r2count = imgs.filter(u => isR2Url(u, r2Public)).length;
      console.log(`   - ${ep.date} | ${ep.title || ep.comment_text || '(제목없음)'} | ${ep.episode_type} | 트윗 이미지 ${imgs.length}장(R2 ${r2count}장)`);
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
  const mediaFailures: string[] = [];
  for (const tw of tweets) {
    const mediaIds: string[] = [];
    for (const url of tw.mediaUrls) {
      try {
        const buf = await downloadFromR2(r2, bucket, urlToKey(url, r2Public));
        const id = await uploadMedia(x, buf, mimeFromUrl(url));
        mediaIds.push(id);
      } catch (e) {
        mediaFailures.push(describeError(e));
        console.error(`[bot] 미디어 스킵: ${url}`, e);
      }
    }
    if (mediaIds.length > 0) prepared.push({ text: tw.text, mediaIds, groupKey: tw.groupKey });
  }

  if (prepared.length === 0) {
    console.log('[bot] 업로드 성공한 미디어 없음 → 게시 안 함');
    // 미디어 업로드가 전멸하면 게시가 통째로 누락된다. 반드시 알린다.
    await notifyDiscordAlert(
      buildFailureSummary(runDate, tweets.length, 0, mediaFailures),
    );
    return;
  }

  const { ids: posted, failures } = await postThread(x, prepared);
  console.log(`[bot] ${posted.length}개 트윗 게시 완료`);
  // 계획 대비 실제 게시 수가 다르면 로그와 디스코드 양쪽에 남긴다.
  if (posted.length !== prepared.length) {
    console.warn(`[bot] ⚠️ 계획 ${prepared.length}개 중 ${posted.length}개만 게시됨`);
    await notifyDiscordAlert(
      buildFailureSummary(runDate, prepared.length, posted.length, [
        ...failures,
        ...mediaFailures,
      ]),
    );
  }

  if (posted.length > 0) {
    await recordRun(sb, runDate, posted.length);
    console.log('[bot] tweet_bot_log 기록 완료');
    await notifyDiscord(posted.length, prepared.map(p => p.text), posted.map(tweetUrl));
  } else {
    console.log('[bot] 게시된 트윗 없음 → 로그 미기록(재시도 가능)');
  }
}

main().catch(async err => {
  console.error('[bot] 실패:', err);
  // 예외로 죽으면 여기까지 오는데, 알리지 않으면 GitHub Actions를 직접 봐야만 안다.
  // (실제로 X 인증 만료(401)로 봇이 죽었을 때 아무 연락이 없었다)
  try {
    await notifyDiscordAlert(buildCrashSummary(getKstDateString(), describeError(err)));
  } catch {
    /* 알림 실패가 종료를 막지 않게 한다 */
  }
  process.exit(1);
});
