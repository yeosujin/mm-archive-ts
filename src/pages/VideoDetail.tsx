import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useViewerParam } from '../hooks/useViewerParam';
import { CATEGORY_LABEL, classifyVideo, formatDotDate, momentsByVideo } from '../lib/videoCatalog';
import { isSaveData } from '../lib/networkPrefs';
import VideoCover from '../components/moments/VideoCover';
import MomentViewer from '../components/MomentViewer';
import Skeleton from '../components/Skeleton';
import { ArrowRightIcon, PlayIcon } from '../components/Icons';

/** 화면 밖 video에 url을 넣어 미리 받는다. 없으면 만든다 */
function primeVideo(el: HTMLVideoElement | null, url: string): HTMLVideoElement {
  const video = el ?? Object.assign(document.createElement('video'), { muted: true, preload: 'auto' });
  if (video.getAttribute('src') !== url) video.src = url;
  return video;
}

export default function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { videos, moments, fetchVideos, fetchMoments } = useData();
  const [failed, setFailed] = useState(false);
  const { value: momentId, open, close } = useViewerParam();
  // 칸을 누르는 순간부터 받아 두는 화면 밖 video. 뷰어가 열리면 버린다(같은 URL이라 캐시를 탄다)
  const preloadRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    Promise.all([fetchVideos(), fetchMoments()]).catch((error) => {
      console.error('Error loading video detail:', error);
      setFailed(true);
    });
  }, [fetchVideos, fetchMoments]);

  const video = useMemo(() => videos?.find(v => v.id === id) ?? null, [videos, id]);
  const list = useMemo(() => (moments && id ? momentsByVideo(moments).get(id) ?? [] : []), [moments, id]);
  const startIndex = momentId ? list.findIndex(m => m.id === momentId) : -1;

  const discardPreload = useCallback(() => {
    const el = preloadRef.current;
    if (!el) return;
    el.removeAttribute('src');
    el.load();
    preloadRef.current = null;
  }, []);

  // 뷰어(자식) effect가 먼저 돌아 src를 넣은 뒤에 버린다
  useEffect(() => {
    if (momentId) discardPreload();
  }, [momentId, discardPreload]);
  useEffect(() => discardPreload, [discardPreload]);

  const preload = (url: string) => {
    if (isSaveData()) return;
    preloadRef.current = primeVideo(preloadRef.current, url);
  };

  const goBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/videos');
  };

  if (!video) {
    if ((!videos || !moments) && !failed) {
      return <Skeleton variant="grid" count={9} />;
    }
    return (
      <div className="vd-empty">
        <p>{failed ? '영상을 불러오지 못했어요' : '영상을 찾을 수 없어요'}</p>
        <Link to="/videos" className="vd-btn">모먼트로 가기</Link>
      </div>
    );
  }

  return (
    <div className="vd">
      <div className="vd-cover">
        <VideoCover video={video} moments={list} eager />
        <button type="button" className="vd-back" onClick={goBack} aria-label="뒤로">
          <ArrowRightIcon size={22} />
        </button>
      </div>

      <div className="vd-info">
        <h1 className="vd-title">{video.title}</h1>
        <p className="vd-meta">
          {formatDotDate(video.date)} · {CATEGORY_LABEL[classifyVideo(video)]} · 모먼트 {list.length}
        </p>
        <div className="vd-btns">
          {list.length > 0 && (
            <button type="button" className="vd-btn is-primary" onClick={() => open(list[0].id)}>
              <PlayIcon size={14} /> 모먼트 재생
            </button>
          )}
          <a className="vd-btn" href={video.url} target="_blank" rel="noreferrer">
            보러가기 <ArrowRightIcon size={14} />
          </a>
        </div>
      </div>

      {list.length > 0 && (
        <div className="vd-grid">
          {list.map(m => (
            <button
              key={m.id}
              type="button"
              className="vd-cell"
              onPointerDown={() => preload(m.tweet_url)}
              onClick={() => open(m.id)}
              aria-label={m.title || '모먼트'}
            >
              {m.thumbnail_url && <img src={m.thumbnail_url} alt="" loading="lazy" decoding="async" />}
            </button>
          ))}
        </div>
      )}

      {startIndex >= 0 && (
        <MomentViewer key={momentId} moments={list} startIndex={startIndex} onClose={close} />
      )}
    </div>
  );
}
