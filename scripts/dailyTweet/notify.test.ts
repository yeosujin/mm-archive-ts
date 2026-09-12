import { describe, it, expect } from 'vitest';
import { buildSummary, buildFailureSummary, buildCrashSummary } from './notify';

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

describe('buildFailureSummary', () => {
  it('0개 게시면 실패 알림 + 재시도 안내', () => {
    const msg = buildFailureSummary('2026-09-13', 2, 0, ['HTTP 503 Service Unavailable']);
    expect(msg).toContain('🚨');
    expect(msg).toContain('게시 실패');
    expect(msg).toContain('2026-09-13');
    expect(msg).toContain('계획 2개 중 0개 게시');
    expect(msg).toContain('HTTP 503 Service Unavailable');
    expect(msg).toContain('자동 재시도');
  });

  it('일부만 게시되면 경고 + 재시도 안내는 없음', () => {
    const msg = buildFailureSummary('2026-09-13', 4, 3, ['HTTP 503 Service Unavailable']);
    expect(msg).toContain('⚠️');
    expect(msg).toContain('일부만 게시');
    expect(msg).toContain('계획 4개 중 3개 게시');
    // 이미 기록이 남아 재시도되지 않으므로 안내를 넣지 않는다
    expect(msg).not.toContain('자동 재시도');
  });

  it('같은 사유가 반복되면 한 번만 표시', () => {
    const msg = buildFailureSummary('2026-09-13', 3, 0, ['HTTP 503 x', 'HTTP 503 x', 'HTTP 503 x']);
    expect(msg.match(/HTTP 503 x/g)).toHaveLength(1);
  });

  it('사유가 없으면 원인 줄을 생략', () => {
    const msg = buildFailureSummary('2026-09-13', 1, 0, []);
    expect(msg).not.toContain('원인:');
  });
});

describe('buildCrashSummary', () => {
  it('중단 원인을 담는다', () => {
    const msg = buildCrashSummary('2026-09-13', 'HTTP 401 Could not authenticate you');
    expect(msg).toContain('중단');
    expect(msg).toContain('HTTP 401 Could not authenticate you');
  });
});
