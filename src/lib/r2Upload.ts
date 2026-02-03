import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

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
 * 비디오 파일을 Cloudflare R2에 업로드 (진행률 추적 지원)
 * @param file - 업로드할 비디오 파일
 * @param onProgress - 진행률 콜백 (0-100)
 * @returns 업로드된 파일의 공개 URL
 */
export async function uploadVideoToR2(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<string> {
  console.log('[R2] Starting managed upload:', {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toISOString()
  });
  
  const timestamp = Date.now();
const randomId = crypto.randomUUID().slice(0, 8);
const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
const fileName = `videos/${timestamp}-${randomId}-${sanitizedFileName}`;

  try {
    const parallelUploads3 = new Upload({
      client: r2Client,
      params: {
        Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
        Key: fileName,
        Body: file,
        ContentType: file.type,
      },
      // 대용량 파일의 경우 파트 크기 조절 (기본 5MB)
      partSize: 1024 * 1024 * 5, 
      leavePartsOnError: false,
    });

    parallelUploads3.on('httpUploadProgress', (progress) => {
      if (progress.loaded && progress.total) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        console.log(`[R2] Upload progress: ${percent}%`);
        onProgress?.(percent);
      }
    });

    await parallelUploads3.done();
    console.log('[R2] Managed upload successful!');

    const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('[R2] Managed upload failed ❌');
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      // AWS specific metadata check
      const awsError = error as Error & { $metadata?: unknown };
      if (awsError.$metadata) {
        console.error('AWS Metadata:', awsError.$metadata);
      }
      
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }
    throw error;
  }
}

/**
 * 사진 파일을 Cloudflare R2에 업로드 (photos/ 프리픽스)
 * @param file - 업로드할 이미지 파일
 * @param onProgress - 진행률 콜백 (0-100)
 * @returns 업로드된 파일의 공개 URL
 */
export async function uploadPhotoToR2(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
 const timestamp = Date.now();
const randomId = crypto.randomUUID().slice(0, 8);
const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
const fileName = `videos/${timestamp}-${randomId}-${sanitizedFileName}`;

  try {
    const parallelUploads3 = new Upload({
      client: r2Client,
      params: {
        Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
        Key: fileName,
        Body: file,
        ContentType: file.type,
      },
      leavePartsOnError: false,
    });

    parallelUploads3.on('httpUploadProgress', (progress) => {
      if (progress.loaded && progress.total) {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        onProgress?.(percent);
      }
    });

    await parallelUploads3.done();

    const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('[R2] Photo upload failed:', error);
    throw error;
  }
}

/**
 * Cloudflare R2에서 파일 삭제
 * @param url - 삭제할 파일의 공개 URL
 */
export async function deleteFileFromR2(url: string): Promise<void> {
  if (!url) {
    console.log('[R2] Empty URL, skipping delete');
    return;
  }

  const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL || '';
  const normalizedPublicUrl = r2PublicUrl.replace(/\/$/, '');
  
  // R2 URL 판단 로직 개선
  const isR2Url = url.includes('.r2.dev') || 
                  url.includes('r2.cloudflarestorage.com') || 
                  (normalizedPublicUrl && url.startsWith(normalizedPublicUrl));

  if (!isR2Url) {
    console.log('[R2] Not an R2 URL, skipping delete:', url);
    return;
  }

  console.log('[R2] Deleting file:', url);
  
  let key = '';
  try {
    if (normalizedPublicUrl && url.startsWith(normalizedPublicUrl)) {
      // 퍼블릭 도메인을 제외한 나머지를 키로 추출
      key = url.replace(normalizedPublicUrl, '').replace(/^\/+/, '');
    } else {
      // 도메인 이후의 경로를 키로 간주
      const urlObj = new URL(url);
      key = urlObj.pathname.replace(/^\/+/, '');
    }
    
    // URL 디코딩 (공백이나 특수문자 대응)
    key = decodeURIComponent(key);
  } catch (e) {
    console.error('[R2] Failed to parse URL or extract key:', url, e);
    return;
  }
  
  if (!key) {
    console.warn('[R2] Key extraction failed (empty key) for URL:', url);
    return;
  }

  try {
    const bucketName = import.meta.env.VITE_R2_BUCKET_NAME;
    console.log(`[R2] Attempting delete - Bucket: ${bucketName}, Key: ${key}`);
    
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    await r2Client.send(command);
    console.log('[R2] Delete successful ✅ Key:', key);
  } catch (error) {
    console.error('[R2] Delete operation failed ❌', error);
  }
}

/**
 * 비디오 파일에서 첫 프레임을 추출하여 R2에 썸네일로 업로드
 * @param file - 비디오 파일
 * @param videoKey - 비디오 파일의 R2 키 (썸네일 키 생성용)
 * @returns 썸네일 공개 URL
 */
export async function uploadThumbnailFromVideo(file: File, videoKey: string): Promise<string> {
  const thumbnailBlob = await extractFirstFrame(file);
  const thumbnailKey = videoKey.replace(/\.[^.]+$/, '_thumb.jpg');

  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
      Key: thumbnailKey,
      Body: thumbnailBlob,
      ContentType: 'image/jpeg',
    },
  });

  await upload.done();
  return `${import.meta.env.VITE_R2_PUBLIC_URL}/${thumbnailKey}`;
}

/**
 * 비디오 파일에서 첫 프레임을 이미지로 추출
 * 타임아웃 및 다중 이벤트 핸들러로 안정성 강화
 */
function extractFirstFrame(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';  // ← 'metadata'에서 변경
    video.muted = true;
    video.playsInline = true;

    let settled = false;
    const url = URL.createObjectURL(file);
    
    // 10초 타임아웃 (무한 대기 방지)
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn('[Thumb] 타임아웃 (10s)');
        cleanup();
        reject(new Error(`썸네일 추출 타임아웃 (10초): ${file.name}`));
      }
    }, 10000);

    const cleanup = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      video.src = '';
      video.load();
    };

    const trySeek = () => {
      if (settled) return;
      const seekTime = Math.min(0.1, (video.duration || 1) * 0.1);
      video.currentTime = seekTime;
    };

    const tryCapture = () => {
      if (settled) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;
      
      settled = true;
      captureFrame(video)
        .then(resolve)
        .catch(reject)
        .finally(cleanup);
    };

    video.addEventListener('loadedmetadata', trySeek);
    video.addEventListener('loadeddata', () => {
      if (video.currentTime === 0) trySeek();
    });
    video.addEventListener('canplay', () => {
      if (video.currentTime === 0) trySeek();
    });
    video.addEventListener('seeked', tryCapture);
    video.addEventListener('error', () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`비디오 로드 실패`));
    });

    video.src = url;
  });
}

/**
 * R2 URL에서 비디오를 로드하여 첫 프레임을 추출하고 썸네일을 R2에 업로드
 * @param videoUrl - R2 영상 공개 URL
 * @returns 썸네일 공개 URL
 */
export async function generateThumbnailFromUrl(videoUrl: string): Promise<string> {
  const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
  const videoKey = videoUrl.replace(`${r2PublicUrl}/`, '');
  const thumbnailKey = videoKey.replace(/\.[^.]+$/, '_thumb.jpg');

  const blob = await extractFirstFrameFromUrl(videoUrl);

  const upload = new Upload({
    client: r2Client,
    params: {
      Bucket: import.meta.env.VITE_R2_BUCKET_NAME,
      Key: thumbnailKey,
      Body: blob,
      ContentType: 'image/jpeg',
    },
  });

  await upload.done();
  return `${r2PublicUrl}/${thumbnailKey}`;
}

/**
 * URL에서 비디오를 로드하여 첫 프레임을 이미지로 추출
 */
function extractFirstFrameFromUrl(videoUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn(`[Thumb] 타임아웃 (30s): ${videoUrl}`);
        video.src = '';
        reject(new Error(`타임아웃: ${videoUrl}`));
      }
    }, 30000);

    const cleanup = () => {
      clearTimeout(timeout);
      video.src = '';
    };

    video.addEventListener('loadedmetadata', () => {
      // 영상 길이에 맞춰 seek (너무 뒤로 가지 않도록)
      const seekTime = Math.min(0.1, (video.duration || 1) * 0.1);
      video.currentTime = seekTime;
    });

    video.addEventListener('seeked', () => {
      if (settled) return;
      // videoWidth가 0이면 아직 프레임이 준비 안 됨
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        settled = true;
        cleanup();
        reject(new Error(`비디오 프레임 없음 (0x0): ${videoUrl}`));
        return;
      }
      settled = true;
      captureFrame(video)
        .then(resolve)
        .catch((err) => {
          console.error(`[Thumb] captureFrame 실패:`, err);
          reject(err);
        })
        .finally(cleanup);
    });

    video.addEventListener('error', () => {
      if (settled) return;
      settled = true;
      cleanup();
      const code = video.error?.code;
      const msg = video.error?.message || '';
      reject(new Error(`비디오 로드 실패 (code=${code}): ${msg} - ${videoUrl}`));
    });

    video.src = videoUrl;
  });
}

/**
 * video 요소에서 현재 프레임을 캡처
 */
function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');

    // 썸네일 최대 너비 640px로 제한
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context 생성 실패'));
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('썸네일 Blob 생성 실패'));
      },
      'image/jpeg',
      0.8
    );
  });
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
