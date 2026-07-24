import { describe, it, expect } from 'vitest';
import { toYYMMDD, stripSubfix, stripYearPrefix, photoText, postText, momentText, withHashtags } from './text';

describe('toYYMMDD', () => {
  it('YYYY-MM-DD를 YYMMDD로', () => {
    expect(toYYMMDD('2022-07-14')).toBe('220714');
  });
});

describe('stripSubfix', () => {
  it('끝의 -숫자 제거', () => {
    expect(stripSubfix('생일-1')).toBe('생일');
    expect(stripSubfix('생일-12')).toBe('생일');
  });
  it('subfix 없으면 그대로', () => {
    expect(stripSubfix('생일')).toBe('생일');
  });
});

describe('stripYearPrefix', () => {
  it('날짜 연도와 같은 prefix 제거', () => {
    expect(stripYearPrefix('2025 생일', '2025-10-10')).toBe('생일');
  });
  it('다른 연도 prefix는 유지', () => {
    expect(stripYearPrefix('2024 생일', '2025-10-10')).toBe('2024 생일');
  });
  it('prefix 없으면 그대로', () => {
    expect(stripYearPrefix('생일', '2025-10-10')).toBe('생일');
  });
});

describe('photoText', () => {
  it('subfix 제거 + YYMMDD', () => {
    expect(photoText('생일-2', '2022-07-14')).toBe('220714 생일');
  });
});

describe('postText', () => {
  it('제목 없으면 날짜만', () => {
    expect(postText(undefined, '2029-01-11')).toBe('290111');
    expect(postText('', '2029-01-11')).toBe('290111');
  });
  it('연도 prefix 제거', () => {
    expect(postText('2025 생일', '2025-10-10')).toBe('251010 생일');
  });
});

describe('momentText', () => {
  it('플랫폼 + 제목이면 둘째 줄에 제목', () => {
    expect(momentText('유튜브', '슈일릿 EP.12', '2022-07-14')).toBe('220714 유튜브\n슈일릿 EP.12');
  });
  it('플랫폼 없으면 날짜 + 제목', () => {
    expect(momentText(null, '독립순간', '2022-07-14')).toBe('220714\n독립순간');
  });
  it('제목 없으면 첫 줄만', () => {
    expect(momentText('위버스', '', '2022-07-14')).toBe('220714 위버스');
  });
});

describe('withHashtags', () => {
  it('본문 아래 한 줄 띄우고 #그해오늘', () => {
    expect(withHashtags('240715 유튜브')).toBe('240715 유튜브\n\n#그해오늘');
  });
});
