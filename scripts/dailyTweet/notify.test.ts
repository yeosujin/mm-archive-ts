import { describe, it, expect } from 'vitest';
import { buildSummary } from './notify';

describe('buildSummary', () => {
  it('개수 + 트윗 목록을 요약한다', () => {
    const msg = buildSummary(2, ['240715 유튜브', '250715 유튜브']);
    expect(msg).toContain('트윗 2개 게시 완료');
    expect(msg).toContain('• 240715 유튜브');
    expect(msg).toContain('• 250715 유튜브');
  });

  it('트윗이 없으면 개수만', () => {
    const msg = buildSummary(0, []);
    expect(msg).toContain('트윗 0개 게시 완료');
  });
});
