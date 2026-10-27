import { describe, it, expect } from 'vitest';
import { weverseLiveKey, buildCoverBookmarklet } from './weverseCover';

describe('weverseLiveKey', () => {
  it('쿼리·해시·끝 슬래시와 상관없이 같은 키', () => {
    const k = weverseLiveKey('https://weverse.io/illit/live/4-217834450?hl=ko');
    expect(k).toBe('illit/live/4-217834450');
    expect(weverseLiveKey('https://weverse.io/illit/live/4-217834450/')).toBe(k);
    expect(weverseLiveKey('https://m.weverse.io/illit/live/4-217834450#x')).toBe(k);
  });
  it('위버스 라이브가 아니면 null', () => {
    expect(weverseLiveKey('https://youtu.be/abcdefghijk')).toBeNull();
    expect(weverseLiveKey('https://weverse.io/illit/feed')).toBeNull();
    expect(weverseLiveKey('not a url')).toBeNull();
  });
});

describe('buildCoverBookmarklet', () => {
  it('javascript: 링크이고 어드민 주소로 연다', () => {
    const b = buildCoverBookmarklet('https://mmemory.cloud');
    expect(b.startsWith('javascript:')).toBe(true);
    expect(decodeURIComponent(b)).toContain('"https://mmemory.cloud"+\'/admin/covers?url=\'');
    expect(decodeURIComponent(b)).toContain('og:image');
    expect(decodeURIComponent(b)).toContain('video-phinf');
  });
});
