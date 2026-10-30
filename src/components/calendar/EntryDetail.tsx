import { useEffect, useRef, useState } from 'react';
import type { CalendarEntry } from '../../lib/calendarDays';
import type { MemberSettings, Moment, Photo, Post, Video } from '../../lib/database/types';
import PostDetailContent from '../PostDetailContent';
import EpisodeContentBody from '../EpisodeContentBody';
import { CloseIcon } from '../Icons';

type DetailEntry = Extract<CalendarEntry, { kind: 'post' | 'photo' | 'episode' }>;

interface Props {
  entry: DetailEntry;
  videos: Video[];
  moments: Moment[];
  posts: Post[];
  memberSettings: MemberSettings | null;
  /** 닫기 요청 — 열림 상태는 부모가 URL(`?d=`)로 들고 있다 */
  onClose: () => void;
}

const EPISODE_LABEL = { dm: 'DM', comment: '댓글', listening_party: '리스닝 파티' } as const;
const NO_MEMBERS: MemberSettings = { member1_name: '', member2_name: '' };
/** 이만큼 옆으로 밀면 다음 사진 */
const SWIPE_PX = 50;

/** 같은 묶음 사진 라이트박스. 사진 페이지 라이트박스와 같은 모양(클래스) */
function PhotoGroup({ photos, onClose }: { photos: Photo[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef(0);
  const photo = photos[index];
  const go = (next: number) => setIndex(Math.max(0, Math.min(photos.length - 1, next)));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex(i => Math.min(photos.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [photos.length]);

  return (
    <div className="photo-lightbox-content">
      <button className="photo-lightbox-close" onClick={onClose} aria-label="닫기">
        <CloseIcon size={20} />
      </button>
      <div
        className="photo-lightbox-image"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > SWIPE_PX) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        {photos.length > 1 && <span className="photo-lightbox-counter">{index + 1} / {photos.length}</span>}
        {index > 0 && (
          <button className="photo-lightbox-nav photo-lightbox-prev" onClick={() => go(index - 1)} aria-label="이전 사진">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
        )}
        <img key={photo.id} src={photo.image_url} alt={photo.title} />
        {index < photos.length - 1 && (
          <button className="photo-lightbox-nav photo-lightbox-next" onClick={() => go(index + 1)} aria-label="다음 사진">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        )}
      </div>
      <div className="photo-lightbox-info">
        <h3>{photo.title}</h3>
        <span className="photo-lightbox-date">{photo.date}</span>
      </div>
    </div>
  );
}

/**
 * 캘린더에서 연 사진·포스트·에피소드 상세. 각 페이지의 상세와 같은 본문을 캘린더 위에 띄운다.
 * ✕ · 바깥 누르기 · Esc · 뒤로가기로 닫는다
 */
export default function EntryDetail({ entry, videos, moments, posts, memberSettings, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={entry.kind === 'photo' ? 'photo-lightbox' : 'post-detail-modal'}
      aria-label={entry.title}
      // Esc: 브라우저가 바로 닫지 않게 막고 URL에서 빼서 닫는다
      onCancel={(e) => { e.preventDefault(); onClose(); }}
    >
      <button className="modal-backdrop" onClick={onClose} aria-label="닫기" />
      {entry.kind === 'post' && <PostDetailContent post={entry.post} onClose={onClose} />}
      {entry.kind === 'photo' && <PhotoGroup photos={entry.photos} onClose={onClose} />}
      {entry.kind === 'episode' && (
        <div className="post-detail-content cal-episode">
          <button className="modal-close-btn" onClick={onClose} aria-label="닫기"><CloseIcon size={18} /></button>
          <div className="cal-episode-head">
            {entry.episode.episode_type !== 'listening_party' && entry.sender && (
              <span className={`dm-member-name dm-member-name-${entry.episode.sender || 'member1'}`}>{entry.sender}</span>
            )}
            <span className="cal-episode-meta">{EPISODE_LABEL[entry.episode.episode_type]} · {entry.episode.date}</span>
          </div>
          <EpisodeContentBody
            episode={entry.episode}
            videos={videos}
            moments={moments}
            posts={posts}
            memberSettings={memberSettings ?? NO_MEMBERS}
          />
        </div>
      )}
    </dialog>
  );
}
