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
