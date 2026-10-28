// 뷰어(모먼트·스토리) 소리 상태. 뷰어를 닫았다 열어도 페이지 세션 동안 유지한다
let sessionSoundOn = true;

export function getSessionSoundOn(): boolean {
  return sessionSoundOn;
}

export function setSessionSoundOn(on: boolean): void {
  sessionSoundOn = on;
}
