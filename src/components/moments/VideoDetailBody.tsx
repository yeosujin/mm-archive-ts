import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { Moment, Video } from '../../lib/database/types';
import { CATEGORY_LABEL, classifyVideo, formatDotDate } from '../../lib/videoCatalog';
import { isSaveData } from '../../lib/networkPrefs';
import VideoCover from './VideoCover';
import { ArrowRightIcon, PlayIcon } from '../Icons';

/** 화면 밖 video에 url을 넣어 미리 받는다. 없으면 만든다 */
function primeVideo(el: HTMLVideoElement | null, url: string): HTMLVideoElement {
  const video = el ?? Object.assign(document.createElement('video'), { muted: true, preload: 'auto' });
  if (video.getAttribute('src') !== url) video.src = url;
  return video;
}

interface Props {
  video: Video;
  /** 이 영상의 모먼트(정렬됨) */
  moments: Moment[];
  /** 모먼트 뷰어가 열려 있는지 — 열리면 미리 받던 video를 버린다 */
  viewerOpen: boolean;
  onOpenMoment: (momentId: string) => void;
  /** 표지 위에 얹을 버튼(뒤로 / 닫기) */
  coverAction?: ReactNode;
}

/** 영상 상세 본문 — 표지, 제목·메타, 버튼, 3열 모먼트 그리드(없으면 안내 한 줄). 상세 페이지와 표지 위 모달이 같이 쓴다 */
export default function VideoDetailBody({ video, moments, viewerOpen, onOpenMoment, coverAction }: Props) {
  // 칸을 누르는 순간부터 받아 두는 화면 밖 video. 뷰어가 열리면 버린다(같은 URL이라 캐시를 탄다)
  const preloadRef = useRef<HTMLVideoElement | null>(null);

  const discardPreload = useCallback(() => {
    const el = preloadRef.current;
    if (!el) return;
    el.removeAttribute('src');
    el.load();
    preloadRef.current = null;
  }, []);

  // 뷰어 effect가 먼저 돌아 src를 넣은 뒤에 버린다 — 그래서 쓰는 쪽은 MomentViewer를 이 컴포넌트보다 앞에 렌더한다
  // (형제 effect는 앞에서부터 돈다)
  useEffect(() => {
    if (viewerOpen) discardPreload();
  }, [viewerOpen, discardPreload]);
  useEffect(() => discardPreload, [discardPreload]);

  const preload = (url: string) => {
    if (isSaveData()) return;
    preloadRef.current = primeVideo(preloadRef.current, url);
  };

  return (
    <div className="vd">
      <div className="vd-cover">
        <VideoCover video={video} moments={moments} eager />
        {coverAction}
      </div>

      <div className="vd-info">
        <h1 className="vd-title">{video.title}</h1>
        <p className="vd-meta">
          {formatDotDate(video.date)} · {CATEGORY_LABEL[classifyVideo(video)]}
          {moments.length > 0 && ` · 모먼트 ${moments.length}`}
        </p>
        <div className="vd-btns">
          {moments.length > 0 && (
            <button type="button" className="vd-btn is-primary" onClick={() => onOpenMoment(moments[0].id)}>
              <PlayIcon size={14} /> 모먼트 재생
            </button>
          )}
          <a className={`vd-btn${moments.length ? '' : ' is-primary'}`} href={video.url} target="_blank" rel="noreferrer">
            보러가기 <ArrowRightIcon size={14} />
          </a>
        </div>
      </div>

      {moments.length > 0 ? (
        <div className="vd-grid">
          {moments.map(m => (
            <button
              key={m.id}
              type="button"
              className="vd-cell"
              onPointerDown={() => preload(m.tweet_url)}
              onClick={() => onOpenMoment(m.id)}
              aria-label={m.title || '모먼트'}
            >
              {m.thumbnail_url && <img src={m.thumbnail_url} alt="" loading="lazy" decoding="async" />}
            </button>
          ))}
        </div>
      ) : (
        <p className="vd-none">아직 모먼트가 없어요</p>
      )}
    </div>
  );
}
