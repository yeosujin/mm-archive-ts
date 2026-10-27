/**
 * R2 영상(모먼트·포스트)을 가벼운 H.264 mp4로 변환한다. 매시간 Actions에서도 돈다.
 *
 * 동작:
 *  1. DB에서 original_url이 비어 있는 R2 영상을 고른다 (moments 페이지 단위, posts.media[])
 *  2. 다운로드 → ffmpeg 변환 → videos/t/{basename}.mp4 로 업로드 (원본 객체는 그대로 둔다)
 *  3. 썸네일이 비어 있으면 0.5초 프레임을 jpg로 올린다
 *  4. DB: tweet_url/url ← 변환본, original_url ← 원래 주소
 *
 * 안전성:
 *  - 멱등 — original_url이 채워진 행은 건너뛴다. 중간에 죽어도 다시 돌리면 된다
 *  - DB 갱신은 tweet_url이 그대로일 때만 (그 사이 어드민이 영상을 바꿨으면 손대지 않는다)
 *  - 롤백 — tweet_url ← original_url 로 되돌리면 끝
 *
 * 실행:
 *  NODE_OPTIONS=--use-system-ca npx tsx --env-file=.env.local scripts/transcode-r2-videos.ts --dry-run --limit 3
 *  NODE_OPTIONS=--use-system-ca npx tsx --env-file=.env.local scripts/transcode-r2-videos.ts --limit 5
 *  옵션: --dry-run(업로드·DB 변경 없음) --limit N --encoder libx264|videotoolbox
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createClient } from '@supabase/supabase-js';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { urlToKey } from './dailyTweet/r2';
import { isR2Url } from './dailyTweet/normalize';
import {
  type Encoder,
  transcodedKey,
  thumbKey,
  buildTranscodeArgs,
  buildThumbArgs,
  decideResult,
  pendingPostVideoIndexes,
} from './transcode/plan';

const execFileAsync = promisify(execFile);

const {
  VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_BUCKET_NAME, VITE_R2_PUBLIC_URL,
  VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!VITE_R2_ACCOUNT_ID || !VITE_R2_ACCESS_KEY_ID || !VITE_R2_SECRET_ACCESS_KEY || !VITE_R2_BUCKET_NAME || !VITE_R2_PUBLIC_URL
  || !VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경변수 누락: VITE_R2_*(5종), VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
if (!(LIMIT === Infinity || (Number.isInteger(LIMIT) && LIMIT > 0))) {
  console.error('❌ --limit 값은 양의 정수여야 합니다');
  process.exit(1);
}
// 한 번 실행에서 실패가 이만큼 쌓이면 멈춘다 (영구 실패 파일이 시간을 다 쓰지 않도록)
const MAX_FAILURES = 10;
const encIdx = args.indexOf('--encoder');
const ENCODER: Encoder = encIdx >= 0
  ? (args[encIdx + 1] as Encoder)
  : process.platform === 'darwin' ? 'videotoolbox' : 'libx264';

const PUBLIC = VITE_R2_PUBLIC_URL.replace(/\/$/, '');
const BUCKET = VITE_R2_BUCKET_NAME;

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: VITE_R2_ACCESS_KEY_ID, secretAccessKey: VITE_R2_SECRET_ACCESS_KEY },
});
const sb = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Converted {
  url: string;          // 최종 재생 URL (변환본 또는 원본 유지)
  thumbnailUrl?: string; // 새로 만든 썸네일 (요청했을 때만)
  note: string;
}

async function download(key: string, dest: string): Promise<void> {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`empty body: ${key}`);
  await pipeline(res.Body as Readable, createWriteStream(dest));
}

async function upload(key: string, src: string, contentType: string): Promise<void> {
  await new Upload({
    client: r2,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: createReadStream(src),
      ContentType: contentType,
      // 새 키에만 쓰고 덮어쓰지 않으므로 오래 캐시해도 안전하다
      CacheControl: 'public, max-age=31536000, immutable',
    },
  }).done();
}

/** 영상 하나 변환. 업로드까지 하고 최종 URL을 돌려준다 (DB는 호출 쪽에서) */
async function convert(tmp: string, url: string, needThumb: boolean): Promise<Converted> {
  const key = urlToKey(url, PUBLIC);
  const inPath = join(tmp, 'in' + key.slice(key.lastIndexOf('.')));
  const outPath = join(tmp, 'out.mp4');
  const thumbPath = join(tmp, 'thumb.jpg');
  try {
    await download(key, inPath);
    await execFileAsync('ffmpeg', buildTranscodeArgs(inPath, outPath, ENCODER), { maxBuffer: 100 * 1024 * 1024 });
    const inSize = (await stat(inPath)).size;
    const outSize = (await stat(outPath)).size;
    const result = decideResult(key, inSize, outSize);
    const newKey = transcodedKey(key);
    const finalUrl = result === 'use-transcoded' ? `${PUBLIC}/${newKey}` : url;
    const note = `${(inSize / 1048576).toFixed(1)}MB → ${(outSize / 1048576).toFixed(1)}MB ${result}`;

    let thumbnailUrl: string | undefined;
    if (needThumb) {
      // 0.5초보다 짧은 클립은 프레임이 없어 실패하므로 0초로 한 번 더 시도한다. 썸네일 실패는 변환 실패가 아니다
      for (const seek of ['0.5', '0']) {
        try {
          await execFileAsync('ffmpeg', buildThumbArgs(outPath, thumbPath, seek));
          await stat(thumbPath);
          thumbnailUrl = `${PUBLIC}/${thumbKey(newKey)}`;
          break;
        } catch {
          await rm(thumbPath, { force: true });
        }
      }
      if (!thumbnailUrl) console.warn(`   ⚠️ 썸네일 생성 실패 — 건너뜀: ${url}`);
    }

    if (!DRY_RUN) {
      if (result === 'use-transcoded') await upload(newKey, outPath, 'video/mp4');
      if (thumbnailUrl) await upload(thumbKey(newKey), thumbPath, 'image/jpeg');
    }
    return { url: finalUrl, thumbnailUrl, note };
  } finally {
    await Promise.all([inPath, outPath, thumbPath].map(p => rm(p, { force: true })));
  }
}

interface MomentRow { id: string; tweet_url: string; thumbnail_url: string | null }

async function pendingMoments(): Promise<MomentRow[]> {
  const rows: MomentRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('moments')
      .select('id,tweet_url,thumbnail_url')
      .is('original_url', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data.filter(r => isR2Url(r.tweet_url, PUBLIC)));
    if (data.length < 1000) return rows;
  }
}

interface MediaRow { type: 'image' | 'video'; url: string; thumbnail?: string; original_url?: string }
interface PostRow { id: string; media: MediaRow[] | null }

async function pendingPosts(): Promise<PostRow[]> {
  const rows: PostRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('posts')
      .select('id,media')
      .not('media', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data as PostRow[]).filter(p => pendingPostVideoIndexes(p.media, PUBLIC).length > 0));
    if (data.length < 1000) return rows;
  }
}

async function main() {
  console.log(`🎬 트랜스코딩 (encoder=${ENCODER}${DRY_RUN ? ', DRY RUN' : ''}${LIMIT !== Infinity ? `, LIMIT ${LIMIT}` : ''})`);
  const tmp = await mkdtemp(join(tmpdir(), 'r2-transcode-'));
  const stats = { done: 0, failed: 0 };
  let budget = LIMIT; // 성공한 변환만 차감한다

  const moments = await pendingMoments();
  console.log(`📦 대기 모먼트 ${moments.length}개`);
  for (const m of moments) {
    if (budget <= 0) break;
    if (stats.failed >= MAX_FAILURES) { console.log(`⛔ 실패 ${MAX_FAILURES}건 — 중단`); break; }
    try {
      const c = await convert(tmp, m.tweet_url, !m.thumbnail_url);
      console.log(`   ✅ moment ${m.id} ${c.note}${c.thumbnailUrl ? ' +thumb' : ''}`);
      if (!DRY_RUN) {
        const { data, error } = await sb.from('moments')
          .update({
            tweet_url: c.url,
            original_url: m.tweet_url,
            ...(c.thumbnailUrl ? { thumbnail_url: c.thumbnailUrl } : {}),
          })
          .eq('id', m.id)
          .eq('tweet_url', m.tweet_url)
          .is('original_url', null)
          .select('id');
        if (error) throw error;
        if (!data || data.length === 0) {
          console.warn(`   ⚠️ moment ${m.id} 그 사이 변경됨 — 건너뜀`);
          continue;
        }
      }
      budget--;
      stats.done++;
    } catch (err) {
      stats.failed++;
      console.error(`   ❌ moment ${m.id} ${m.tweet_url}: ${err instanceof Error ? err.message : err}`);
    }
  }

  const posts = await pendingPosts();
  console.log(`📦 대기 포스트 ${posts.length}개`);
  for (const p of posts) {
    if (budget <= 0) break;
    if (stats.failed >= MAX_FAILURES) { console.log(`⛔ 실패 ${MAX_FAILURES}건 — 중단`); break; }
    const media = p.media ?? [];
    const converted = new Map<number, { item: MediaRow; c: Converted }>();
    for (const i of pendingPostVideoIndexes(media, PUBLIC)) {
      if (budget <= 0) break;
      if (stats.failed >= MAX_FAILURES) break;
      try {
        const item = media[i];
        const c = await convert(tmp, item.url, !item.thumbnail);
        console.log(`   ✅ post ${p.id}[${i}] ${c.note}${c.thumbnailUrl ? ' +thumb' : ''}`);
        converted.set(i, { item, c });
        budget--;
        stats.done++;
      } catch (err) {
        stats.failed++;
        console.error(`   ❌ post ${p.id}[${i}]: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (converted.size > 0 && !DRY_RUN) {
      // 변환하는 동안 어드민이 수정했을 수 있으니 최신 media를 다시 읽어 url이 같은 항목만 반영한다
      const { data: fresh, error: readErr } = await sb.from('posts').select('media').eq('id', p.id).single();
      if (readErr) {
        stats.failed++;
        console.error(`   ❌ post ${p.id} 재조회 실패: ${readErr.message}`);
        continue;
      }
      const current = [...((fresh?.media as MediaRow[] | null) ?? [])];
      let changed = false;
      for (const [i, { item, c }] of converted) {
        if (current[i]?.url !== item.url) {
          console.warn(`   ⚠️ post ${p.id}[${i}] 그 사이 변경됨 — 건너뜀`);
          continue;
        }
        current[i] = { ...current[i], url: c.url, original_url: item.url, ...(c.thumbnailUrl ? { thumbnail: c.thumbnailUrl } : {}) };
        changed = true;
      }
      if (changed) {
        const { error } = await sb.from('posts').update({ media: current }).eq('id', p.id);
        if (error) {
          stats.failed++;
          console.error(`   ❌ post ${p.id} DB 갱신 실패: ${error.message}`);
        }
      }
    }
  }

  await rm(tmp, { recursive: true, force: true });
  console.log(`📊 완료 ${stats.done} · 실패 ${stats.failed}`);
  if (stats.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('💥 치명적 오류:', err);
  process.exit(1);
});
