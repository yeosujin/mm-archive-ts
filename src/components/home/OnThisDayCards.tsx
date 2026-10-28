import { useEffect, useRef, useState } from 'react';
import type { StoryFrame, StoryYear } from '../../lib/onThisDayStory';
import { isSaveData, prefersReducedMotion } from '../../lib/networkPrefs';
import VideoCover from '../moments/VideoCover';
import { ChatIcon, PlayIcon, PostIcon } from '../Icons';

interface Props {
  /** null이면 같은 크기 스켈레톤 */
  years: StoryYear[] | null;
  /** 첫 카드 위 문구 */
  label: string;
  /** 뷰어가 열려 있으면 미리보기 정지 */
  paused: boolean;
  onOpen: (year: number) => void;
}

/** 첫 프레임이 영상이면 미리보기 주소 */
function previewUrlOf(frame: StoryFrame | undefined): string | undefined {
  if (frame?.kind === 'moment') return frame.moment.tweet_url;
  if (frame?.kind === 'post' && frame.media?.type === 'video') return frame.media.url;
  return undefined;
}

function FrameImage({ frame, eager }: { frame: StoryFrame | undefined; eager: boolean }) {
  const img = (src: string | undefined) =>
    src ? <img className="hm-card-img" src={src} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" /> : null;

  switch (frame?.kind) {
    case 'moment':
      return img(frame.moment.thumbnail_url);
    case 'video':
      return <VideoCover video={frame.video} moments={[]} className="hm-card-img" eager={eager} />;
    case 'photo':
      return img(frame.photo.image_url || frame.photo.thumbnail_url);
    case 'post': {
      const m = frame.media;
      if (!m) return <span className="hm-card-icon" aria-hidden><PostIcon size={44} /></span>;
      return img(m.type === 'video' ? m.thumbnail : m.url);
    }
    case 'episode':
      return <span className="hm-card-icon" aria-hidden><ChatIcon size={44} /></span>;
    default:
      return null;
  }
}

/** 보이는 카드의 음소거 반복 미리보기. 활성 카드에만 마운트된다 */
function CardPreview({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    el.src = src;
    el.play().catch(() => { /* 자동재생 막힘 → 이미지 그대로 */ });
    return () => {
      el.pause();
      el.removeAttribute('src');
      el.load();
    };
  }, [src]);

  return (
    <video
      ref={ref}
      className={`hm-card-video${showing ? ' is-on' : ''}`}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      onPlaying={() => setShowing(true)}
    />
  );
}

/** 연도별 그 해 오늘 카드 캐러셀 */
export default function OnThisDayCards({ years, label, paused, onOpen }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [canPreview] = useState(() => !prefersReducedMotion() && !isSaveData());
  const hasCards = !!years?.length;

  useEffect(() => {
    const el = railRef.current;
    if (!el || !canPreview || !hasCards) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [canPreview, hasCards]);

  // 가운데에 가장 가까운 카드
  const handleScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(rail.children).forEach((child, i) => {
      const el = child as HTMLElement;
      const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(best);
  };

  if (!years) {
    return (
      <section className="hm-otd" aria-busy="true" aria-label="로딩 중">
        <div className="hm-cards">
          <div className="hm-card skeleton-shimmer" />
        </div>
        <div className="hm-dots" />
      </section>
    );
  }

  if (!years.length) return null;

  return (
    <section className="hm-otd" aria-label="그 해 오늘">
      <div ref={railRef} className="hm-cards" onScroll={handleScroll}>
        {years.map((y, i) => {
          const first = y.frames[0];
          const preview = previewUrlOf(first);
          return (
            <button
              key={y.year}
              type="button"
              className="hm-card"
              onClick={() => onOpen(y.year)}
              aria-label={`${y.year}년 오늘 넘겨보기`}
            >
              <FrameImage frame={first} eager={i === 0} />
              {preview && canPreview && inView && !paused && i === active && (
                <CardPreview key={preview} src={preview} />
              )}
              <span className="hm-card-ov">
                <span className="hm-card-kick">{i === 0 ? label : ''}</span>
                <span className="hm-card-body">
                  <span className="hm-card-year">{y.year}년 오늘</span>
                  <span className="hm-card-meta">
                    {y.yearsAgo > 0 ? `${y.yearsAgo}년 전` : '올해'} · {y.frames.length}개
                  </span>
                  <span className="hm-card-play"><PlayIcon size={13} /> 넘겨보기</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="hm-dots" aria-hidden>
        {years.length > 1 && years.map((y, i) => <i key={y.year} className={i === active ? 'on' : ''} />)}
      </div>
    </section>
  );
}
