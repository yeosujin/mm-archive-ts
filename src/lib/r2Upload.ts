import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 설정 (S3 호환)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${import.meta.env.VITE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

/**
 * 비디오 파일을 Cloudflare R2에 업로드
 * @param file - 업로드할 비디오 파일
 * @returns 업로드된 파일의 공개 URL
 */
export async function uploadVideoToR2(file: File): Promise<string> {
  console.log('[R2] Starting upload for file:', file.name, 'size:', file.size, 'type:', file.type);
  
  // 고유한 파일명 생성 (타임스탬프 + 원본 파일명)
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `videos/${timestamp}-${sanitizedFileName}`;

  try {
    console.log('[R2] Converting file to ArrayBuffer...');
    const arrayBuffer = await file.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);
    console.log('[R2] File converted. Body size:', body.length);

    const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
    console.log('[R2] Uploading to bucket:', bucketName, 'key:', fileName);

    // R2에 업로드
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: body,
      ContentType: file.type,
    });

    await r2Client.send(command);
    console.log('[R2] Upload successful!');

    // 공개 URL 반환
    const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${fileName}`;
    console.log('[R2] Generated Public URL:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('[R2] Upload failed internal:', error);
    throw error;
  }
}

/**
 * Cloudflare R2에서 파일 삭제
 * @param url - 삭제할 파일의 공개 URL
 */
export async function deleteFileFromR2(url: string): Promise<void> {
  const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
  if (!url || !url.startsWith(r2PublicUrl)) {
    console.log('[R2] Not an R2 URL, skipping delete:', url);
    return;
  }

  console.log('[R2] Attempting to delete file:', url);
  const key = url.replace(`${r2PublicUrl}/`, '');
  
  try {
    console.log('[R2] Deleting from bucket:', import.meta.env.VITE_R2_BUCKET_NAME, 'key:', key);
    const command = new DeleteObjectCommand({
      Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    console.log('[R2] Delete successful:', key);
  } catch (error) {
    console.error('[R2] Delete failed:', error);
  }
}

/**
 * 파일이 비디오인지 확인
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
