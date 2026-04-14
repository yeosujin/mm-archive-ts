import { useState, useRef, useEffect, useCallback } from 'react';
import type { Post } from '../lib/database';
import PlatformIcon from './PlatformIcon';
import { CloseIcon } from './Icons';

function getVideoMimeType(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
  switch (ext) {
    case 'mov': return 'video/quicktime';
    case 'webm': return 'video/webm';
    case 'mp4': return 'video/mp4';
    case 'm4v': return 'video/x-m4v';
    default: return 'video/mp4';
  }
}

type Props = {
  post: Post;
  onClose?: () => void;
};

// Posts.tsx에서 추출한 포스트 상세 내용 블록
// 모달/인라인 모두에서 재사용. onClose가 있으면 닫기 버튼 노출.
export default function PostDetailContent({ post, onClose }: Props) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isTextClamped, setIsTextClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const touchStartX = useRef<number>(0);

  const mediaLength = post.media?.length ?? 0;

  const prevMedia = useCallback(() => {
    if (mediaLength === 0) return;
    setCurrentMediaIndex(prev => (prev === 0 ? mediaLength - 1 : prev - 1));
  }, [mediaLength]);

  const nextMedia = useCallback(() => {
    if (mediaLength === 0) return;
    setCurrentMediaIndex(prev => (prev === mediaLength - 1 ? 0 : prev + 1));
  }, [mediaLength]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) nextMedia();
      else prevMedia();
    }
  };

  // 텍스트 clamp 감지
  useEffect(() => {
    if (post.content && textRef.current && !isTextExpanded) {
      const el = textRef.current;
      setIsTextClamped(el.scrollHeight > el.clientHeight);
    }
  }, [post, isTextExpanded]);

  // 키보드 네비게이션: 모달 모드(onClose 제공 시)에서만 활성화
  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevMedia();
      if (e.key === 'ArrowRight') nextMedia();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [onClose, prevMedia, nextMedia]);

  return (
    <div className="post-detail-content">
      {onClose && (
        <button className="modal-close-btn" onClick={onClose}><CloseIcon size={18} /></button>
      )}

      {/* 미디어 캐러셀 */}
      {post.media && post.media.length > 0 && (
        <div className="post-carousel">
          <div
            className="carousel-media"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {post.media.map((media, index) => (
              <div
                key={media.url}
                style={{
                  display: index === currentMediaIndex ? 'block' : 'none',
                  width: '100%',
                  height: '100%',
                }}
              >
                {media.type === 'video' ? (
                  <video
                    poster={media.thumbnail}
                    controls
                    playsInline
                    preload="metadata"
                  >
                    <source
                      src={media.url}
                      type={getVideoMimeType(media.url)}
                    />
                    <track kind="captions" />
                  </video>
                ) : (
                  <img
                    src={media.url}
                    alt={`${post.title} - ${index + 1}`}
                  />
                )}
              </div>
            ))}
          </div>

          {post.media.length > 1 && (
            <>
              <button className="carousel-btn prev" onClick={prevMedia}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              <button className="carousel-btn next" onClick={nextMedia}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
              <div className="carousel-dots">
                {post.media.map((media, index) => (
                  <button
                    key={media.url}
                    className={`carousel-dot ${index === currentMediaIndex ? 'active' : ''}`}
                    onClick={() => setCurrentMediaIndex(index)}
                    aria-label={`미디어 ${index + 1}로 이동`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 포스트 정보 */}
      <div className="post-detail-info">
        <div className="post-detail-header">
          <div className="post-detail-meta">
            <PlatformIcon platform={post.platform} size={20} />
            {post.writer && (
              <span className="post-writer">{post.writer}</span>
            )}
            <time className="post-date">{post.date}</time>
          </div>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="post-external-link"
          >
            원본 보기 →
          </a>
        </div>

        {post.content && (
          <div className="post-detail-text-wrapper">
            <p ref={textRef} className={`post-detail-text ${isTextExpanded ? 'expanded' : ''}`}>
              {post.content}
            </p>
            {isTextClamped && !isTextExpanded && (
              <button
                type="button"
                className="text-expand-btn"
                onClick={() => setIsTextExpanded(true)}
              >
                더보기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
