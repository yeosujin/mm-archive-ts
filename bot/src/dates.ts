// 날짜 유틸 — 앱의 dailyPick.ts 로직을 서버(KST)용으로 이식.

// 오늘 날짜(Asia/Seoul) 를 YYYY-MM-DD 로 반환. override 우선.
export function getTodayString(override?: string): string {
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  // en-CA 로케일은 YYYY-MM-DD 포맷을 준다.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// YYYY-MM-DD → YYMMDD (트윗 본문 접두사)
export function toYYMMDD(dateString: string): string {
  // dateString 은 최소 YYYY-MM-DD 로 시작한다고 가정
  const [y, m, d] = dateString.slice(0, 10).split('-');
  return `${(y ?? '').slice(2)}${m ?? ''}${d ?? ''}`;
}

// MM-DD 가 오늘과 같고, 오늘 연도가 아닌 과거 항목만 (앱 filterOnThisDay 와 동일)
export function isOnThisDay(itemDate: string | undefined, todayString: string): boolean {
  if (!itemDate || itemDate.length < 10) return false;
  const monthDay = todayString.slice(5); // 'MM-DD'
  const todayYear = todayString.slice(0, 4);
  return itemDate.slice(5, 10) === monthDay && itemDate.slice(0, 4) !== todayYear;
}
