import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Post } from '../lib/database';
import PlatformIcon from '../components/PlatformIcon';
import { useData } from '../hooks/useData';

export default function Posts() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const { posts: cachedPosts, fetchPosts } = useData();
  const [posts, setPosts] = useState<Post[]>(cachedPosts || []);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(!cachedPosts);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const loadPosts = useCallback(async () => {
    try {
      const data = await fetchPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchPosts]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (cachedPosts) setPosts(cachedPosts);
  }, [cachedPosts]);

  // highlight 파라미터 처리: 해당 포스트 자동 열기
  useEffect(() => {
    if (!highlightId || loading || posts.length === 0) return;
    const post = posts.find(p => p.id === highlightId);
    if (post) {
      setSelectedPost(post);
      setCurrentMediaIndex(0);
    }
  }, [highlightId, loading, posts]);

  // 검색 필터링 (제목, 날짜, 글쓴이, 내용)
  const filteredPosts = searchQuery
    ? posts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.date.includes(searchQuery) ||
        post.writer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  // 포스트 클릭 핸들러
  const openPost = (post: Post) => {
    setSelectedPost(post);
    setCurrentMediaIndex(0);
    dialogRef.current?.showModal();
  };

  const closePost = () => {
    dialogRef.current?.close();
    setSelectedPost(null);
    setCurrentMediaIndex(0);
  };


  // 캐러셀 네비게이션
  const prevMedia = () => {
    if (!selectedPost?.media) return;
    setCurrentMediaIndex(prev =>
      prev === 0 ? selectedPost.media!.length - 1 : prev - 1
    );
  };

  const nextMedia = () => {
    if (!selectedPost?.media) return;
    setCurrentMediaIndex(prev =>
      prev === selectedPost.media!.length - 1 ? 0 : prev + 1
    );
  };

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPost) return;
      if (e.key === 'Escape') closePost();
      if (e.key === 'ArrowLeft') prevMedia();
      if (e.key === 'ArrowRight') nextMedia();
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPost, currentMediaIndex]);

  // 그리드 썸네일 가져오기
  const getGridThumbnail = (post: Post): string | null => {
    if (!post.media || post.media.length === 0) return null;
    const firstMedia = post.media[0];
    if (firstMedia.type === 'video') {
      // 영상은 썸네일이 있을 때만 반환, 없으면 null
      return firstMedia.thumbnail || null;
    }
    // 이미지는 URL 그대로 반환
    return firstMedia.url;
  };

  if (loading) {
    return (
      <div className="page posts-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page posts-page posts-grid-view">
      <div className="page-header">
        <h1>포스트</h1>
        <p className="page-desc">X, 인스타, 위버스</p>
        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="검색... (제목, 날짜, 글쓴이)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="empty-state">
          <p>{searchQuery ? '검색 결과가 없어요 😢' : '아직 포스트가 없어요 😢'}</p>
        </div>
      ) : (
        <div className="posts-grid">
          {filteredPosts.map((post) => {
            const thumbnail = getGridThumbnail(post);
            const hasMedia = post.media && post.media.length > 0;
            const mediaCount = post.media?.length || 0;
            const hasMultipleMedia = mediaCount > 1;

            return (
              <button
                key={post.id}
                className="post-grid-item"
                onClick={() => openPost(post)}
              >
                <div className="post-grid-thumb">
                  {thumbnail ? (
                    <img src={thumbnail} alt={post.title} loading="lazy" />
                  ) : (
                    <div className="post-grid-text-only">
                      <PlatformIcon platform={post.platform} size={32} />
                      {post.content && (
                        <p className="text-preview">
                          {post.content.length > 40
                            ? post.content.slice(0, 40) + '...'
                            : post.content}
                        </p>
                      )}
                    </div>
                  )}
                  {hasMultipleMedia && (
                    <span className="multi-media-badge">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
                      </svg>
                    </span>
                  )}
                  {hasMedia && post.media![0].type === 'video' && (
                    <span className="video-indicator">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 상세 모달 */}
      <dialog
        ref={dialogRef}
        className="post-detail-modal"
        aria-label="포스트 상세"
      >
        {selectedPost && (
          <>
            <button
              className="modal-backdrop"
              onClick={closePost}
              aria-label="모달 닫기"
            />
            <div className="post-detail-content">
            <button className="modal-close-btn" onClick={closePost}>✕</button>

            {/* 미디어 캐러셀 */}
            {selectedPost.media && selectedPost.media.length > 0 && (
              <div className="post-carousel">
                <div className="carousel-media">
                  {selectedPost.media[currentMediaIndex].type === 'video' ? (
                    <video
                      src={selectedPost.media[currentMediaIndex].url}
                      controls
                      playsInline
                      preload="metadata"
                    >
                      <track kind="captions" />
                    </video>
                  ) : (
                    <img
                      src={selectedPost.media[currentMediaIndex].url}
                      alt={`${selectedPost.title} - ${currentMediaIndex + 1}`}
                    />
                  )}
                </div>

                {selectedPost.media.length > 1 && (
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
                      {selectedPost.media.map((media, index) => (
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
                  <PlatformIcon platform={selectedPost.platform} size={20} />
                  {selectedPost.writer && (
                    <span className="post-writer">{selectedPost.writer}</span>
                  )}
                  <time className="post-date">{selectedPost.date}</time>
                </div>
                <a
                  href={selectedPost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="post-external-link"
                >
                  원본 보기 →
                </a>
              </div>

              {selectedPost.content && (
                <p className="post-detail-text">{selectedPost.content}</p>
              )}

              {selectedPost.title && (
                <p className="post-detail-title">{selectedPost.title}</p>
              )}
            </div>
          </div>
          </>
        )}
      </dialog>
    </div>
  );
}
