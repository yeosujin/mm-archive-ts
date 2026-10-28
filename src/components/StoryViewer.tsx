import { useCallback, useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import type { StoryFrame, StoryYear } from '../lib/onThisDayStory';
import { contentKey, frameDurationMs, frameMedia } from '../lib/onThisDayStory';
import { CloseIcon, VolumeOnIcon, VolumeOffIcon, ShareIcon, PlayIcon } from './Icons';
import { requestPlay, release } from '../lib/videoPlaybackCoordinator';
import { shareOrDownloadVideo } from '../lib/shareVideo';
import { getSessionSoundOn, setSessionSoundOn } from '../lib/viewerSound';
import { useStoryGestures } from '../hooks/useStoryGestures';
import { useData } from '../hooks/useData';
import { prefersReducedMotion } from '../lib/networkPrefs';
import StoryFrameView from './story/StoryFrameView';

interface Props {
  years: StoryYear[];
  /** 이 해부터 */
  startYear: number;
  /** 그 해의 몇 번째 프레임부터 (범위 밖이면 맞춘다) */
  startFrame?: number;
  /** 자동으로 열렸으면 음소거로 시작 (사용자 제스처가 없어 소리 재생이 막힌다) */
  autoStarted: boolean;
  /**
   * 그 해 frameIndex번째 프레임이 든 카드의 화면 위치. 열 때 그 카드에서 커지고, 닫을 때 그 카드로 줄어든다.
   * null이면(카드가 화면 밖 등) 가운데서 살짝 커지며/작아지며 나타나고 사라진다
   */
  originFor: (year: number, frameIndex: number) => StoryOrigin | null;
  /** 닫히는 중 (URL에선 이미 빠졌다 — 뒤로가기 포함). 카드로 줄어든 뒤 onExited */
  closing: boolean;
  /** 닫기 요청 (URL에서 뺀다) */
  onClose: () => void;
  /** 닫는 애니메이션이 끝남 — 이제 내려도 된다 */
  onExited: () => void;
}

/** 카드의 화면 위치(뷰포트 좌표)와 모양 */
export interface StoryOrigin {
  rect: { left: number; top: number; width: number; height: number };
  radius: number;
  /** 카드 이미지. 커지고 줄어드는 동안 이것을 보여준다 (없으면 카드 기본 배경) */
  image?: string;
}

interface Pos {
  yi: number;
  fi: number;
  /** 같은 프레임을 처음부터 다시 볼 때도 새로 그리도록 매 이동마다 올린다 */
  seq: number;
}

// 영상이 안 열리면 사진처럼 이 시간만큼 보여주고 넘긴다
const FAILED_VIDEO_MS = 5000;

// 카드에서 커지기 · 그 뒤 카드 그림이 걷히며 첫 장면이 드러나는 시간(이것까지 지나야 재생 시작) · 카드로 줄어들기
const ZOOM_MS = 450;
const SETTLE_MS = 250;
const SHRINK_MS = 400;
// 카드 위치를 모를 때 가운데서 커지기/작아지기, 동작 줄이기 설정이면 페이드
const POP_MS = 300;
const FADE_MS = 200;
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const FULL_TRANSFORM = 'translate(0px, 0px) scale(1)';
const FULL_CLIP = 'inset(0px 0px round 0px)';

/**
 * 전체 화면 창(vw×vh, transform-origin 왼쪽 위)을 카드 자리에 겹치는 값.
 * 비율을 지키려고 한 배율 s로 줄이고(카드를 덮는 쪽), 남는 부분은 clip-path로 가운데만 남긴다.
 * box는 그 남는 영역(창 좌표) — 카드 그림을 여기에 cover로 채우면 화면에서 카드와 똑같이 보인다
 */
function fitToCard({ rect, radius }: StoryOrigin, vw: number, vh: number) {
  const s = Math.max(rect.width / vw, rect.height / vh);
  const w = rect.width / s;
  const h = rect.height / s;
  const ix = (vw - w) / 2;
  const iy = (vh - h) / 2;
  return {
    // 창의 점 (x, y) → (tx + s·x, ty + s·y). 남는 영역의 왼쪽 위 (ix, iy)가 카드 왼쪽 위에 오게
    transform: `translate(${rect.left - s * ix}px, ${rect.top - s * iy}px) scale(${s})`,
    clipPath: `inset(${iy}px ${ix}px round ${radius / s}px)`,
    box: { left: `${ix}px`, top: `${iy}px`, width: `${w}px`, height: `${h}px` },
  };
}

const fullBox = (vw: number, vh: number) => ({ left: '0px', top: '0px', width: `${vw}px`, height: `${vh}px` });

/** 가운데를 기준으로 k배 (transform-origin이 왼쪽 위라 직접 옮긴다) */
const centerScale = (k: number, vw: number, vh: number, dy = 0) =>
  `translate(${((1 - k) * vw) / 2}px, ${((1 - k) * vh) / 2 + dy}px) scale(${k})`;

function setGhostImage(img: HTMLImageElement, src: string | undefined) {
  if (src) {
    img.src = src;
    img.hidden = false;
  } else {
    img.removeAttribute('src');
    img.hidden = true;
  }
}

function isSaveData(): boolean {
  const conn = (navigator as { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}


function isVideoFrame(f: StoryFrame | undefined): boolean {
  return f?.kind === 'moment' || (f?.kind === 'post' && f.media?.type === 'video');
}

/** 미디어(영상·사진)를 받아야 보이는 프레임 — 받는 동안 스피너 */
function hasMedia(f: StoryFrame | undefined): boolean {
  if (!f) return false;
  return f.kind === 'moment' || f.kind === 'photo' || (f.kind === 'post' && !!f.media);
}

export default function StoryViewer({ years, startYear, startFrame = 0, autoStarted, originFor, closing, onClose, onExited }: Props) {
  const { memberSettings } = useData();
  const [pos, setPos] = useState<Pos>(() => {
    const yi = Math.max(0, years.findIndex(y => y.year === startYear));
    const last = Math.max(0, (years[yi]?.frames.length ?? 1) - 1);
    return { yi, fi: Math.min(Math.max(0, Math.floor(startFrame)), last), seq: 0 };
  });
  const [soundOn, setSoundOn] = useState(() => !autoStarted && getSessionSoundOn());
  const [held, setHeld] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  // 음소거로도 재생이 막힌 경우(저전력 모드 등) 가운데 재생 버튼
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(() => hasMedia(years[pos.yi]?.frames[pos.fi]));
  const [downloading, setDownloading] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  // 커지고 줄어드는 동안 창을 덮는 카드 그림
  const ghostRef = useRef<HTMLDivElement>(null);
  const ghostImgRef = useRef<HTMLImageElement>(null);
  const animsRef = useRef<Animation[]>([]);
  const fillRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // 이벤트·rAF에서 바로 읽는 현재 위치 (렌더 전에 두 번 넘겨도 같은 칸을 두 번 밟지 않게)
  const posRef = useRef(pos);
  const elapsedRef = useRef(0);
  const videoFailedRef = useRef(false);
  const soundRef = useRef(soundOn);
  const closedRef = useRef(false);
  // 미리 받는 영상. 참조를 쥐고 있어야 받기가 이어진다
  const preloadRef = useRef<HTMLVideoElement | null>(null);

  const year = years[pos.yi];
  const frame = year?.frames[pos.fi];
  // 열리는 애니메이션이 끝날 때까지는 재생·진행을 멈춰 둔다 — 화면이 다 열린 뒤 부드럽게 시작
  const [entering, setEntering] = useState(true);
  const paused = held || userPaused || sheetOpen || hidden || entering || closing;

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  }, [onClose]);


  const go = (yi: number, fi: number) => {
    const next = { yi, fi, seq: posRef.current.seq + 1 };
    posRef.current = next;
    elapsedRef.current = 0;
    videoFailedRef.current = false;
    setPos(next);
    setUserPaused(false);
    setBlocked(false);
    setLoading(hasMedia(years[yi]?.frames[fi]));
  };

  const next = () => {
    const { yi, fi } = posRef.current;
    if (fi + 1 < years[yi].frames.length) go(yi, fi + 1);
    else if (yi + 1 < years.length) go(yi + 1, 0);
    else close();
  };

  // 해 첫 프레임에서 이전 → 이전 해 마지막 프레임. 맨 처음이면 처음부터 다시
  const prev = () => {
    const { yi, fi } = posRef.current;
    if (fi > 0) go(yi, fi - 1);
    else if (yi > 0) go(yi - 1, years[yi - 1].frames.length - 1);
    else go(0, 0);
  };

  const nextYear = () => {
    const { yi } = posRef.current;
    if (yi + 1 < years.length) go(yi + 1, 0);
    else close();
  };

  const prevYear = () => go(Math.max(0, posRef.current.yi - 1), 0);

  const gestures = useStoryGestures(rootRef, {
    onTapPrev: () => { prev(); },
    onTapNext: () => { next(); },
    onSwipePrev: () => { prevYear(); },
    onSwipeNext: () => { nextYear(); },
    onHoldStart: () => setHeld(true),
    onHoldEnd: () => setHeld(false),
    onDismiss: close,
  });

  // muted를 먼저 지정한 뒤 재생. 소리 재생이 막히면 음소거로 다시, 그것도 막히면 재생 버튼
  const playWithFallback = (video: HTMLVideoElement) => {
    const seq = posRef.current.seq;
    video.muted = !soundRef.current;
    requestPlay(video);
    video.play().catch((err: unknown) => {
      if (posRef.current.seq !== seq) return;
      // AbortError(빠르게 넘겨서 pause된 경우)는 정책 차단이 아니다
      if (!(err instanceof Error) || err.name !== 'NotAllowedError') return;
      if (!video.muted) {
        video.muted = true;
        soundRef.current = false;
        setSessionSoundOn(false);
        setSoundOn(false);
        video.play().catch(() => { if (posRef.current.seq === seq) setBlocked(true); });
      } else {
        setBlocked(true);
      }
    });
  };

  // 프레임이 바뀌거나 멈춤이 풀리면 재생, 멈추면 정지
  const syncPlayback = useEffectEvent((isPaused: boolean) => {
    const video = videoRef.current;
    if (!video) return;
    if (isPaused) video.pause();
    else if (!blocked) playWithFallback(video);
  });

  useEffect(() => syncPlayback(paused), [pos.seq, paused]);

  // 다음 프레임 미디어 미리 받기
  const preloadNext = useEffectEvent(() => {
    if (isSaveData()) return;
    const { yi, fi } = posRef.current;
    const upcoming = years[yi]?.frames[fi + 1] ?? years[yi + 1]?.frames[0];
    const { video, image } = frameMedia(upcoming);
    if (image) new Image().src = image;
    if (video && preloadRef.current?.src !== video) {
      const el = document.createElement('video');
      el.preload = 'auto';
      el.muted = true;
      el.src = video;
      preloadRef.current = el;
    }
  });

  useEffect(() => preloadNext(), [pos.seq]);

  // 진행: 시간 프레임은 경과 시간, 영상 프레임은 재생 위치. 멈춤 동안은 그대로
  const onTick = useEffectEvent((dt: number) => {
    if (closedRef.current || !frame) return;
    const video = videoRef.current;
    let duration = frameDurationMs(frame);
    if (duration === null && videoFailedRef.current) duration = FAILED_VIDEO_MS;
    let pct = 0;
    if (duration === null) {
      if (video?.duration) pct = video.currentTime / video.duration;
    } else {
      if (!paused) elapsedRef.current += dt;
      pct = elapsedRef.current / duration;
      if (pct >= 1) { next(); return; }
    }
    if (fillRef.current) fillRef.current.style.width = `${Math.min(100, pct * 100)}%`;
    // 에피소드: 긴 대화는 진행에 맞춰 아래로 내린다
    const chat = scrollRef.current;
    if (frame.kind === 'episode' && chat) chat.scrollTop = pct * (chat.scrollHeight - chat.clientHeight);
  });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      // 탭이 가려져 오래 멈췄다 돌아와도 한 번에 넘어가지 않게 간격 상한
      onTick(Math.min(100, t - last));
      last = t;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 앱 전환·화면 꺼짐이면 멈춤
  useEffect(() => {
    const handler = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  // body 스크롤 잠금 + 언마운트 시 영상 정지. 카드 위치를 재기 전에 잠근다(아래 열기보다 먼저 선언).
  // 스크롤바가 자리를 차지하는 화면(PC)에선 그만큼 오른쪽 여백을 줘 페이지가 옆으로 밀리지 않게
  useLayoutEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    const videoBox = videoRef;
    const anims = animsRef;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      anims.current.forEach(a => a.cancel());
      const video = videoBox.current;
      if (video) { video.pause(); release(video); }
      preloadRef.current?.removeAttribute('src');
    };
  }, []);

  // 열기: 카드 자리에서 카드 그림을 보이며 전체 화면으로 커진 뒤, 그림이 걷히며 첫 장면이 드러난다.
  // 재생·진행을 시작할 때까지의 시간(ms)을 돌려준다
  const animateOpen = useEffectEvent((): number => {
    const root = rootRef.current;
    const ghost = ghostRef.current;
    const img = ghostImgRef.current;
    const backdrop = backdropRef.current;
    if (!root || !ghost || !img || !backdrop) return 0;
    const reduced = prefersReducedMotion();
    const origin = reduced ? null : originFor(years[pos.yi].year, pos.fi);
    const vw = root.clientWidth;
    const vh = root.clientHeight;

    if (!origin) {
      const ms = reduced ? FADE_MS : POP_MS;
      const from = reduced ? FULL_TRANSFORM : centerScale(0.94, vw, vh);
      animsRef.current = [
        root.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: FULL_TRANSFORM }], { duration: ms, easing: EASE }),
        backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'ease-out' }),
      ];
      return reduced ? ms : ms + SETTLE_MS;
    }

    const fit = fitToCard(origin, vw, vh);
    setGhostImage(img, origin.image);
    const timing = { duration: ZOOM_MS, easing: EASE };
    animsRef.current = [
      root.animate([{ transform: fit.transform, clipPath: fit.clipPath }, { transform: FULL_TRANSFORM, clipPath: FULL_CLIP }], timing),
      ghost.animate([fit.box, fullBox(vw, vh)], timing),
      // 다 커질 때까지는 카드 그림 그대로, 그 뒤 걷힌다
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SETTLE_MS, delay: ZOOM_MS, easing: 'ease', fill: 'backwards' }),
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], timing),
    ];
    return ZOOM_MS + SETTLE_MS;
  });

  useLayoutEffect(() => {
    const t = window.setTimeout(() => setEntering(false), animateOpen());
    return () => window.clearTimeout(t);
  }, []);

  // 닫기: 지금 보고 있는 콘텐츠의 카드로 줄어든다(손으로 내리던 중이면 그 자리에서). 카드를 못 찾으면 작아지며 사라진다
  const animateClose = useEffectEvent(() => {
    closedRef.current = true;
    const root = rootRef.current;
    const ghost = ghostRef.current;
    const img = ghostImgRef.current;
    const backdrop = backdropRef.current;
    if (!root || !ghost || !img || !backdrop) {
      onExited();
      return;
    }
    // 열리던 중이어도 지금 모습에서 이어지게 현재 값을 읽고 멈춘다
    const rs = getComputedStyle(root);
    const gs = getComputedStyle(ghost);
    const from = {
      transform: rs.transform === 'none' ? FULL_TRANSFORM : rs.transform,
      clipPath: rs.clipPath === 'none' ? FULL_CLIP : rs.clipPath,
      opacity: rs.opacity,
    };
    const ghostFrom = { box: { left: gs.left, top: gs.top, width: gs.width, height: gs.height }, opacity: gs.opacity };
    const backdropFrom = getComputedStyle(backdrop).opacity;
    animsRef.current.forEach(a => a.cancel());

    const reduced = prefersReducedMotion();
    const { yi, fi } = posRef.current;
    const origin = reduced ? null : originFor(years[yi].year, fi);
    const vw = root.clientWidth;
    const vh = root.clientHeight;
    const fill = 'forwards' as const;
    let main: Animation;

    if (origin) {
      const fit = fitToCard(origin, vw, vh);
      setGhostImage(img, origin.image);
      const timing = { duration: SHRINK_MS, easing: EASE, fill };
      main = root.animate([{ transform: from.transform, clipPath: from.clipPath }, { transform: fit.transform, clipPath: fit.clipPath }], timing);
      animsRef.current = [
        main,
        ghost.animate([ghostFrom.box, fit.box], timing),
        // 앞부분에 카드 그림이 덮여, 다 줄어들면 카드 그대로
        ghost.animate([{ opacity: ghostFrom.opacity }, { opacity: 1 }], { duration: SHRINK_MS * 0.4, easing: 'ease-out', fill }),
        backdrop.animate([{ opacity: backdropFrom }, { opacity: 0 }], timing),
      ];
    } else {
      const ms = reduced ? FADE_MS : POP_MS;
      const dy = root.getBoundingClientRect().top; // 손으로 내린 만큼
      const to = reduced ? from.transform : centerScale(0.92, vw, vh, dy);
      const timing = { duration: ms, easing: 'ease-out', fill };
      main = root.animate([{ ...from }, { transform: to, clipPath: from.clipPath, opacity: 0 }], timing);
      animsRef.current = [main, backdrop.animate([{ opacity: backdropFrom }, { opacity: 0 }], timing)];
    }
    main.finished.then(() => onExited(), () => { /* 언마운트로 취소됨 */ });
  });

  useLayoutEffect(() => {
    if (closing) animateClose();
  }, [closing]);

  // 키보드(PC): ←/→ 프레임, ↑/↓ 해, Esc 닫기(시트가 열려 있으면 시트), Space 멈춤
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (sheetOpen) setSheetOpen(false);
      else close();
      return;
    }
    if (sheetOpen) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); nextYear(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); prevYear(); }
    else if (e.key === ' ') { e.preventDefault(); setUserPaused(p => !p); }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleSound = () => {
    const on = !soundOn;
    soundRef.current = on;
    setSessionSoundOn(on);
    setSoundOn(on);
    if (videoRef.current) videoRef.current.muted = !on;
  };

  const handleSave = async () => {
    if (downloading || frame?.kind !== 'moment') return;
    try {
      setDownloading(true);
      await shareOrDownloadVideo(frame.moment.tweet_url);
    } finally {
      setDownloading(false);
    }
  };

  const playBlocked = () => {
    setBlocked(false);
    if (videoRef.current) playWithFallback(videoRef.current);
  };

  const onVideoError = () => { videoFailedRef.current = true; setLoading(false); };
  const onVideoWaiting = () => setLoading(true);
  const onVideoPlaying = () => setLoading(false);
  const onImageDone = () => setLoading(false);

  if (!year || !frame) return null;
  const post = frame.kind === 'post' ? frame.post : null;

  return (
    <>
      <div ref={backdropRef} className="st-backdrop" aria-hidden />
      <div ref={rootRef} className={closing ? 'st is-closing' : 'st'} role="dialog" aria-modal="true" aria-label="그 해 오늘">
        <div className="st-stage" {...gestures}>
          <StoryFrameView
            key={`${frame.key}:${pos.seq}`}
            frame={frame}
            memberSettings={memberSettings}
            videoRef={videoRef}
            scrollRef={scrollRef}
            onVideoEnded={next}
            onVideoError={onVideoError}
            onVideoWaiting={onVideoWaiting}
            onVideoPlaying={onVideoPlaying}
            onImageDone={onImageDone}
            onMore={() => setSheetOpen(true)}
          />
          {blocked && (
            <button type="button" className="st-play" onClick={playBlocked} aria-label="재생">
              <PlayIcon size={44} />
            </button>
          )}
          {userPaused && !blocked && <span className="st-paused" aria-hidden><PlayIcon size={44} /></span>}
          {loading && !paused && !blocked && <span className="st-spinner" aria-hidden />}
        </div>

        <div className="st-top">
          {/* 모든 해의 프레임을 한 줄로. 프레임 사이는 좁게, 해 사이는 넓게 띄운다 */}
          <div className="st-bars">
            {years.map((y, yi) => (
              <span key={y.year} className="st-bars-year" style={{ flexGrow: y.frames.length }}>
                {y.frames.map((f, i) => {
                  const current = yi === pos.yi && i === pos.fi;
                  const done = yi < pos.yi || (yi === pos.yi && i < pos.fi);
                  // 앞 프레임과 다른 콘텐츠(다른 영상·사진 묶음·포스트·에피소드)면 조금 더 띄운다
                  const newContent = i > 0 && contentKey(y.frames[i - 1]) !== contentKey(f);
                  return (
                    <i key={f.key} className={newContent ? 'is-new' : undefined}>
                      <b ref={current ? fillRef : undefined} style={current ? undefined : { width: done ? '100%' : '0%' }} />
                    </i>
                  );
                })}
              </span>
            ))}
          </div>
          <div className="st-row">
            <span className="st-label">{year.label ?? `${year.year}년 오늘${year.yearsAgo > 0 ? ` · ${year.yearsAgo}년 전` : ''}`}</span>
            <span className="st-actions">
              {isVideoFrame(frame) && (
                <button type="button" className="st-btn" onClick={toggleSound} aria-label={soundOn ? '음소거' : '소리 켜기'}>
                  {soundOn ? <VolumeOnIcon size={24} /> : <VolumeOffIcon size={24} />}
                </button>
              )}
              <button type="button" className="st-btn" onClick={close} aria-label="닫기">
                <CloseIcon size={24} />
              </button>
            </span>
          </div>
        </div>

        {frame.kind === 'moment' && (
          <div className="st-side">
            <button type="button" className="st-btn" onClick={handleSave} disabled={downloading} aria-label="저장">
              {downloading ? <span className="st-btn-spinner" /> : <ShareIcon size={24} />}
            </button>
          </div>
        )}


        {post && (
          <>
            <div className={`st-dim${sheetOpen ? ' is-on' : ''}`} onClick={() => setSheetOpen(false)} />
            <div className={`st-sheet${sheetOpen ? ' is-on' : ''}`} aria-hidden={!sheetOpen}>
              <div className="st-grab" />
              {post.content?.trim() || post.title}
            </div>
          </>
        )}

        <div ref={ghostRef} className="st-ghost" aria-hidden>
          <img ref={ghostImgRef} alt="" hidden />
        </div>
      </div>
    </>
  );
}
