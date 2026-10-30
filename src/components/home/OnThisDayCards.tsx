import { useEffect, useMemo, useRef, useState } from 'react';
import type { StoryContent, StoryFrame, StoryYear } from '../../lib/onThisDayStory';
import { groupStoryContents } from '../../lib/onThisDayStory';
import type { Episode, Post } from '../../lib/database/types';
import { detectPlatformName, getPlatformName } from '../../lib/platformUtils';
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
  /** 들어 올려 보일 카드 `YEAR:startIndex` (자동 열기 직전 — 이 카드에서 열린다) */
  liftCard?: string | null;
  /** 그 해 frameIndex번째 프레임부터 연다 */
  onOpen: (year: number, frameIndex: number) => void;
}

const EPISODE_LABEL: Record<Episode['episode_type'], string> = {
  dm: 'DM',
  comment: '댓글',
  listening_party: '리스닝 파티',
};

function platformOf(post: Post): string {
  return (post.platform === 'other' ? detectPlatformName(post.url) : getPlatformName(post.platform)) || '포스트';
}

/** 카드 글: 제목(두 줄까지) + 짧은 설명 */
function cardText(group: StoryContent): { title: string; meta: string } {
  const f = group.frames[0];
  const n = group.frames.length;
  switch (f.kind) {
    case 'moment': return { title: f.video?.title || f.moment.title, meta: `모먼트 ${n}` };
    case 'video': return { title: f.video.title, meta: '보러가기' };
    case 'photo': return { title: f.title, meta: `사진 ${n}장` };
    case 'post': {
      const title = f.post.title?.trim() || f.post.content?.trim().split('\n')[0] || '';
      return { title, meta: platformOf(f.post) };
    }
    case 'episode': {
      const label = EPISODE_LABEL[f.episode.episode_type] ?? '에피소드';
      return f.episode.title ? { title: f.episode.title, meta: label } : { title: label, meta: '' };
    }
  }
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

/** 미리보기 재생 횟수. 다 돌면 썸네일로 돌아간다 */
const PREVIEW_PLAYS = 2;

/** 보이는 카드의 음소거 미리보기(2번 재생). 활성 카드에만 마운트된다 */
function CardPreview({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const playsRef = useRef(0);
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
      playsInline
      preload="none"
      aria-hidden
      onPlaying={() => setShowing(true)}
      onEnded={(e) => {
        playsRef.current += 1;
        if (playsRef.current < PREVIEW_PLAYS) {
          e.currentTarget.currentTime = 0;
          e.currentTarget.play().catch(() => setShowing(false));
        } else {
          setShowing(false); // 영상이 흐려지며 썸네일이 다시 보인다
        }
      }}
    />
  );
}

/** 그 해 오늘 콘텐츠 카드. 해마다 머리말 + 카드 줄, 전체가 한 줄로 가로 스크롤 */
export default function OnThisDayCards({ years, label, paused, liftCard = null, onOpen }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [canPreview] = useState(() => !prefersReducedMotion() && !isSaveData());
  const hasCards = !!years?.length;

  // 해마다 콘텐츠 묶음. index는 전체 카드 순번 (미리보기 대상 고르기용)
  const groups = useMemo(() => {
    let index = 0;
    return (years ?? []).map(y => ({
      year: y,
      contents: groupStoryContents(y).map(content => ({ content, index: index++ })),
    }));
  }, [years]);

  useEffect(() => {
    const el = railRef.current;
    if (!el || !canPreview || !hasCards) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [canPreview, hasCards]);

  // 스크롤 영역 가운데에 가장 가까운 카드 (카드 순서 = 전체 순번)
  const handleScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const box = rail.getBoundingClientRect();
    const center = box.left + box.width / 2;
    let best = 0;
    let bestDist = Infinity;
    rail.querySelectorAll<HTMLElement>('.hm-card').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const dist = Math.abs(r.left + r.width / 2 - center);
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
        <p className="hm-otd-label">&nbsp;</p>
        <div className="hm-cards">
          <div className="hm-otd-year">
            <span className="hm-otd-yh">&nbsp;</span>
            <div className="hm-otd-row">
              {[0, 1, 2].map(i => <div key={i} className="hm-card skeleton-shimmer" />)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!years.length) return null;

  return (
    <section className="hm-otd" aria-label="그 해 오늘">
      <p className="hm-otd-label">{label}</p>
      <div ref={railRef} className="hm-cards" onScroll={handleScroll}>
        {groups.map(({ year: y, contents }) => (
          <div key={y.year} className="hm-otd-year" role="group" aria-label={`${y.year}년`}>
            <span className="hm-otd-yh">{y.label ?? `${y.year}년 · ${y.yearsAgo > 0 ? `${y.yearsAgo}년 전` : '올해'}`}</span>
            <div className="hm-otd-row">
              {contents.map(({ content: c, index: i }) => {
                const first = c.frames[0];
                const preview = previewUrlOf(first);
                const { title, meta } = cardText(c);
                // 스토리 뷰어가 이 카드에서 커지고 이 카드로 줄어든다 (Home measureStoryCard)
                const cardId = `${y.year}:${c.startIndex}`;
                return (
                  <button
                    key={c.key}
                    type="button"
                    className={liftCard === cardId ? 'hm-card is-lift' : 'hm-card'}
                    data-story-card={cardId}
                    onClick={() => onOpen(y.year, c.startIndex)}
                    aria-label={`${y.year}년 ${title || meta} 넘겨보기`}
                  >
                    <FrameImage frame={first} eager={i < 3} />
                    {preview && canPreview && inView && !paused && i === active && (
                      <CardPreview key={preview} src={preview} />
                    )}
                    <span className="hm-card-ov">
                      <span className="hm-card-play" aria-hidden><PlayIcon size={10} /></span>
                      <span className="hm-card-body">
                        {title && <span className="hm-card-title">{title}</span>}
                        {meta && <span className="hm-card-meta">{meta}</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
