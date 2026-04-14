// 오늘 날짜 기반 "그 해 오늘" 필터 유틸
// DB 변경 없이 클라이언트에서만 계산

export function getTodayString(): string {
  // ?date=YYYY-MM-DD 쿼리 파라미터로 강제 지정 가능 (디버깅용)
  if (globalThis.location !== undefined) {
    const override = new URLSearchParams(globalThis.location.search).get('date');
    if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) {
      return override;
    }
  }
  // YYYY-MM-DD (로컬 타임존 기준)
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// MM-DD가 일치하는 아이템 필터 (과거 연도만, 오늘 연도는 제외)
export function filterOnThisDay<T extends { date: string }>(items: T[], todayString: string): T[] {
  const monthDay = todayString.slice(5); // 'MM-DD'
  const todayYear = todayString.slice(0, 4);
  return items.filter(item => {
    if (!item.date || item.date.length < 10) return false;
    return item.date.slice(5, 10) === monthDay && item.date.slice(0, 4) !== todayYear;
  });
}

// 연도별 그룹화 + 최신 연도 먼저
export function groupByYearDesc<T extends { date: string }>(items: T[]): Array<[string, T[]]> {
  const groups: Record<string, T[]> = {};
  items.forEach(item => {
    const year = item.date.slice(0, 4);
    if (!groups[year]) groups[year] = [];
    groups[year].push(item);
  });
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}
