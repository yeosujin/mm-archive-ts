/**
 * R2 버킷의 모든 영상 파일을 faststart로 remux하는 1회용 스크립트
 *
 * 동작:
 *  1. R2 버킷의 videos/ prefix 객체 목록 조회
 *  2. .mp4/.mov/.m4v 파일만 필터 (썸네일 jpg, .webm 스킵)
 *  3. 각 파일 다운로드 → 이미 faststart인지 atom 파싱으로 검사
 *  4. 아니면 ffmpeg로 -c copy -movflags +faststart remux
 *  5. 같은 키로 R2 업로드(덮어쓰기) — URL/DB 변경 없음
 *
 * 안전성:
 *  - 재인코딩 없음(-c copy) → 화질 손실 0
 *  - 멱등 — 이미 faststart면 스킵
 *  - 키 그대로 → 사이트 무중단
 *
 * 실행:
 *  npx tsx --env-file=.env.local scripts/remux-r2-videos.ts
 *  npx tsx --env-file=.env.local scripts/remux-r2-videos.ts --dry-run
 *  npx tsx --env-file=.env.local scripts/remux-r2-videos.ts --limit 5
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { open, mkdtemp, rm, stat as fsStat, writeFile } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';

const execFileAsync = promisify(execFile);

const ACCOUNT_ID = process.env.VITE_R2_ACCOUNT_ID;
const ACCESS_KEY = process.env.VITE_R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.VITE_R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.VITE_R2_BUCKET_NAME;

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !BUCKET) {
  console.error('❌ 환경변수 누락. .env.local 확인 필요:');
  console.error('   VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, VITE_R2_BUCKET_NAME');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

const VIDEO_EXTS = ['.mp4', '.mov', '.m4v'];

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

interface VideoObject {
  key: string;
  size: number;
}

async function listAllVideos(): Promise<VideoObject[]> {
  const result: VideoObject[] = [];
  let continuationToken: string | undefined = undefined;
  do {
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: 'videos/',
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key || obj.Size == null) continue;
      const lower = obj.Key.toLowerCase();
      if (!VIDEO_EXTS.some((ext) => lower.endsWith(ext))) continue;
      result.push({ key: obj.Key, size: obj.Size });
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return result;
}

/**
 * MP4/MOV top-level atom을 순회해서 moov가 mdat 앞에 있는지 검사
 */
async function isFastStart(filePath: string): Promise<boolean> {
  const fd = await open(filePath, 'r');
  try {
    const stat = await fd.stat();
    let offset = 0;
    const buf = Buffer.alloc(16);
    while (offset < stat.size) {
      const { bytesRead } = await fd.read(buf, 0, 16, offset);
      if (bytesRead < 8) break;
      let size = buf.readUInt32BE(0);
      const type = buf.toString('ascii', 4, 8);
      let headerSize = 8;
      if (size === 1) {
        // 64-bit size
        size = Number(buf.readBigUInt64BE(8));
        headerSize = 16;
      } else if (size === 0) {
        // 끝까지
        size = stat.size - offset;
      }
      if (type === 'moov') return true;
      if (type === 'mdat') return false;
      if (size < headerSize) break;
      offset += size;
    }
    return false;
  } finally {
    await fd.close();
  }
}

async function downloadObject(key: string, dest: string): Promise<void> {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`empty body: ${key}`);
  const stream = res.Body as Readable;
  await pipeline(stream, createWriteStream(dest));
}

async function uploadObject(key: string, src: string, contentType: string): Promise<void> {
  const upload = new Upload({
    client: r2,
    params: {
      Bucket: BUCKET,
      Key: key,
      Body: createReadStream(src),
      ContentType: contentType,
      StorageClass: 'STANDARD',
    },
  });
  await upload.done();
}

function guessContentType(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.m4v')) return 'video/x-m4v';
  return 'application/octet-stream';
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)}MB`;
  return `${(mb / 1024).toFixed(2)}GB`;
}

async function main() {
  console.log(`🔍 R2 버킷 '${BUCKET}' 영상 목록 조회 중...`);
  if (DRY_RUN) console.log('   (DRY RUN — 실제 업로드 안 함)');
  if (LIMIT !== Infinity) console.log(`   (LIMIT ${LIMIT}개)`);

  const videos = await listAllVideos();
  console.log(`📦 총 ${videos.length}개 영상 파일 발견`);

  const targets = videos.slice(0, LIMIT);
  const tmpDir = await mkdtemp(join(tmpdir(), 'r2-remux-'));
  console.log(`📁 임시 디렉토리: ${tmpDir}\n`);

  const stats = {
    total: targets.length,
    skipped: 0,
    remuxed: 0,
    failed: 0,
    bytesProcessed: 0,
  };

  const failedLog: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    const { key, size } = targets[i];
    const idx = `[${i + 1}/${targets.length}]`;
    const ext = key.slice(key.lastIndexOf('.'));
    const inPath = join(tmpDir, `in${ext}`);
    const outPath = join(tmpDir, `out${ext}`);

    try {
      console.log(`${idx} ${key} (${formatSize(size)})`);

      // 1. 다운로드
      process.stdout.write('   ⬇  다운로드 중... ');
      await downloadObject(key, inPath);
      console.log('완료');

      // 2. faststart 검사
      const already = await isFastStart(inPath);
      if (already) {
        console.log('   ✅ 이미 faststart, 스킵');
        stats.skipped++;
        await rm(inPath, { force: true });
        continue;
      }

      // 3. ffmpeg remux
      process.stdout.write('   🔧 remux 중... ');
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', inPath,
        '-c', 'copy',
        '-movflags', '+faststart',
        outPath,
      ], { maxBuffer: 100 * 1024 * 1024 });
      console.log('완료');

      // 검증
      const reFast = await isFastStart(outPath);
      if (!reFast) {
        throw new Error('remux 결과 파일이 여전히 faststart 아님');
      }
      const outStat = await fsStat(outPath);

      // 4. 업로드 (덮어쓰기)
      if (DRY_RUN) {
        console.log(`   ⏭  DRY RUN — 업로드 건너뜀 (out: ${formatSize(outStat.size)})`);
      } else {
        process.stdout.write(`   ⬆  업로드 중... `);
        await uploadObject(key, outPath, guessContentType(key));
        console.log('완료');
      }

      stats.remuxed++;
      stats.bytesProcessed += size;
    } catch (err) {
      stats.failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ❌ 실패: ${msg}`);
      failedLog.push(`${key}\t${msg}`);
    } finally {
      await rm(inPath, { force: true });
      await rm(outPath, { force: true });
    }
    console.log();
  }

  await rm(tmpDir, { recursive: true, force: true });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 결과');
  console.log(`   총 처리: ${stats.total}`);
  console.log(`   ✅ remux: ${stats.remuxed}`);
  console.log(`   ⏭  스킵 (이미 faststart): ${stats.skipped}`);
  console.log(`   ❌ 실패: ${stats.failed}`);
  console.log(`   처리량: ${formatSize(stats.bytesProcessed)}`);

  if (failedLog.length > 0) {
    const failedPath = join(process.cwd(), 'remux-failed.log');
    await writeFile(failedPath, failedLog.join('\n') + '\n');
    console.log(`   실패 로그: ${failedPath}`);
  }
}

main().catch((err) => {
  console.error('💥 치명적 오류:', err);
  process.exit(1);
});
