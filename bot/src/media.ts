import type { MediaKind } from './types';

// URL 이 우리 R2(공개 CDN)에 올라간 "실제 파일"인지 판단.
// 유튜브/트위터 등 외부 링크는 파일이 아니므로 X 에 업로드할 수 없다.
export function isR2Url(url: string | undefined, r2PublicUrl: string): boolean {
  if (!url) return false;
  if (r2PublicUrl && url.startsWith(r2PublicUrl)) return true;
  return (
    url.includes('.r2.dev') ||
    url.includes('.r2.cloudflarestorage.com') ||
    url.includes('cdn.mmemory.cloud')
  );
}

// 확장자 → MIME 타입 (X 업로드 시 media_type 으로 사용)
const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/mp4',
  webm: 'video/webm',
};

export function guessMimeType(url: string, kind: MediaKind): string {
  const ext = new URL(url).pathname.split('.').pop()?.toLowerCase() ?? '';
  const mime = MIME_BY_EXT[ext];
  if (mime) return mime;
  // 확장자로 못 찾으면 종류 기본값
  return kind === 'video' ? 'video/mp4' : 'image/jpeg';
}

// 공개 URL 에서 바이트를 받아 Buffer 로. (R2 파일은 공개 CDN 이라 인증 불필요)
export async function fetchMediaBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`미디어 다운로드 실패 ${res.status}: ${url}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}
