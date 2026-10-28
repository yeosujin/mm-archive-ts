import { memo, useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import type { Moment } from '../lib/database/types';
import { CloseIcon, VolumeOnIcon, VolumeOffIcon, ShareIcon, PlayIcon } from './Icons';
import { requestPlay, release } from '../lib/videoPlaybackCoordinator';
import { shareOrDownloadVideo } from '../lib/shareVideo';

interface Props {
  /** 넘길 순서 그대로 */
  moments: Moment[];
  startIndex: number;
  onClose: () => void;
}

const HINT_KEY = 'mmemory.viewerHintSeen';

// 소리 상태는 뷰어를 닫았다 열어도 페이지 세션 동안 유지한다
let sessionSoundOn = true;

function isSaveData(): boolean {
  const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function readHintSeen(): boolean {
  try { return localStorage.getItem(HINT_KEY) !== null; } catch { return true; }
}

interface SlideProps {
  moment: Moment;
  index: number;
  paused: boolean;
  loading: boolean;
  registerVideo: (index: number, el: HTMLVideoElement | null) => void;
  onTap: () => void;
  onEnded: (index: number) => void;
  onTimeUpdate: (index: number, video: HTMLVideoElement) => void;
  onPlaying: (index: number) => void;
}

// 장 하나. 상태 변화(드래그 라벨 등)마다 전체 장이 다시 그려지지 않도록 memo
const Slide = memo(({ moment, index, paused, loading, registerVideo, onTap, onEnded, onTimeUpdate, onPlaying }: SlideProps) => {
  const thumb = moment.thumbnail_url;
  return (
    <div className="mv-slide" data-index={index}>
      {thumb && <div className="mv-bg" style={{ backgroundImage: `url("${thumb}")` }} />}
      {/* src는 활성/다음 장이 될 때 JS로 넣는다 */}
      <video
        ref={(el) => registerVideo(index, el)}
        className="mv-video"
        playsInline
        preload="none"
        poster={thumb}
        onClick={onTap}
        onEnded={() => onEnded(index)}
        onTimeUpdate={(e) => onTimeUpdate(index, e.currentTarget)}
        onPlaying={() => onPlaying(index)}
      />
      {paused && <span className="mv-paused" aria-hidden><PlayIcon size={44} /></span>}
      {loading && !paused && <span className="mv-spinner" aria-hidden />}
    </div>
  );
});

export default function MomentViewer({ moments, startIndex, onClose }: Props) {
  // 시작 위치는 마운트 시점 값으로 고정
  const [initialIndex] = useState(() => Math.min(Math.max(0, startIndex), Math.max(0, moments.length - 1)));
  const [active, setActive] = useState(initialIndex);
  const [soundOn, setSoundOn] = useState(sessionSoundOn);
  const [pausedIndex, setPausedIndex] = useState<number | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [hintVisible, setHintVisible] = useState(() => !readHintSeen());
  // 드래그 중 표시할 `0:12 / 0:48`. null이면 드래그 아님
  const [dragLabel, setDragLabel] = useState<string | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLElement>(null);
  // 장 순서대로의 video. 언마운트 정리에 쓰므로 null로 지우지 않는다
  const videosRef = useRef<HTMLVideoElement[]>([]);
  const activeRef = useRef(initialIndex);
  const draggingRef = useRef(false);
  // 첫 위치 이동이 끝나기 전 관찰 결과는 무시 (위 edge가 잠깐 보여 바로 닫히는 것 방지)
  const positionedRef = useRef(false);
  const closedRef = useRef(false);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);

  const registerVideo = useCallback((index: number, el: HTMLVideoElement | null) => {
    if (el) videosRef.current[index] = el;
  }, []);

  // muted를 먼저 속성으로 지정한 뒤 재생. 소리 재생이 막히면 음소거로 다시 시도
  const playWithFallback = useCallback((video: HTMLVideoElement, index: number) => {
    video.muted = !sessionSoundOn;
    // 코디네이터: 다른 VideoPlayer가 재생 중이면 멈춘다 (내부 play() 실패는 무시됨)
    requestPlay(video);
    video.play().catch((err: unknown) => {
      if (activeRef.current !== index) return;
      // AbortError(빠르게 넘겨서 pause된 경우)는 정책 차단이 아니다
      if (!(err instanceof Error) || err.name !== 'NotAllowedError') return;
      if (!video.muted) {
        video.muted = true;
        sessionSoundOn = false;
        setSoundOn(false);
        video.play().catch(() => setPausedIndex(index));
      } else {
        setPausedIndex(index);
      }
    });
  }, []);

  const scrollToSlide = useCallback((domIndex: number, smooth = true) => {
    const target = feedRef.current?.children[domIndex] as HTMLElement | undefined;
    if (target) feedRef.current?.scrollTo({ top: target.offsetTop, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const togglePlay = useCallback(() => {
    const i = activeRef.current;
    const video = videosRef.current[i];
    if (!video) return;
    if (video.paused) {
      setPausedIndex(null);
      playWithFallback(video, i);
    } else {
      video.pause();
      setPausedIndex(i);
    }
  }, [playWithFallback]);

  const lastIndex = moments.length - 1;
  const handleEnded = useCallback((index: number) => {
    if (index !== activeRef.current) return;
    // 다음 장으로 자동 스크롤. 마지막 장이면 그 자리에서 정지 (닫지 않음)
    if (index < lastIndex) scrollToSlide(index + 2);
    else setPausedIndex(index);
  }, [lastIndex, scrollToSlide]);

  const handleTimeUpdate = useCallback((index: number, video: HTMLVideoElement) => {
    if (index !== activeRef.current || draggingRef.current || !video.duration || !fillRef.current) return;
    fillRef.current.style.width = `${(video.currentTime / video.duration) * 100}%`;
  }, []);

  const handlePlaying = useCallback((index: number) => {
    setLoadingIndex((cur) => (cur === index ? null : cur));
  }, []);

  // 관찰자가 새 장을 활성으로 판정
  const onSlideVisible = useEffectEvent((target: HTMLElement) => {
    if (!positionedRef.current) return;
    if (target.dataset.edge) {
      close();
      return;
    }
    const i = Number(target.dataset.index);
    if (Number.isNaN(i) || i === activeRef.current) return;
    activeRef.current = i;
    setActive(i);
    setPausedIndex(null);
    setLoadingIndex(null);
    // 안내는 처음 넘기는 순간 숨기고 기록
    if (hintVisible) {
      setHintVisible(false);
      try { localStorage.setItem(HINT_KEY, '1'); } catch { /* noop */ }
    }
  });

  // 첫 위치 이동 + 관찰자 (마운트 1회)
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    // 위 edge 때문에 +1. 스냅을 잠깐 끄고 이동, 다음 프레임에 복원
    feed.style.scrollSnapType = 'none';
    feed.scrollTop = feed.clientHeight * (initialIndex + 1);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      feed.scrollTop = feed.clientHeight * (initialIndex + 1);
      feed.style.scrollSnapType = '';
      raf2 = requestAnimationFrame(() => { positionedRef.current = true; });
    });

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) onSlideVisible(e.target as HTMLElement);
      }
    }, { root: feed, threshold: 0.6 });
    Array.from(feed.children).forEach((el) => io.observe(el));

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      io.disconnect();
    };
  }, [initialIndex]);

  // 활성 장 재생 + 다음 장 미리 받기 + 0.3초 넘으면 로딩 표시
  const activate = useEffectEvent((i: number) => {
    const videos = videosRef.current;
    videos.forEach((v, j) => { if (j !== i) v.pause(); });
    if (fillRef.current) fillRef.current.style.width = '0%';

    const video = videos[i];
    const moment = moments[i];
    if (!video || !moment) return undefined;
    if (!video.src) video.src = moment.tweet_url;
    video.currentTime = 0;
    playWithFallback(video, i);

    const next = videos[i + 1];
    const nextMoment = moments[i + 1];
    if (next && nextMoment && !next.src && !isSaveData()) {
      next.preload = 'auto';
      next.src = nextMoment.tweet_url;
    }

    const timer = window.setTimeout(() => {
      if (video.paused || video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) setLoadingIndex(i);
    }, 300);
    return () => window.clearTimeout(timer);
  });

  useEffect(() => activate(active), [active]);

  // body 스크롤 잠금 + 언마운트 시 모든 영상 정지
  useEffect(() => {
    const videos = videosRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      videos.forEach((v) => { v.pause(); release(v); });
    };
  }, []);

  // 키보드(PC): ↑/↓ 이전/다음, Esc 닫기, Space 재생/정지
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const i = activeRef.current;
    if (e.key === 'ArrowDown') { e.preventDefault(); scrollToSlide(i + 2); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); scrollToSlide(i); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    sessionSoundOn = next;
    setSoundOn(next);
    const video = videosRef.current[activeRef.current];
    if (video) video.muted = !next;
  };

  const handleSave = async () => {
    const moment = moments[activeRef.current];
    if (downloading || !moment) return;
    try {
      setDownloading(true);
      await shareOrDownloadVideo(moment.tweet_url);
    } finally {
      setDownloading(false);
    }
  };

  // 재생바: 누르면 두꺼워지고 드래그로 탐색, 드래그 중에만 시간 표시
  const seekTo = (clientX: number) => {
    const video = videosRef.current[activeRef.current];
    const bar = seekRef.current;
    if (!video || !bar || !video.duration) return;
    const r = bar.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    video.currentTime = p * video.duration;
    if (fillRef.current) fillRef.current.style.width = `${p * 100}%`;
    setDragLabel(`${formatTime(video.currentTime)} / ${formatTime(video.duration)}`);
  };

  const handleSeekDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragLabel('');
    seekTo(e.clientX);
  };

  const handleSeekMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seekTo(e.clientX);
  };

  const handleSeekEnd = () => {
    draggingRef.current = false;
    setDragLabel(null);
  };

  return (
    <div className="mv" role="dialog" aria-modal="true" aria-label="모먼트 보기">
      <div className="mv-feed" ref={feedRef}>
        <div className="mv-slide mv-edge" data-edge="top" />
        {moments.map((m, i) => (
          <Slide
            key={m.id}
            moment={m}
            index={i}
            paused={pausedIndex === i}
            loading={loadingIndex === i && active === i}
            registerVideo={registerVideo}
            onTap={togglePlay}
            onEnded={handleEnded}
            onTimeUpdate={handleTimeUpdate}
            onPlaying={handlePlaying}
          />
        ))}
        <div className="mv-slide mv-edge" data-edge="bottom" />
      </div>

      <div className="mv-top">
        <button type="button" className="mv-btn mv-close" onClick={close} aria-label="닫기">
          <CloseIcon size={24} />
        </button>
        <span className="mv-count">{active + 1} / {moments.length}</span>
      </div>

      <div className="mv-side">
        <button type="button" className="mv-btn" onClick={toggleSound} aria-label={soundOn ? '음소거' : '소리 켜기'}>
          {soundOn ? <VolumeOnIcon size={22} /> : <VolumeOffIcon size={22} />}
        </button>
        <button type="button" className="mv-btn" onClick={handleSave} disabled={downloading} aria-label="저장">
          {downloading ? <span className="mv-btn-spinner" /> : <ShareIcon size={20} />}
        </button>
      </div>

      {dragLabel && <div className="mv-seek-time">{dragLabel}</div>}
      <div
        ref={seekRef}
        className={`mv-seek${dragLabel !== null ? ' is-drag' : ''}`}
        onPointerDown={handleSeekDown}
        onPointerMove={handleSeekMove}
        onPointerUp={handleSeekEnd}
        onPointerCancel={handleSeekEnd}
      >
        <div className="mv-seek-track"><i ref={fillRef} className="mv-seek-fill" /></div>
      </div>

      {hintVisible && (
        <div className="mv-hint" aria-hidden>
          <span className="mv-hint-arrow">︿</span>
          <span className="mv-hint-text">위로 넘겨 다음</span>
        </div>
      )}
    </div>
  );
}
