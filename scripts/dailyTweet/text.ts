// 'YYYY-MM-DD' -> 'YYMMDD'
export function toYYMMDD(date: string): string {
  return date.slice(2, 4) + date.slice(5, 7) + date.slice(8, 10);
}

// 사진 제목 끝의 '-1', '-12' 같은 subfix 제거
export function stripSubfix(title: string): string {
  return title.replace(/-\d+$/, '');
}

// 제목 앞에 콘텐츠 연도와 같은 prefix가 있으면 제거 ('2025 생일' + 2025 -> '생일')
export function stripYearPrefix(title: string, date: string): string {
  const year = date.slice(0, 4);
  return title.replace(new RegExp('^' + year + '\\s*'), '').trim();
}

// 트윗 본문은 날짜(YYMMDD)만. 해시태그는 withHashtags에서 붙는다.
// (플랫폼/제목은 더 이상 본문에 넣지 않는다.)
export function photoText(date: string): string {
  return toYYMMDD(date);
}

export function postText(date: string): string {
  return toYYMMDD(date);
}

export function momentText(date: string): string {
  return toYYMMDD(date);
}

// 모든 트윗 하단에 붙는 해시태그
export const HASHTAGS = '#그해오늘';

export function withHashtags(text: string): string {
  return `${text}\n\n${HASHTAGS}`;
}
