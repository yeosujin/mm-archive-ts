import { useEffect, useRef } from 'react';

interface Callbacks {
  onTapPrev: () => void;
  onTapNext: () => void;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  onDismiss: () => void;
}

const HOLD_MS = 250;
const MOVE_SLOP = 10;       // 이 이상 움직이면 탭·길게 누르기가 아니다
const SWIPE_MIN = 50;       // 좌우 스와이프로 인정할 거리
const DISMISS_MIN = 120;    // 이만큼 내리면 닫기
const FLICK_SPEED = 0.6;    // px/ms. 짧게 내려도 빠르게 튕기면 닫기

// 탭·스와이프·길게 누르기가 이 요소 안에서 시작되면 무시 (링크·버튼·더보기)
const INTERACTIVE = 'a, button, [data-no-gesture]';

interface Drag {
  id: number;
  x: number;
  y: number;
  t: number;
  axis: 'x' | 'y' | null;
  held: boolean;
  lastY: number;
  lastT: number;
  speed: number;
}

/**
 * 스토리 제스처. 한 포인터 층에서 탭(왼쪽 1/3 이전, 나머지 다음), 좌우 스와이프(해 이동),
 * 250ms 길게 누르기(멈춤), 아래로 쓸어 닫기(`sheetRef` 요소가 손가락을 따라 내려가고, 닫을 때는 그 자리에 둔다)를 판정한다.
 */
export function useStoryGestures(sheetRef: React.RefObject<HTMLElement | null>, cb: Callbacks) {
  const dragRef = useRef<Drag | null>(null);
  const holdTimerRef = useRef(0);

  useEffect(() => () => window.clearTimeout(holdTimerRef.current), []);

  const setOffset = (y: number | null, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animate ? 'transform 0.22s ease-out' : 'none';
    el.style.transform = y === null ? '' : `translateY(${y}px)`;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (dragRef.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as Element).closest(INTERACTIVE)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const now = performance.now();
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now, axis: null, held: false, lastY: e.clientY, lastT: now, speed: 0 };
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      const d = dragRef.current;
      if (!d || d.axis) return;
      d.held = true;
      cb.onHoldStart();
    }, HOLD_MS);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis && Math.hypot(dx, dy) > MOVE_SLOP) {
      d.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
      window.clearTimeout(holdTimerRef.current);
    }
    if (d.axis === 'y') {
      const now = performance.now();
      if (now > d.lastT) d.speed = (e.clientY - d.lastY) / (now - d.lastT);
      d.lastY = e.clientY;
      d.lastT = now;
      setOffset(Math.max(0, dy), false);
    }
  };

  const finish = (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    window.clearTimeout(holdTimerRef.current);
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;

    if (d.axis === 'y') {
      if (!cancelled && dy > 30 && (dy > DISMISS_MIN || d.speed > FLICK_SPEED)) {
        // 손을 뗀 자리 그대로 두고 닫는다 — 뷰어가 이 위치에서 카드로 줄어든다
        cb.onDismiss();
      } else {
        setOffset(null, true);
      }
    }
    // 길게 누른 뒤 떼면 이어서 재생만 — 탭으로 치지 않는다
    if (d.held) {
      cb.onHoldEnd();
      return;
    }
    if (cancelled) return;
    if (d.axis === 'x') {
      if (Math.abs(dx) >= SWIPE_MIN) {
        if (dx < 0) cb.onSwipeNext();
        else cb.onSwipePrev();
      }
      return;
    }
    if (d.axis === null) {
      const r = e.currentTarget.getBoundingClientRect();
      if (e.clientX - r.left < r.width / 3) cb.onTapPrev();
      else cb.onTapNext();
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => finish(e, false),
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => finish(e, true),
  };
}
