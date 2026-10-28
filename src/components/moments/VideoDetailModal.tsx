import { useCallback, useEffect, useEffectEvent, useRef } from 'react';
import type { Moment, Video } from '../../lib/database/types';
import VideoDetailBody from './VideoDetailBody';
import { CloseIcon } from '../Icons';

interface Props {
  video: Video;
  moments: Moment[];
  viewerOpen: boolean;
  onOpenMoment: (momentId: string) => void;
  onClose: () => void;
}

/** 아래로 이만큼(또는 화면 높이의 20%) 끌면 닫는다 */
const SWIPE_CLOSE_PX = 120;

/**
 * 표지(/videos) 위에 아래에서 올라오는 영상 상세. 열림 상태는 부모가 `?v=`로 들고 있다.
 * ✕ · Esc · 뒤로가기 · 맨 위에서 아래로 끌기로 닫는다. 뒤의 표지 스크롤은 잠근다.
 */
export default function VideoDetailModal({ video, moments, viewerOpen, onOpenMoment, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);

  // body 스크롤 잠금 — 모달 안만 스크롤
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Esc 닫기. 위에 뷰어가 떠 있으면 뷰어가 처리한다
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== 'Escape' || viewerOpen) return;
    e.preventDefault();
    close();
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 맨 위에서 아래로 끌면 시트가 따라 내려오고, 충분히 끌면 닫는다
  const onSwipeClose = useEffectEvent(() => close());
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    let phase: 'idle' | 'pending' | 'drag' = 'idle';
    let startX = 0;
    let startY = 0;
    let dy = 0;

    const onStart = (e: TouchEvent) => {
      phase = e.touches.length === 1 && el.scrollTop <= 0 ? 'pending' : 'idle';
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dy = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (phase === 'idle') return;
      const x = e.touches[0].clientX - startX;
      const y = e.touches[0].clientY - startY;
      if (phase === 'pending') {
        if (Math.abs(x) < 8 && Math.abs(y) < 8) return;
        // 위로 밀거나 옆으로 밀면 평소 스크롤
        if (y <= 0 || Math.abs(x) > Math.abs(y)) {
          phase = 'idle';
          return;
        }
        phase = 'drag';
        el.style.transition = 'none';
      }
      e.preventDefault();
      dy = Math.max(0, y);
      el.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = () => {
      if (phase !== 'drag') {
        phase = 'idle';
        return;
      }
      phase = 'idle';
      el.style.transition = '';
      if (dy > Math.min(SWIPE_CLOSE_PX, el.clientHeight * 0.2)) {
        el.style.transform = 'translateY(100%)';
        onSwipeClose();
      } else {
        el.style.transform = '';
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  return (
    <div ref={sheetRef} className="vdm" role="dialog" aria-modal="true" aria-label={video.title} tabIndex={-1}>
      {/* 위쪽 여백 겸 닫기 줄. 스크롤해도 따라와서 언제든 닫을 수 있다 */}
      <div className="vdm-top">
        <button type="button" className="vdm-close" onClick={close} aria-label="닫기">
          <CloseIcon size={24} />
        </button>
      </div>
      <VideoDetailBody
        video={video}
        moments={moments}
        viewerOpen={viewerOpen}
        onOpenMoment={onOpenMoment}
      />
    </div>
  );
}
