import { useEffect, useRef, useState } from 'react';
import type { Moment, Video } from '../../lib/database/types';
import { CATEGORY_LABEL, classifyVideo, formatDotDate } from '../../lib/videoCatalog';
import { isSaveData, prefersReducedMotion } from '../../lib/networkPrefs';
import VideoCover from './VideoCover';
import { PlayIcon } from '../Icons';

const PREVIEW_DELAY_MS = 1000;
const PREVIEW_SECONDS = 8;

interface Props {
  video: Video;
  /** 이 영상의 모먼트(정렬됨). 비어 있지 않다 */
  moments: Moment[];
  /** 뷰어가 열려 있으면 미리보기 정지 */
  paused: boolean;
  onOpen: () => void;
}

/**
 * 표지 히어로. 표지를 먼저 보이고 1초 뒤 첫 모먼트를 음소거로 앞 8초만 재생한 뒤 표지로 페이드백.
 * 다른 영상으로 다시 뽑히면 부모가 key로 새로 마운트한다.
 */
export default function MomentHero({ video, moments, paused, onOpen }: Props) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canPreview] = useState(() => !prefersReducedMotion() && !isSaveData());
  const [inView, setInView] = useState(false);
  const [showing, setShowing] = useState(false);
  const [done, setDone] = useState(false);
  const previewUrl = moments[0]?.tweet_url;

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !canPreview) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [canPreview]);

  const active = canPreview && inView && !paused && !done && !!previewUrl;

  useEffect(() => {
    const el = videoRef.current;
    if (!active || !el || !previewUrl) return;
    let timer: number | undefined;
    const play = () => {
      el.muted = true;
      el.play().catch(() => { /* 자동재생 막힘 → 표지 그대로 */ });
    };
    if (el.getAttribute('src')) {
      play();
    } else {
      timer = window.setTimeout(() => {
        el.src = previewUrl;
        play();
      }, PREVIEW_DELAY_MS);
    }
    return () => {
      window.clearTimeout(timer);
      el.pause();
    };
  }, [active, previewUrl]);

  const finish = () => {
    setDone(true);
    setShowing(false);
  };

  return (
    <button
      ref={rootRef}
      type="button"
      className="mc-hero"
      onClick={onOpen}
      aria-label={`${video.title} 모먼트 넘겨보기`}
    >
      <VideoCover video={video} moments={moments} className="mc-hero-cover" eager />
      {canPreview && (
        <video
          ref={videoRef}
          className={`mc-hero-video${showing ? ' is-on' : ''}`}
          muted
          playsInline
          preload="none"
          aria-hidden
          onPlaying={() => setShowing(true)}
          onTimeUpdate={(e) => { if (e.currentTarget.currentTime >= PREVIEW_SECONDS) finish(); }}
          onEnded={finish}
        />
      )}
      <span className="mc-hero-ov">
        <span className="mc-hero-kick">
          {formatDotDate(video.date)} · {CATEGORY_LABEL[classifyVideo(video)]}
        </span>
        <span className="mc-hero-body">
          <span className="mc-hero-title">{video.title}</span>
          <span className="mc-hero-meta">모먼트 {moments.length}</span>
          <span className="mc-hero-play"><PlayIcon size={13} /> 넘겨보기</span>
        </span>
      </span>
    </button>
  );
}
