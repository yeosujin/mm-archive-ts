import { useState, useEffect, useCallback } from 'react';
import type { Post } from '../lib/database';
import PostEmbed from '../components/PostEmbed';
import PlatformIcon from '../components/PlatformIcon';
import { getPlatformName } from '../lib/platformUtils';
import { useData } from '../context/DataContext';

export default function Posts() {
  const { posts: cachedPosts, fetchPosts } = useData();
  const [posts, setPosts] = useState<Post[]>(cachedPosts || []);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(!cachedPosts);

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

  // 검색 필터링 (제목, 날짜)
  const filteredPosts = searchQuery
    ? posts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.date.includes(searchQuery)
      )
    : posts;

  // 날짜별 그룹화
  const groupedPosts = (() => {
    const groups: Record<string, Post[]> = {};
    filteredPosts.forEach((post) => {
      if (!groups[post.date]) {
        groups[post.date] = [];
      }
      groups[post.date].push(post);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  })();

  const togglePost = (postId: string) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  if (loading) {
    return (
      <div className="page posts-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="page posts-page">
      <div className="page-header">
        <h1>포스트</h1>
        <p className="page-desc">X, 인스타, 위버스</p>
        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="제목 또는 날짜로 검색... (예: 2025-01-01)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {groupedPosts.length === 0 ? (
        <div className="empty-state">
          <p>{searchQuery ? '검색 결과가 없어요 😢' : '아직 포스트가 없어요 😢'}</p>
        </div>
      ) : (
        <div className="posts-timeline">
          {groupedPosts.map(([date, datePosts]) => (
            <div key={date} className="date-thread">
              <div className="thread-date-header">
                <span className="thread-marker"></span>
                <time>{date}</time>
              </div>

              <div className="thread-content">
                {datePosts.map((post) => (
                  <div key={post.id} className="thread-post-item">
                    <button 
                      className="thread-item-header"
                      onClick={() => togglePost(post.id)}
                    >
                      <span className="item-icon">
                        <PlatformIcon platform={post.platform} size={18} />
                      </span>
                      <span className="item-title">
                        {post.title || getPlatformName(post.platform)}
                      </span>
                      <span className={`expand-arrow ${expandedPost === post.id ? 'open' : ''}`}>
                        ▼
                      </span>
                    </button>
                    
                    {expandedPost === post.id && (
                      <div className="thread-item-content">
                        <PostEmbed url={post.url} platform={post.platform} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
