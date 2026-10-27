import { describe, it, expect } from 'vitest';
import { weverseLiveKey, buildCoverBookmarklet } from './weverseCover';

describe('weverseLiveKey', () => {
  it('쿼리·해시·끝 슬래시와 상관없이 같은 키', () => {
    const k = weverseLiveKey('https://weverse.io/illit/live/4-217834450?hl=ko');
    expect(k).toBe('illit/live/4-217834450');
    expect(weverseLiveKey('https://weverse.io/illit/live/4-217834450/')).toBe(k);
    expect(weverseLiveKey('https://m.weverse.io/illit/live/4-217834450#x')).toBe(k);
  });
  it('아티스트는 소문자로, 하위 경로는 무시', () => {
    expect(weverseLiveKey('https://weverse.io/ILLIT/live/4-1')).toBe('illit/live/4-1');
    expect(weverseLiveKey('https://weverse.io/illit/live/4-1/comments')).toBe('illit/live/4-1');
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
    expect(decodeURIComponent(b)).toContain('getBoundingClientRect');
  });
  it('문법이 올바르고 정규식이 썸네일 주소를 뽑는다', () => {
    const b = buildCoverBookmarklet('https://mmemory.cloud');
    const code = decodeURIComponent(b.slice('javascript:'.length));
    expect(() => new Function(code)).not.toThrow();
    const re = code.match(/const re=(\/.*\/);/)![1];
    const m = `url("https://video-phinf.pstatic.net/20260107_17/1767788774828VFpLE_JPEG/3mGwyL5WmU_03.jpg")`
      .match(new Function(`return ${re}`)());
    expect(m![1]).toBe('https://video-phinf.pstatic.net/20260107_17/1767788774828VFpLE_JPEG/3mGwyL5WmU_03.jpg');
  });
});
