import { describe, it, expect } from 'vitest';
import { urlToKey } from './r2';

describe('urlToKey', () => {
  it('퍼블릭 URL에서 키 추출', () => {
    expect(urlToKey('https://cdn.x.r2.dev/photos/a.jpg', 'https://cdn.x.r2.dev'))
      .toBe('photos/a.jpg');
  });
  it('끝 슬래시 정규화', () => {
    expect(urlToKey('https://cdn.x.r2.dev/videos/b.mp4', 'https://cdn.x.r2.dev/'))
      .toBe('videos/b.mp4');
  });
});
