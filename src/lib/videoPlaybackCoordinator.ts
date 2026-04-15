/**
 * 여러 VideoPlayer 인스턴스 간 "한 번에 하나만 재생" 조정.
 * 새 영상이 재생되면 이전 활성 영상을 pause.
 */

let active: HTMLVideoElement | null = null;

export function requestPlay(video: HTMLVideoElement): void {
  if (active && active !== video) {
    try { active.pause(); } catch { /* noop */ }
  }
  active = video;
  video.play().catch(() => { /* muted autoplay 실패는 무시 */ });
}

export function release(video: HTMLVideoElement): void {
  if (active === video) {
    try { video.pause(); } catch { /* noop */ }
    active = null;
  }
}
