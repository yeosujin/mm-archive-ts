const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 한국은 서머타임이 없어 고정 오프셋

// 다음 KST 자정까지 남은 밀리초. 정확히 자정이면 0.
export function msUntilKstMidnight(now: Date = new Date()): number {
  const sinceMidnight = (now.getTime() + KST_OFFSET_MS) % DAY_MS;
  return sinceMidnight === 0 ? 0 : DAY_MS - sinceMidnight;
}

// 한국시간(KST) 기준 오늘 날짜를 'YYYY-MM-DD'로 반환한다.
export function getKstDateString(now: Date = new Date()): string {
  // en-CA 로케일은 'YYYY-MM-DD' 형식을 준다.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
