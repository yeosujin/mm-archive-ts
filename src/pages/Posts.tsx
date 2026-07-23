import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Post } from '../lib/database';
import PlatformIcon from '../components/PlatformIcon';
import { useData } from '../hooks/useData';
import LazyImage from '../components/LazyImage';
import Skeleton from '../components/Skeleton';
import PostDetailContent from '../components/PostDetailContent';

export default function Posts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const { posts: cachedPosts, fetchPosts } = useData();
  const [posts, setPosts] = useState<Post[]>(cachedPosts || []);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
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
      dialogRef.current?.showModal();
    }
  }, [highlightId, loading, posts]);

  // 검색 필터링 (제목, 날짜, 글쓴이, 내용)
  const filteredPosts = (searchQuery
    ? posts.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.date.includes(searchQuery) ||
        post.writer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts
  ).sort((a, b) =>
    sortOrder === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  );

  // 포스트 클릭 핸들러
  const openPost = (post: Post) => {
    setSelectedPost(post);
    dialogRef.current?.showModal();
  };

  const closePost = useCallback(() => {
    dialogRef.current?.close();
    setSelectedPost(null);
    // 상세를 닫으면 URL의 highlight 파라미터도 제거 (새로고침/뒤로가기 시 재오픈 방지)
    if (searchParams.has('highlight')) {
      const next = new URLSearchParams(searchParams);
      next.delete('highlight');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ESC 키로 닫기 (dialog의 기본 close 이벤트와 동기화)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedPost) return;
      if (e.key === 'Escape') closePost();
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [selectedPost, closePost]);

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
      <div className="page posts-page posts-grid-view">
        <div className="page-header">
          <h1>포스트</h1>
          <p className="page-desc">X, 인스타, 위버스</p>
        </div>
        <Skeleton variant="grid" count={9} />
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

      {filteredPosts.length === 0 ? (
        <div className="empty-state">
          <p>{searchQuery ? '검색 결과가 없어요 😢' : '아직 포스트가 없어요 😢'}</p>
        </div>
      ) : (
        <div className="posts-grid">
          {filteredPosts.map((post, index) => {
            const thumbnail = getGridThumbnail(post);
            const firstMedia = post.media?.[0];
            const thumbHash = firstMedia?.type === 'image' ? firstMedia.thumb_hash : undefined;
            const hasMedia = post.media && post.media.length > 0;
            const mediaCount = post.media?.length || 0;
            const hasMultipleMedia = mediaCount > 1;

            return (
              <button
                key={post.id}
                className="post-grid-item"
                onClick={() => openPost(post)}
                aria-label={`${post.title || post.platform} · ${post.date}`}
              >
                <div className="post-grid-thumb">
                  {thumbnail ? (
                    <LazyImage src={thumbnail} alt={post.title} priority={index < 9} thumbHash={thumbHash} />
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
            <PostDetailContent
              key={selectedPost.id}
              post={selectedPost}
              onClose={closePost}
            />
          </>
        )}
      </dialog>
    </div>
  );
}
