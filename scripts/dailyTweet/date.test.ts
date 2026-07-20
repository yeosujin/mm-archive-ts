import { describe, it, expect } from 'vitest';
import { getKstDateString, msUntilKstMidnight } from './date';

describe('getKstDateString', () => {
  it('UTC 15:00은 KST 다음날 자정이므로 다음날 날짜', () => {
    expect(getKstDateString(new Date('2026-07-14T15:00:00Z'))).toBe('2026-07-15');
  });
  it('UTC 14:59는 아직 KST 같은날 23:59', () => {
    expect(getKstDateString(new Date('2026-07-14T14:59:00Z'))).toBe('2026-07-14');
  });
});

describe('msUntilKstMidnight', () => {
  it('KST 23:50(UTC 14:50)이면 10분 남음', () => {
    expect(msUntilKstMidnight(new Date('2026-07-14T14:50:00Z'))).toBe(10 * 60 * 1000);
  });
  it('KST 자정 정각이면 0', () => {
    expect(msUntilKstMidnight(new Date('2026-07-14T15:00:00Z'))).toBe(0);
  });
  it('자정을 막 넘겼으면 거의 하루가 남는다', () => {
    expect(msUntilKstMidnight(new Date('2026-07-14T15:01:00Z'))).toBe(23 * 60 * 60 * 1000 + 59 * 60 * 1000);
  });
});
