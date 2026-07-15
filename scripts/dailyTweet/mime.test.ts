import { describe, it, expect } from 'vitest';
import { mimeFromUrl } from './mime';

describe('mimeFromUrl', () => {
  it('이미지 확장자', () => {
    expect(mimeFromUrl('https://x.r2.dev/a.jpg')).toBe('image/jpeg');
    expect(mimeFromUrl('https://x.r2.dev/a.png')).toBe('image/png');
  });
  it('영상 확장자', () => {
    expect(mimeFromUrl('https://x.r2.dev/a.mp4')).toBe('video/mp4');
  });
  it('쿼리스트링 무시', () => {
    expect(mimeFromUrl('https://x.r2.dev/a.mp4?v=2')).toBe('video/mp4');
  });
});
