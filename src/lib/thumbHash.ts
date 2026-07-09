import { rgbaToThumbHash, thumbHashToDataURL } from 'thumbhash';

const ENCODE_MAX_SIZE = 100;

export async function encodeThumbHashFromFile(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(ENCODE_MAX_SIZE / bitmap.width, ENCODE_MAX_SIZE / bitmap.height, 1);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const { data } = ctx.getImageData(0, 0, w, h);
    const hash = rgbaToThumbHash(w, h, data);
    return bytesToBase64(hash);
  } catch (err) {
    console.warn('thumbHash encode 실패:', err);
    return null;
  }
}

export function thumbHashToUrl(hash: string | null | undefined): string | null {
  if (!hash) return null;
  try {
    const bytes = base64ToBytes(hash);
    return thumbHashToDataURL(bytes);
  } catch (err) {
    console.warn('thumbHash decode 실패:', err);
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
