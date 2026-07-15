import { describe, it, expect } from 'vitest';
import { momentPlatformLabel } from './platform';
import type { Video } from '../../src/lib/database';

const base: Video = { id: 'v1', title: 't', url: '', date: '2022-07-14' };

describe('momentPlatformLabel', () => {
  it('상위 영상 없으면 null', () => {
    expect(momentPlatformLabel(undefined)).toBeNull();
  });
  it('YouTube URL이면 유튜브(한글)', () => {
    expect(momentPlatformLabel({ ...base, url: 'https://youtu.be/abc' })).toBe('유튜브');
  });
  it('Weverse URL이면 위버스(한글)', () => {
    expect(momentPlatformLabel({ ...base, url: 'https://weverse.io/x' })).toBe('위버스');
  });
  it('기타 플랫폼이면 platform_name', () => {
    expect(momentPlatformLabel({ ...base, url: 'https://example.com/x', platform_name: '네이버' })).toBe('네이버');
  });
  it('기타인데 platform_name 없으면 null', () => {
    expect(momentPlatformLabel({ ...base, url: 'https://example.com/x' })).toBeNull();
  });
});
