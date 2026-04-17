import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Photo } from '../lib/database';
import { useData } from '../hooks/useData';
import LazyImage from '../components/LazyImage';
import Skeleton from '../components/Skeleton';
import { CloseIcon } from '../components/Icons';

export default function Photos() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const { photos: cachedPhotos, fetchPhotos } = useData();
  const [photos, setPhotos] = useState<Photo[]>(cachedPhotos || []);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(!cachedPhotos);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const loadPhotos = useCallback(async () => {
    try {
      const data = await fetchPhotos();
      setPhotos(data);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchPhotos]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    if (cachedPhotos) setPhotos(cachedPhotos);
  }, [cachedPhotos]);

  // highlight 파라미터 처리
  useEffect(() => {
    if (!highlightId || loading || photos.length === 0) return;
    const photo = photos.find(p => p.id === highlightId);
    if (photo) {
      setSelectedPhoto(photo);
      dialogRef.current?.showModal();
    }
  }, [highlightId, loading, photos]);

  // 검색 필터링 (제목, 날짜, 태그)
  const filteredPhotos = (searchQuery
    ? photos.filter(photo => {
        const q = searchQuery.toLowerCase();
        const dateNoHyphen = photo.date.replaceAll('-', '');
        return (
          photo.title.toLowerCase().includes(q) ||
          photo.date.includes(searchQuery) ||
          dateNoHyphen.includes(searchQuery) ||
          photo.tags.some(tag => tag.toLowerCase().includes(q))
        );
      })
    : photos
  ).sort((a, b) => {
    const dateCmp = sortOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    // 같은 날짜면 title suffix 번호순 (최신순이면 역순)
    const getNum = (t: string) => { const m = /-(\d+)$/.exec(t); return m ? Number(m[1]) : 0; };
    return sortOrder === 'newest' ? getNum(b.title) - getNum(a.title) : getNum(a.title) - getNum(b.title);
  });

  const openPhoto = (photo: Photo) => {
    setSelectedPhoto(photo);
    dialogRef.current?.showModal();
  };

  const closePhoto = useCallback(() => {
    dialogRef.current?.close();
    setSelectedPhoto(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto) return;
      if (e.key === 'Escape') closePhoto();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, closePhoto]);

  // 이전/다음 사진 이동
  const navigatePhoto = useCallback((direction: 'prev' | 'next') => {
    if (!selectedPhoto) return;
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    if (currentIndex === -1) return;
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < filteredPhotos.length) {
      setSlideDirection(direction === 'next' ? 'left' : 'right');
      setSelectedPhoto(filteredPhotos[newIndex]);
    }
  }, [selectedPhoto, filteredPhotos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPhoto) return;
      if (e.key === 'ArrowLeft') navigatePhoto('prev');
      if (e.key === 'ArrowRight') navigatePhoto('next');
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, navigatePhoto]);

  // 인접 사진 미리 로드
  useEffect(() => {
    if (!selectedPhoto) return;
    const currentIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);
    const adjacentIndexes = [currentIndex - 1, currentIndex + 1];
    adjacentIndexes.forEach(i => {
      if (i >= 0 && i < filteredPhotos.length) {
        const img = new Image();
        img.src = filteredPhotos[i].image_url;
      }
    });
  }, [selectedPhoto, filteredPhotos]);

  // 스와이프 핸들러
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // 수평 이동이 세로보다 크고, 50px 이상이면 스와이프
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) navigatePhoto('next');
      else navigatePhoto('prev');
    }
  };

  if (loading) {
    return (
      <div className="page photos-page">
        <div className="page-header">
          <h1>사진</h1>
        </div>
        <Skeleton variant="grid" count={12} />
      </div>
    );
  }

  return (
    <div className="page photos-page">
      <div className="page-header">
        <h1>사진</h1>
        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="검색... (제목, 날짜, 태그)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sort-toggle-wrapper">
            <button
              type="button"
              className="sort-toggle"
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            >
              <span className="sort-icon">{sortOrder === 'newest' ? '▼' : '▲'}</span>
              {sortOrder === 'newest' ? '최신순' : '오래된순'}
            </button>
          </div>
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <div className="empty-state">
          <p>{searchQuery ? '검색 결과가 없어요' : '아직 사진이 없어요'}</p>
        </div>
      ) : (
        <div className="photos-grid">
          {filteredPhotos.map((photo, index) => (
            <button
              key={photo.id}
              className="photo-grid-item"
              onClick={() => openPhoto(photo)}
            >
              <LazyImage
                src={photo.thumbnail_url || photo.image_url}
                alt={photo.title}
                priority={index < 12}
              />
            </button>
          ))}
        </div>
      )}

      {/* 상세 라이트박스 */}
      <dialog
        ref={dialogRef}
        className="photo-lightbox"
        aria-label="사진 상세"
      >
        {selectedPhoto && (
          <>
            <button
              className="modal-backdrop"
              onClick={closePhoto}
              aria-label="모달 닫기"
            />
            <div className="photo-lightbox-content">
              <button className="photo-lightbox-close" onClick={closePhoto}>
                <CloseIcon size={20} />
              </button>

              <div
                className="photo-lightbox-image"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {filteredPhotos.findIndex(p => p.id === selectedPhoto.id) > 0 && (
                  <button
                    className="photo-lightbox-nav photo-lightbox-prev"
                    onClick={() => navigatePhoto('prev')}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                  </button>
                )}

                <img
                  key={selectedPhoto.id}
                  className={slideDirection ? `photo-slide-${slideDirection}` : undefined}
                  src={selectedPhoto.image_url}
                  alt={selectedPhoto.title}
                  onAnimationEnd={() => setSlideDirection(null)}
                />

                {filteredPhotos.findIndex(p => p.id === selectedPhoto.id) < filteredPhotos.length - 1 && (
                  <button
                    className="photo-lightbox-nav photo-lightbox-next"
                    onClick={() => navigatePhoto('next')}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                )}
              </div>

              <div className="photo-lightbox-info">
                <h3>{selectedPhoto.title}</h3>
                <span className="photo-lightbox-date">{selectedPhoto.date}</span>
                {selectedPhoto.tags.length > 0 && (
                  <div className="photo-lightbox-tags">
                    {selectedPhoto.tags.map(tag => (
                      <span key={tag} className="photo-tag">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
