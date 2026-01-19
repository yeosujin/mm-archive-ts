import { useState, useEffect } from 'react';
import { getPosts, createPost, updatePost, deletePost } from '../../lib/database';
import type { Post } from '../../lib/database';
import { detectPlatform } from '../../components/PostEmbed';
import PlatformIcon, { getPlatformName } from '../../components/PlatformIcon';

export default function AdminPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    date: '',
    platform: 'twitter' as 'twitter' | 'instagram' | 'weverse' | 'other',
  });

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // URL 변경 시 플랫폼 자동 감지
  const handleUrlChange = (url: string) => {
    const platform = detectPlatform(url);
    setFormData({ ...formData, url, platform });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updatePost(editingId, {
          title: formData.title,
          url: formData.url,
          date: formData.date,
          platform: formData.platform,
        });
        alert('수정되었어요!');
        setEditingId(null);
      } else {
        await createPost({
          title: formData.title,
          url: formData.url,
          date: formData.date,
          platform: formData.platform,
        });
        alert('포스트가 추가되었어요!');
      }
      
      setFormData({ title: '', url: '', date: '', platform: 'twitter' });
      loadPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('저장 중 오류가 발생했어요.');
    }
  };

  const handleEdit = (post: Post) => {
    setEditingId(post.id);
    setFormData({
      title: post.title,
      url: post.url,
      date: post.date,
      platform: post.platform,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', url: '', date: '', platform: 'twitter' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      await deletePost(id);
      alert('삭제되었어요!');
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('삭제 중 오류가 발생했어요.');
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>포스트 관리</h1>
      
      <div className="admin-section">
        <h2>{editingId ? '포스트 수정' : '새 포스트 추가'}</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="post-url">포스트 URL *</label>
            <input
              id="post-url"
              type="url"
              value={formData.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="X, 인스타, 위버스 URL"
              required
            />
            <span className="form-hint">
              {formData.platform !== 'other' 
                ? `✨ ${getPlatformName(formData.platform)} 감지됨!`
                : 'X, Instagram, Weverse URL 지원'
              }
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="post-title">제목 (선택)</label>
            <input
              id="post-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="포스트 설명"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="post-date">날짜 *</label>
            <input
              id="post-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-platform">플랫폼</label>
            <select
              id="post-platform"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
              className="form-select"
            >
              <option value="twitter">X (Twitter)</option>
              <option value="instagram">Instagram</option>
              <option value="weverse">Weverse</option>
              <option value="other">기타</option>
            </select>
            <span className="form-hint">URL 입력 시 자동으로 감지돼요</span>
          </div>
          
          <div className="form-buttons">
            <button type="submit" className="admin-submit-btn">
              {editingId ? '수정하기' : '추가하기'}
            </button>
            {editingId && (
              <button type="button" className="admin-clear-btn" onClick={handleCancelEdit}>
                취소
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-section">
        <h2>등록된 포스트 ({posts.length}개)</h2>
        <div className="admin-list">
          {posts.map((post) => (
            <div key={post.id} className="admin-list-item simple-item">
              <div className="admin-list-info">
                <h3>
                  <span className="platform-icon-wrapper">
                    <PlatformIcon platform={post.platform} size={16} />
                  </span>
                  {post.title || getPlatformName(post.platform)}
                </h3>
                <p>{post.date}</p>
                <a href={post.url} target="_blank" rel="noopener noreferrer" className="item-link">
                  {post.url}
                </a>
              </div>
              <div className="admin-list-actions">
                <button className="edit-btn" onClick={() => handleEdit(post)}>수정</button>
                <button className="delete-btn" onClick={() => handleDelete(post.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
