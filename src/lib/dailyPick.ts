// 오늘 날짜 기반 결정론적 랜덤 픽 + N년 전 오늘 필터
// DB 변경 없이 클라이언트에서만 계산

export function getTodayString(): string {
  // YYYY-MM-DD (로컬 타임존 기준)
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 간단 문자열 해시 (cyrb53 경량판)
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 오늘 날짜를 시드로 배열에서 하나 선택 (하루 내 같은 결과 보장)
export function pickByDateSeed<T>(items: T[], dateString: string, salt = ''): T | null {
  if (items.length === 0) return null;
  const seed = hashString(dateString + salt);
  return items[seed % items.length];
}

// MM-DD가 일치하는 아이템 필터 (N년 전 오늘)
// items의 date 필드는 'YYYY-MM-DD' 형식 가정
export function filterOnThisDay<T extends { date: string }>(items: T[], todayString: string): T[] {
  const monthDay = todayString.slice(5); // 'MM-DD'
  const todayYear = todayString.slice(0, 4);
  return items.filter(item => {
    if (!item.date || item.date.length < 10) return false;
    return item.date.slice(5, 10) === monthDay && item.date.slice(0, 4) !== todayYear;
  });
}

// 연도별 그룹화 + 최신순 정렬
export function groupByYearDesc<T extends { date: string }>(items: T[]): Array<[string, T[]]> {
  const groups: Record<string, T[]> = {};
  items.forEach(item => {
    const year = item.date.slice(0, 4);
    if (!groups[year]) groups[year] = [];
    groups[year].push(item);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}
