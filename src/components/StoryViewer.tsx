import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import type { StoryFrame, StoryYear } from '../lib/onThisDayStory';
import { frameDurationMs, frameMedia } from '../lib/onThisDayStory';
import { CloseIcon, VolumeOnIcon, VolumeOffIcon, ShareIcon, PlayIcon } from './Icons';
import { requestPlay, release } from '../lib/videoPlaybackCoordinator';
import { shareOrDownloadVideo } from '../lib/shareVideo';
import { getSessionSoundOn, setSessionSoundOn } from '../lib/viewerSound';
import { useStoryGestures } from '../hooks/useStoryGestures';
import { useData } from '../hooks/useData';
import StoryFrameView from './story/StoryFrameView';

interface Props {
  years: StoryYear[];
  /** 이 해 첫 프레임부터 */
  startYear: number;
  /** 자동으로 열렸으면 음소거로 시작 (사용자 제스처가 없어 소리 재생이 막힌다) */
  autoStarted: boolean;
  /** 로딩 화면을 바로 이어받을 때: 올라오는 애니메이션 없이 */
  instant?: boolean;
  onClose: () => void;
}

interface Pos {
  yi: number;
  fi: number;
  /** 같은 프레임을 처음부터 다시 볼 때도 새로 그리도록 매 이동마다 올린다 */
  seq: number;
}

// 영상이 안 열리면 사진처럼 이 시간만큼 보여주고 넘긴다
const FAILED_VIDEO_MS = 5000;

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

export default function StoryViewer({ years, startYear, autoStarted, instant = false, onClose }: Props) {
  const { memberSettings } = useData();
  const [pos, setPos] = useState<Pos>(() => ({ yi: Math.max(0, years.findIndex(y => y.year === startYear)), fi: 0, seq: 0 }));
  const [soundOn, setSoundOn] = useState(() => !autoStarted && getSessionSoundOn());
  const [held, setHeld] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hidden, setHidden] = useState(() => document.hidden);
  // 음소거로도 재생이 막힌 경우(저전력 모드 등) 가운데 재생 버튼
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(() => hasMedia(years[pos.yi]?.frames[0]));
  const [downloading, setDownloading] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
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
  const paused = held || userPaused || sheetOpen || hidden;

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

  // body 스크롤 잠금 + 언마운트 시 영상 정지
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const videoBox = videoRef;
    return () => {
      document.body.style.overflow = prevOverflow;
      const video = videoBox.current;
      if (video) { video.pause(); release(video); }
      preloadRef.current?.removeAttribute('src');
    };
  }, []);

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
    <div ref={rootRef} className={instant ? 'st is-instant' : 'st'} role="dialog" aria-modal="true" aria-label="그 해 오늘">
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
        <div className="st-bars">
          {year.frames.map((f, i) => (
            <i key={`${pos.yi}:${f.key}`}>
              <b ref={i === pos.fi ? fillRef : undefined} style={i === pos.fi ? undefined : { width: i < pos.fi ? '100%' : '0%' }} />
            </i>
          ))}
        </div>
        <div className="st-row">
          <span className="st-label">{year.year}년 오늘{year.yearsAgo > 0 ? ` · ${year.yearsAgo}년 전` : ''}</span>
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
    </div>
  );
}
