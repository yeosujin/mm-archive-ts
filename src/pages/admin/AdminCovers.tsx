import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getVideos, updateVideo } from '../../lib/database/videos';
import { getMoments } from '../../lib/database/moments';
import type { Moment, Video } from '../../lib/database/types';
import { getVideoCover } from '../../lib/videoCover';
import { weverseLiveKey, buildCoverBookmarklet } from '../../lib/weverseCover';
import { importImageToR2 } from '../../lib/r2Upload';

type ImportState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; video: Video; cover: string }
  | { kind: 'error'; message: string };

/**
 * 위버스 영상 표지 채우기.
 * - 목록: thumbnail_url이 없는 위버스 영상 (그동안은 첫 모먼트 썸네일이 대신 표지가 된다)
 * - ?url=&image= 로 열리면(북마클릿) 그 영상의 표지로 저장
 */
export default function AdminCovers() {
  const [params, setParams] = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ImportState>({ kind: 'idle' });
  const bookmarkletRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    Promise.all([getVideos(), getMoments()])
      .then(([v, m]) => { setVideos(v); setMoments(m); })
      .finally(() => setLoading(false));
  }, []);

  // React 19는 javascript: href를 막는다 → DOM에 직접 넣는다
  useEffect(() => {
    bookmarkletRef.current?.setAttribute('href', buildCoverBookmarklet(window.location.origin));
  }, [loading]);

  const pending = useMemo(
    () => videos.filter(v => weverseLiveKey(v.url) && !v.thumbnail_url),
    [videos]
  );

  // ?url=&image= 로 열렸을 때의 저장 후보. 자동 저장하지 않고 확인을 거친다
  const candidateUrl = params.get('url');
  const candidateImage = params.get('image');
  const candidate = useMemo(() => {
    if (!candidateUrl || !candidateImage) return null;
    const key = weverseLiveKey(candidateUrl);
    const video = key ? videos.find(v => weverseLiveKey(v.url) === key) : undefined;
    return { url: candidateUrl, image: candidateImage, video };
  }, [candidateUrl, candidateImage, videos]);

  const saveCandidate = async () => {
    if (!candidate?.video) return;
    const { video, image } = candidate;
    setState({ kind: 'saving' });
    try {
      const cover = await importImageToR2(image, `covers/${video.id}-${Date.now()}.jpg`);
      await updateVideo(video.id, { thumbnail_url: cover });
      setVideos(prev => prev.map(v => (v.id === video.id ? { ...v, thumbnail_url: cover } : v)));
      setState({ kind: 'saved', video, cover });
      setParams({}, { replace: true });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const cancelCandidate = () => {
    setState({ kind: 'idle' });
    setParams({}, { replace: true });
  };

  const momentsOf = (videoId: string) => moments.filter(m => m.video_id === videoId);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>위버스 표지</h1>

      {candidate && !candidate.video && (
        <div className="admin-section">
          <p className="login-error">등록된 위버스 영상에서 이 라이브를 찾지 못했어요: {candidate.url}</p>
          <button type="button" onClick={cancelCandidate}>닫기</button>
        </div>
      )}
      {candidate?.video && (
        <div className="admin-section">
          <h2>이 이미지를 표지로 저장할까요?</h2>
          <p>{candidate.video.title} · {candidate.video.date}</p>
          {candidate.video.thumbnail_url && (
            <>
              <p>이미 표지가 있어요 — 바꿀까요?</p>
              <img src={candidate.video.thumbnail_url} alt="현재 표지" style={{ width: 240, borderRadius: 8 }} />
            </>
          )}
          <p>새 표지 후보</p>
          <img src={candidate.image} alt="새 표지 후보" style={{ width: 240, borderRadius: 8 }} />
          {state.kind === 'saving' && <p>표지 저장 중...</p>}
          {state.kind === 'error' && <p className="login-error">{state.message}</p>}
          <p>
            <button type="button" onClick={saveCandidate} disabled={state.kind === 'saving'}>표지로 저장</button>{' '}
            <button type="button" onClick={cancelCandidate} disabled={state.kind === 'saving'}>취소</button>
          </p>
        </div>
      )}
      {state.kind === 'saved' && (
        <div className="admin-section">
          <p>✅ 저장됨 — {state.video.title}</p>
          <img src={state.cover} alt="" style={{ width: 240, borderRadius: 8 }} />
          {pending[0] && (
            <p>
              <a href={pending[0].url} target="_blank" rel="noreferrer">다음: {pending[0].title} 열기 →</a>
            </p>
          )}
        </div>
      )}

      <div className="admin-section">
        <h2>사용법 (PC 크롬)</h2>
        <ol>
          <li>
            이 버튼을 북마크바로 끌어다 놓아요:{' '}
            <a ref={bookmarkletRef} className="admin-header-link" onClick={e => e.preventDefault()}>위버스 표지 가져오기</a>
          </li>
          <li>아래 목록에서 라이브를 열고, <b>광고가 끝나 영상 화면이 뜨면</b> 북마크바의 버튼을 눌러요</li>
          <li>새 탭에 "저장됨"이 뜨면 끝이에요</li>
        </ol>
      </div>

      <div className="admin-section">
        <h2>표지 없는 위버스 영상 ({pending.length}개)</h2>
        {pending.length === 0 ? (
          <p className="empty-text">모두 채웠어요</p>
        ) : (
          <div className="admin-list">
            {pending.map(v => {
              const fallback = getVideoCover(v, momentsOf(v.id));
              return (
                <div key={v.id} className="admin-list-item">
                  {fallback && <img src={fallback} alt="" style={{ width: 96, borderRadius: 6 }} />}
                  <div className="admin-list-info">
                    <a href={v.url} target="_blank" rel="noreferrer">{v.title}</a>
                    <span> · {v.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
