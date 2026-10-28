import { useSyncExternalStore } from 'react';

/**
 * 사이트 입장 로고 화면. 세션에서 처음, 홈(`/`)으로 들어왔을 때만 띄운다.
 * on: 보이는 중 · leaving: 사라지는 중 · off: 없음
 *
 * 홈이 '그 해 오늘' 자동 열기를 정하면 releaseEntrySplash()로 내린다.
 * 로고 애니메이션이 끝나도록 최소 MIN_MS는 두고, 데이터가 늦어도 MAX_MS면 내린다.
 */
export type SplashPhase = 'on' | 'leaving' | 'off';

const SEEN_KEY = 'mmemory.splashSeen';
const MIN_MS = 1600; // 데이터가 빨리 와도 로고를 이만큼은 보여 준다(너무 순식간에 넘어가지 않게)
const MAX_MS = 2500;
const OUT_MS = 250; // splash.css 퇴장 애니메이션과 같게

const listeners = new Set<() => void>();
let phase: SplashPhase = decide();
let released = false;
const startedAt = performance.now();
if (phase === 'on') setTimeout(leave, MAX_MS);

function decide(): SplashPhase {
  if (window.location.pathname !== '/') return 'off';
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return 'off';
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch { /* 저장소 막힘: 그냥 보여준다 */ }
  return 'on';
}

function setPhase(next: SplashPhase) {
  phase = next;
  listeners.forEach(l => l());
}

function leave() {
  if (phase !== 'on') return;
  setPhase('leaving');
  setTimeout(() => setPhase('off'), OUT_MS);
}

/** 홈이 준비됐다 — 최소 시간을 채운 뒤 내린다 */
export function releaseEntrySplash() {
  if (phase !== 'on' || released) return;
  released = true;
  setTimeout(leave, Math.max(0, MIN_MS - (performance.now() - startedAt)));
}

export function entrySplashPhase(): SplashPhase {
  return phase;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useEntrySplash(): SplashPhase {
  return useSyncExternalStore(subscribe, entrySplashPhase);
}
