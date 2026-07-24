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

// 'YYMMDD' + 나머지(있으면 공백으로 join)
function join(yymmdd: string, rest: string): string {
  const r = rest.trim();
  return r ? `${yymmdd} ${r}` : yymmdd;
}

export function photoText(title: string, date: string): string {
  return join(toYYMMDD(date), stripSubfix(title));
}

export function postText(title: string | undefined, date: string): string {
  const t = (title ?? '').trim();
  return join(toYYMMDD(date), t ? stripYearPrefix(t, date) : '');
}

// 'YYMMDD 플랫폼' 다음 줄에 제목. 제목은 상위 영상 제목(없으면 모먼트 제목).
export function momentText(platformLabel: string | null, title: string, date: string): string {
  const head = join(toYYMMDD(date), platformLabel ?? '');
  const t = title.trim();
  return t ? `${head}\n${t}` : head;
}

// 모든 트윗 하단에 붙는 해시태그
export const HASHTAGS = '#그해오늘';

export function withHashtags(text: string): string {
  return `${text}\n\n${HASHTAGS}`;
}
