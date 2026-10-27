import { stripVideoMetadata } from './stripMetadata';

// R2 자격증명은 서버(api/r2.ts)에만 있다. 브라우저는 어드민 비밀번호로 presigned URL을 받아 직접 PUT한다.
export const ADMIN_PASSWORD_STORAGE_KEY = 'adminPassword';

async function callR2Api<T>(body: Record<string, unknown>, password?: string): Promise<T> {
  const res = await fetch('/api/r2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password ?? sessionStorage.getItem(ADMIN_PASSWORD_STORAGE_KEY) ?? '',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`[R2] /api/r2 ${String(body.action)} 실패 (${res.status})`);
  return res.json() as Promise<T>;
}

/** 어드민 비밀번호가 맞는지 서버에 확인 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    await callR2Api({ action: 'verify' }, password);
    return true;
  } catch {
    return false;
  }
}

/** 허용된 외부 이미지(위버스 썸네일)를 서버가 받아 R2에 저장. 공개 URL 반환 */
export async function importImageToR2(sourceUrl: string, key: string): Promise<string> {
  await callR2Api({ action: 'import', key, sourceUrl });
  return `${import.meta.env.VITE_R2_PUBLIC_URL}/${key}`;
}

/** presigned URL로 R2에 PUT 업로드 (진행률 추적을 위해 XHR 사용) */
async function putToR2(key: string, body: Blob, onProgress?: (progress: number) => void): Promise<void> {
  const { url } = await callR2Api<{ url: string }>({ action: 'presign', key, contentType: body.type });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (body.type) xhr.setRequestHeader('Content-Type', body.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`[R2] PUT 실패 (${xhr.status})`)));
    xhr.onerror = () => reject(new Error('[R2] PUT 네트워크 오류'));
    xhr.send(body);
  });
}

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

  // 업로드 전 메타데이터 제거
  try {
    console.log('[R2] Stripping video metadata...');
    file = await stripVideoMetadata(file);
    console.log('[R2] Metadata stripped successfully');
  } catch (err) {
    console.warn('[R2] Metadata stripping failed, uploading original:', err);
  }

  const timestamp = Date.now();
const randomId = crypto.randomUUID().slice(0, 8);
const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
const fileName = `videos/${timestamp}-${randomId}-${sanitizedFileName}`;

  try {
    await putToR2(fileName, file, onProgress);
    console.log('[R2] Managed upload successful!');

    const publicUrl = `${import.meta.env.VITE_R2_PUBLIC_URL}/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('[R2] Managed upload failed ❌', error);
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
    await putToR2(fileName, file, onProgress);

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
    console.log(`[R2] Attempting delete - Key: ${key}`);
    await callR2Api({ action: 'delete', key });
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
  const thumbnailKey = videoKey.replace(/\.[^.]+$/, `_thumb.${thumbnailExt(thumbnailBlob)}`);

  await putToR2(thumbnailKey, thumbnailBlob);
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

  const blob = await extractFirstFrameFromUrl(videoUrl);
  const thumbnailKey = videoKey.replace(/\.[^.]+$/, `_thumb.${thumbnailExt(blob)}`);

  await putToR2(thumbnailKey, blob);
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
      thumbnailMimeType,
      0.8
    );
  });
}

/**
 * canvas가 WebP 인코딩을 지원하면 WebP, 아니면 JPEG.
 * 미지원 브라우저에서 toBlob에 'image/webp'를 넘기면 PNG로 폴백돼 오히려 커진다.
 */
const thumbnailMimeType: string = (() => {
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  return probe.toDataURL('image/webp').startsWith('data:image/webp')
    ? 'image/webp'
    : 'image/jpeg';
})();

/** 썸네일 blob의 MIME에 대응하는 파일 확장자 */
function thumbnailExt(blob: Blob): string {
  return blob.type === 'image/webp' ? 'webp' : 'jpg';
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
