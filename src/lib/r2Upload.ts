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
  // 고유한 파일명 생성 (타임스탬프 + 원본 파일명)
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `videos/${timestamp}-${sanitizedFileName}`;

  try {
    // File을 Uint8Array로 변환 (브라우저 stream 이슈 방지)
    const arrayBuffer = await file.arrayBuffer();
    const body = new Uint8Array(arrayBuffer);

    // R2에 업로드
    const command = new PutObjectCommand({
      Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
      Key: fileName,
      Body: body,
      ContentType: file.type,
    });

    await r2Client.send(command);

    // 공개 URL 반환
    const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('R2 업로드 실패:', error);
    throw new Error('비디오 업로드에 실패했습니다.');
  }
}

/**
 * Cloudflare R2에서 파일 삭제
 * @param url - 삭제할 파일의 공개 URL
 */
export async function deleteFileFromR2(url: string): Promise<void> {
  const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
  if (!url || !url.startsWith(r2PublicUrl)) return; // R2 URL이 아니면 무시

  console.log('Attempting to delete R2 file:', url);
  const key = url.replace(`${r2PublicUrl}/`, '');
  
  try {
    const command = new DeleteObjectCommand({
      Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
      Key: key,
    });
    await r2Client.send(command);
    console.log('R2 파일 삭제 완료:', key);
  } catch (error) {
    console.error('R2 파일 삭제 실패:', error);
    // 삭제 실패가 메인 흐름을 방해하지 않도록 에러를 던지지 않음
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
