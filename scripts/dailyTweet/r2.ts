import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export function makeR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.VITE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.VITE_R2_SECRET_ACCESS_KEY!,
    },
  });
}

// R2 퍼블릭 URL -> 버킷 키
export function urlToKey(url: string, r2PublicUrl: string): string {
  const base = r2PublicUrl.replace(/\/$/, '');
  if (url.startsWith(base)) return url.slice(base.length).replace(/^\/+/, '');
  return new URL(url).pathname.replace(/^\/+/, '');
}

export async function downloadFromR2(client: S3Client, bucket: string, key: string): Promise<Buffer> {
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`R2 객체 비어있음: ${key}`);
  const bytes = await res.Body.transformToByteArray();
  return Buffer.from(bytes);
}
