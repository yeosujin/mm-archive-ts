import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useViewerParam } from '../hooks/useViewerParam';
import { momentsByVideo } from '../lib/videoCatalog';
import VideoDetailBody from '../components/moments/VideoDetailBody';
import MomentViewer from '../components/MomentViewer';
import Skeleton from '../components/Skeleton';
import { ArrowRightIcon } from '../components/Icons';

/** 영상 상세 단독 페이지. 표지(/videos)에서는 같은 본문을 모달(VideoDetailModal)로 띄운다 */
export default function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { videos, moments, fetchVideos, fetchMoments } = useData();
  const [failed, setFailed] = useState(false);
  const { value: momentId, open, close } = useViewerParam();

  useEffect(() => {
    Promise.all([fetchVideos(), fetchMoments()]).catch((error) => {
      console.error('Error loading video detail:', error);
      setFailed(true);
    });
  }, [fetchVideos, fetchMoments]);

  const video = useMemo(() => videos?.find(v => v.id === id) ?? null, [videos, id]);
  const list = useMemo(() => (moments && id ? momentsByVideo(moments).get(id) ?? [] : []), [moments, id]);
  const startIndex = momentId ? list.findIndex(m => m.id === momentId) : -1;

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
    <>
      {/* 본문보다 앞 — 본문의 미리 받기 정리가 뷰어 effect 뒤에 돌게 */}
      {startIndex >= 0 && (
        <MomentViewer key={momentId} moments={list} startIndex={startIndex} onClose={close} />
      )}
      <VideoDetailBody
        video={video}
        moments={list}
        viewerOpen={!!momentId}
        onOpenMoment={open}
        coverAction={(
          <button type="button" className="vd-back" onClick={goBack} aria-label="뒤로">
            <ArrowRightIcon size={22} />
          </button>
        )}
      />
    </>
  );
}
