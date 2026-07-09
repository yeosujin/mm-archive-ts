/**
 * 기존 Photos / Posts.media 이미지에 ThumbHash를 백필합니다.
 *
 * 실행:
 *   npx tsx scripts/backfill-thumb-hash.ts
 *
 * 환경변수 (.env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * 동작:
 *   1. photos 테이블에서 thumb_hash IS NULL인 행 조회
 *   2. posts 테이블에서 media JSONB 전체 조회 후 thumb_hash 없는 image 항목만 추림
 *   3. 각 이미지 URL을 다운로드 → sharp로 100px 축소 → rgbaToThumbHash → base64
 *   4. DB 업데이트
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { rgbaToThumbHash } from 'thumbhash';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function encodeThumbHashFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());

    const { data, info } = await sharp(buf)
      .resize(100, 100, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const hash = rgbaToThumbHash(info.width, info.height, new Uint8Array(data));
    return Buffer.from(hash).toString('base64');
  } catch (err) {
    console.warn(`  ✗ encode 실패 (${url}):`, (err as Error).message);
    return null;
  }
}

async function backfillPhotos() {
  console.log('\n=== Photos 백필 ===');
  const { data, error } = await supabase
    .from('photos')
    .select('id, thumbnail_url, image_url')
    .is('thumb_hash', null);

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('백필할 사진이 없습니다.');
    return;
  }

  console.log(`대상: ${data.length}장`);
  let ok = 0;
  let fail = 0;

  for (const photo of data) {
    const src = photo.thumbnail_url || photo.image_url;
    if (!src) { fail++; continue; }

    const hash = await encodeThumbHashFromUrl(src);
    if (!hash) { fail++; continue; }

    const { error: updateError } = await supabase
      .from('photos')
      .update({ thumb_hash: hash })
      .eq('id', photo.id);

    if (updateError) {
      console.warn(`  ✗ DB 업데이트 실패 (${photo.id}):`, updateError.message);
      fail++;
    } else {
      ok++;
      if (ok % 10 === 0) console.log(`  진행: ${ok}/${data.length}`);
    }
  }

  console.log(`완료: 성공 ${ok}장, 실패 ${fail}장`);
}

interface PostMediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
  thumb_hash?: string;
}

async function backfillPosts() {
  console.log('\n=== Posts.media 백필 ===');
  const { data, error } = await supabase
    .from('posts')
    .select('id, media')
    .not('media', 'is', null);

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('백필할 포스트가 없습니다.');
    return;
  }

  const targets = data.filter((post) => {
    const media = post.media as PostMediaItem[] | null;
    return media?.some((m) => m.type === 'image' && !m.thumb_hash);
  });

  console.log(`대상: ${targets.length}개 포스트`);
  let ok = 0;
  let fail = 0;

  for (const post of targets) {
    const media = post.media as PostMediaItem[];
    const updated: PostMediaItem[] = [];
    let changed = false;

    for (const item of media) {
      if (item.type !== 'image' || item.thumb_hash) {
        updated.push(item);
        continue;
      }
      const hash = await encodeThumbHashFromUrl(item.url);
      if (hash) {
        updated.push({ ...item, thumb_hash: hash });
        changed = true;
      } else {
        updated.push(item);
        fail++;
      }
    }

    if (changed) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ media: updated })
        .eq('id', post.id);

      if (updateError) {
        console.warn(`  ✗ DB 업데이트 실패 (${post.id}):`, updateError.message);
        fail++;
      } else {
        ok++;
        if (ok % 10 === 0) console.log(`  진행: ${ok}/${targets.length}`);
      }
    }
  }

  console.log(`완료: 성공 ${ok}개 포스트, 실패 ${fail}건`);
}

async function main() {
  await backfillPhotos();
  await backfillPosts();
  console.log('\n전체 백필 완료');
}

main().catch((err) => {
  console.error('치명적 오류:', err);
  process.exit(1);
});
