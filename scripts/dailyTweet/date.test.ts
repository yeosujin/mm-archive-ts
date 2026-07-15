import { describe, it, expect } from 'vitest';
import { getKstDateString } from './date';

describe('getKstDateString', () => {
  it('UTC 15:00은 KST 다음날 자정이므로 다음날 날짜', () => {
    expect(getKstDateString(new Date('2026-07-14T15:00:00Z'))).toBe('2026-07-15');
  });
  it('UTC 14:59는 아직 KST 같은날 23:59', () => {
    expect(getKstDateString(new Date('2026-07-14T14:59:00Z'))).toBe('2026-07-14');
  });
});
