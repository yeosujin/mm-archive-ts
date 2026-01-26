import { useState, useEffect, useCallback, useRef } from 'react';
import { createPost, updatePost, deletePost } from '../../lib/database';
import type { Post, PostMedia } from '../../lib/database';
import { detectPlatform } from '../../lib/platformUtils';
import PlatformIcon from '../../components/PlatformIcon';
import { getPlatformName } from '../../lib/platformUtils';
import { useData } from '../../context/DataContext';
import { uploadPhotoToR2, uploadVideoToR2, uploadThumbnailFromVideo, deleteFileFromR2, isVideoFile } from '../../lib/r2Upload';

export default function AdminPosts() {
  const { posts: cachedPosts, fetchPosts, invalidateCache } = useData();
  const [posts, setPosts] = useState<Post[]>(cachedPosts || []);
  const [loading, setLoading] = useState(!cachedPosts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    date: '',
    platform: 'twitter' as 'twitter' | 'instagram' | 'weverse' | 'other',
    writer: '',
    content: '',
  });
  const [mediaList, setMediaList] = useState<PostMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // URL 변경 시 플랫폼 자동 감지
  const handleUrlChange = (url: string) => {
    const platform = detectPlatform(url);
    setFormData({ ...formData, url, platform });
  };

  // 미디어 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of Array.from(files)) {
        const isVideo = isVideoFile(file);
        let url: string;
        let thumbnail: string | undefined;

        if (isVideo) {
          // 비디오 업로드
          url = await uploadVideoToR2(file, (progress) => {
            const overallProgress = ((completedFiles + progress / 100) / totalFiles) * 100;
            setUploadProgress(Math.round(overallProgress));
          });

          // 썸네일 생성
          try {
            const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
            const videoKey = url.replace(`${r2PublicUrl}/`, '');
            thumbnail = await uploadThumbnailFromVideo(file, videoKey);
          } catch (thumbErr) {
            console.warn('썸네일 생성 실패:', thumbErr);
          }

          setMediaList(prev => [...prev, { type: 'video', url, thumbnail }]);
        } else {
          // 이미지 업로드
          url = await uploadPhotoToR2(file, (progress) => {
            const overallProgress = ((completedFiles + progress / 100) / totalFiles) * 100;
            setUploadProgress(Math.round(overallProgress));
          });
          setMediaList(prev => [...prev, { type: 'image', url }]);
        }

        completedFiles++;
      }

      setUploadProgress(100);
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      alert('파일 업로드 중 오류가 발생했어요.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 미디어 삭제
  const handleRemoveMedia = async (index: number) => {
    const media = mediaList[index];

    // R2에서 파일 삭제
    try {
      await deleteFileFromR2(media.url);
      if (media.thumbnail) {
        await deleteFileFromR2(media.thumbnail);
      }
    } catch (error) {
      console.error('R2 파일 삭제 실패:', error);
    }

    setMediaList(prev => prev.filter((_, i) => i !== index));
  };

  // 미디어 순서 변경
  const moveMedia = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= mediaList.length) return;

    const newList = [...mediaList];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    setMediaList(newList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const postData = {
        title: formData.title,
        url: formData.url,
        date: formData.date,
        platform: formData.platform,
        writer: formData.writer || undefined,
        content: formData.content || undefined,
        media: mediaList.length > 0 ? mediaList : undefined,
      };

      if (editingId) {
        await updatePost(editingId, postData);
        alert('수정되었어요!');
        setEditingId(null);
      } else {
        await createPost(postData);
        alert('포스트가 추가되었어요!');
      }

      resetForm();
      invalidateCache('posts');
      loadPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('저장 중 오류가 발생했어요.');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', url: '', date: '', platform: 'twitter', writer: '', content: '' });
    setMediaList([]);
  };

  const handleEdit = (post: Post) => {
    setEditingId(post.id);
    setFormData({
      title: post.title,
      url: post.url,
      date: post.date,
      platform: post.platform,
      writer: post.writer || '',
      content: post.content || '',
    });
    setMediaList(post.media || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;

    // 삭제 전에 미디어 파일도 R2에서 삭제
    const post = posts.find(p => p.id === id);
    if (post?.media) {
      for (const media of post.media) {
        try {
          await deleteFileFromR2(media.url);
          if (media.thumbnail) {
            await deleteFileFromR2(media.thumbnail);
          }
        } catch (error) {
          console.error('미디어 삭제 실패:', error);
        }
      }
    }

    try {
      await deletePost(id);
      alert('삭제되었어요!');
      invalidateCache('posts');
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

          <div className="form-row">
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
                onChange={(e) => setFormData({ ...formData, platform: e.target.value as Post['platform'] })}
                className="form-select"
              >
                <option value="twitter">X (Twitter)</option>
                <option value="instagram">Instagram</option>
                <option value="weverse">Weverse</option>
                <option value="other">기타</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="post-writer">글쓴이 (선택)</label>
            <input
              id="post-writer"
              type="text"
              value={formData.writer}
              onChange={(e) => setFormData({ ...formData, writer: e.target.value })}
              placeholder="예: 지민, RM, 정국..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-content">내용 (선택)</label>
            <textarea
              id="post-content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="포스트 텍스트 내용"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>미디어 (이미지/영상)</label>
            <div className="media-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                disabled={uploading}
                className="file-input"
                id="media-upload"
              />
              <label htmlFor="media-upload" className="file-input-label">
                {uploading ? (
                  <span>업로드 중... {uploadProgress}%</span>
                ) : (
                  <span>📷 이미지/영상 추가 (여러 파일 선택 가능)</span>
                )}
              </label>
              {uploading && (
                <div className="upload-progress">
                  <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>

            {mediaList.length > 0 && (
              <div className="media-preview-list">
                {mediaList.map((media, index) => (
                  <div key={index} className="media-preview-item">
                    <div className="media-preview-thumb">
                      {media.type === 'video' ? (
                        media.thumbnail ? (
                          <img src={media.thumbnail} alt={`미디어 ${index + 1}`} />
                        ) : (
                          <div className="video-placeholder">🎬</div>
                        )
                      ) : (
                        <img src={media.url} alt={`미디어 ${index + 1}`} />
                      )}
                      {media.type === 'video' && <span className="video-badge">영상</span>}
                    </div>
                    <div className="media-preview-actions">
                      <span className="media-index">#{index + 1}</span>
                      <button
                        type="button"
                        className="move-btn"
                        onClick={() => moveMedia(index, 'up')}
                        disabled={index === 0}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="move-btn"
                        onClick={() => moveMedia(index, 'down')}
                        disabled={index === mediaList.length - 1}
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => handleRemoveMedia(index)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-buttons">
            <button type="submit" className="admin-submit-btn" disabled={uploading}>
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
                  {post.writer && <span className="writer-badge">@{post.writer}</span>}
                </h3>
                <p>{post.date}</p>
                {post.content && (
                  <p className="post-content-preview">
                    {post.content.length > 50 ? post.content.slice(0, 50) + '...' : post.content}
                  </p>
                )}
                {post.media && post.media.length > 0 && (
                  <div className="post-media-badges">
                    <span className="media-count-badge">
                      📷 {post.media.filter(m => m.type === 'image').length}장
                    </span>
                    {post.media.some(m => m.type === 'video') && (
                      <span className="media-count-badge">
                        🎬 {post.media.filter(m => m.type === 'video').length}개
                      </span>
                    )}
                  </div>
                )}
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
