import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 자격증명과 어드민 비밀번호는 서버 전용이다. VITE_ 접두사를 붙이면 클라이언트 번들에 들어간다.
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, ADMIN_PASSWORD } = process.env;

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

function isAdmin(req: VercelRequest): boolean {
  const given = req.headers['x-admin-password'];
  if (!ADMIN_PASSWORD || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && key.length > 0 && !key.startsWith('/') && !key.includes('..');
}

/**
 * POST /api/r2
 * - { action: 'verify' }                     → 비밀번호 확인만
 * - { action: 'presign', key, contentType }  → 업로드용 presigned PUT URL (10분)
 * - { action: 'delete', key }                → 객체 삭제
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { action, key, contentType } = (req.body ?? {}) as Record<string, unknown>;

  try {
    if (action === 'verify') return res.status(200).json({ ok: true });

    if (!isValidKey(key)) return res.status(400).json({ error: 'Invalid key' });

    if (action === 'presign') {
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ...(typeof contentType === 'string' && contentType ? { ContentType: contentType } : {}),
      });
      const url = await getSignedUrl(r2, command, { expiresIn: 600 });
      return res.status(200).json({ url });
    }

    if (action === 'delete') {
      await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    console.error('[api/r2]', action, key, error);
    return res.status(500).json({ error: 'R2 request failed' });
  }
}
