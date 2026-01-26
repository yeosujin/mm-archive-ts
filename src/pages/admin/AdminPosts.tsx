import { useState, useEffect, useCallback, useRef } from 'react';
import { createPost, updatePost, deletePost } from '../../lib/database';
import type { Post, PostMedia } from '../../lib/database';
import { detectPlatform } from '../../lib/platformUtils';
import PlatformIcon from '../../components/PlatformIcon';
import { getPlatformName } from '../../lib/platformUtils';
import { useData } from '../../context/DataContext';
import { uploadPhotoToR2, uploadVideoToR2, uploadThumbnailFromVideo, generateThumbnailFromUrl, deleteFileFromR2, isVideoFile } from '../../lib/r2Upload';

// 로컬 파일 미리보기용 타입
interface PendingMedia {
  id: string; // 고유 ID (순서 변경용)
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
}

// 통합 미디어 아이템 (업로드된 것 + 대기 중인 것)
type MediaItem =
  | { kind: 'uploaded'; data: PostMedia }
  | { kind: 'pending'; data: PendingMedia };

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
  // 이미 업로드된 미디어 (수정 시 기존 미디어)
  const [uploadedMedia, setUploadedMedia] = useState<PostMedia[]>([]);
  // 아직 업로드되지 않은 로컬 파일들
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [thumbGenerating, setThumbGenerating] = useState(false);
  const [thumbProgress, setThumbProgress] = useState('');

  // 통합 미디어 리스트 (업로드된 것 + 대기 중인 것)
  const mediaItems: MediaItem[] = [
    ...uploadedMedia.map((m): MediaItem => ({ kind: 'uploaded', data: m })),
    ...pendingMedia.map((m): MediaItem => ({ kind: 'pending', data: m })),
  ];

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

  // 컴포넌트 언마운트 시 미리보기 URL 정리
  useEffect(() => {
    return () => {
      pendingMedia.forEach(m => URL.revokeObjectURL(m.previewUrl));
    };
  }, []);

  // URL 변경 시 플랫폼 자동 감지
  const handleUrlChange = (url: string) => {
    const platform = detectPlatform(url);
    setFormData({ ...formData, url, platform });
  };

  // 파일 선택 핸들러 (업로드 X, 로컬 미리보기만)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPending: PendingMedia[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      type: isVideoFile(file) ? 'video' : 'image',
    }));

    setPendingMedia(prev => [...prev, ...newPending]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 미디어 삭제 (업로드된 것 vs 대기 중인 것 구분)
  const handleRemoveMedia = async (index: number) => {
    const item = mediaItems[index];

    if (item.kind === 'uploaded') {
      // R2에서 파일 삭제
      try {
        await deleteFileFromR2(item.data.url);
        if (item.data.thumbnail) {
          await deleteFileFromR2(item.data.thumbnail);
        }
      } catch (error) {
        console.error('R2 파일 삭제 실패:', error);
      }
      // uploadedMedia에서 해당 아이템 제거
      const uploadedIndex = uploadedMedia.findIndex(m => m.url === item.data.url);
      setUploadedMedia(prev => prev.filter((_, i) => i !== uploadedIndex));
    } else {
      // 로컬 미리보기 URL 정리
      URL.revokeObjectURL(item.data.previewUrl);
      // pendingMedia에서 해당 아이템 제거
      setPendingMedia(prev => prev.filter(m => m.id !== item.data.id));
    }
  };

  // 미디어 순서 변경
  const moveMedia = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= mediaItems.length) return;

    // 두 리스트를 합쳐서 순서 변경
    const combined = [...mediaItems];
    [combined[index], combined[newIndex]] = [combined[newIndex], combined[index]];

    // 다시 분리
    const newUploaded: PostMedia[] = [];
    const newPending: PendingMedia[] = [];
    combined.forEach(item => {
      if (item.kind === 'uploaded') {
        newUploaded.push(item.data);
      } else {
        newPending.push(item.data);
      }
    });

    setUploadedMedia(newUploaded);
    setPendingMedia(newPending);
  };

  // 폼 제출 (여기서 실제 R2 업로드 수행)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setUploading(true);
    setUploadProgress(0);

    try {
      // 1. 대기 중인 파일들을 R2에 업로드
      const totalFiles = pendingMedia.length;
      let completedFiles = 0;
      const newlyUploadedMedia: PostMedia[] = [];

      for (const pending of pendingMedia) {
        let url: string;
        let thumbnail: string | undefined;

        if (pending.type === 'video') {
          url = await uploadVideoToR2(pending.file, (progress) => {
            const overallProgress = ((completedFiles + progress / 100) / totalFiles) * 100;
            setUploadProgress(Math.round(overallProgress));
          });

          // 썸네일 생성
          try {
            const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
            const videoKey = url.replace(`${r2PublicUrl}/`, '');
            thumbnail = await uploadThumbnailFromVideo(pending.file, videoKey);
          } catch (thumbErr) {
            console.warn('썸네일 생성 실패:', thumbErr);
          }

          newlyUploadedMedia.push({ type: 'video', url, thumbnail });
        } else {
          url = await uploadPhotoToR2(pending.file, (progress) => {
            const overallProgress = ((completedFiles + progress / 100) / totalFiles) * 100;
            setUploadProgress(Math.round(overallProgress));
          });
          newlyUploadedMedia.push({ type: 'image', url });
        }

        // 미리보기 URL 정리
        URL.revokeObjectURL(pending.previewUrl);
        completedFiles++;
      }

      // 2. 기존 미디어 + 새로 업로드된 미디어 합치기 (순서 유지)
      const finalMedia: PostMedia[] = [];
      mediaItems.forEach(item => {
        if (item.kind === 'uploaded') {
          finalMedia.push(item.data);
        } else {
          // pending 아이템의 위치에 새로 업로드된 미디어 삽입
          const uploadedItem = newlyUploadedMedia.shift();
          if (uploadedItem) {
            finalMedia.push(uploadedItem);
          }
        }
      });

      // 3. 포스트 저장
      const postData = {
        title: formData.title,
        url: formData.url,
        date: formData.date,
        platform: formData.platform,
        writer: formData.writer || undefined,
        content: formData.content || undefined,
        media: finalMedia.length > 0 ? finalMedia : undefined,
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
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    // 남은 미리보기 URL 정리
    pendingMedia.forEach(m => URL.revokeObjectURL(m.previewUrl));
    setFormData({ title: '', url: '', date: '', platform: 'twitter', writer: '', content: '' });
    setUploadedMedia([]);
    setPendingMedia([]);
  };

  const handleEdit = (post: Post) => {
    // 기존 pending 미리보기 정리
    pendingMedia.forEach(m => URL.revokeObjectURL(m.previewUrl));

    setEditingId(post.id);
    setFormData({
      title: post.title,
      url: post.url,
      date: post.date,
      platform: post.platform,
      writer: post.writer || '',
      content: post.content || '',
    });
    setUploadedMedia(post.media || []);
    setPendingMedia([]);
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

  // 포스트 내 영상 중 썸네일 없는 항목들에 대해 일괄 생성
  const handleGenerateThumbnails = async () => {
    const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    const isR2Url = (url: string) =>
      (r2PublicUrl && url.startsWith(r2PublicUrl)) || url.includes('.r2.dev');

    // 썸네일이 없는 R2 영상을 가진 포스트 찾기
    const targets: { post: Post; mediaIndex: number; videoUrl: string }[] = [];
    for (const post of posts) {
      if (!post.media) continue;
      post.media.forEach((media, idx) => {
        if (media.type === 'video' && !media.thumbnail && isR2Url(media.url)) {
          targets.push({ post, mediaIndex: idx, videoUrl: media.url });
        }
      });
    }

    if (targets.length === 0) {
      alert('썸네일이 필요한 R2 영상이 없어요.');
      return;
    }

    if (!confirm(`${targets.length}개 영상의 썸네일을 생성할까요?`)) return;

    setThumbGenerating(true);
    let success = 0;

    for (let i = 0; i < targets.length; i++) {
      const { post, mediaIndex, videoUrl } = targets[i];
      setThumbProgress(`${i + 1}/${targets.length}: ${post.title}`);
      try {
        const thumbnailUrl = await generateThumbnailFromUrl(videoUrl);
        // 해당 미디어의 썸네일 업데이트
        const updatedMedia = [...(post.media || [])];
        updatedMedia[mediaIndex] = { ...updatedMedia[mediaIndex], thumbnail: thumbnailUrl };
        await updatePost(post.id, { media: updatedMedia });
        success++;
      } catch (err) {
        console.error(`썸네일 생성 실패 (${post.title}):`, err);
      }
    }

    setThumbGenerating(false);
    setThumbProgress('');
    invalidateCache('posts');
    loadPosts();
    alert(`완료! ${success}/${targets.length}개 썸네일 생성됨`);
  };

  // 미디어 아이템의 썸네일/미리보기 URL 가져오기
  const getPreviewUrl = (item: MediaItem): string | null => {
    if (item.kind === 'uploaded') {
      return item.data.type === 'video' ? item.data.thumbnail || null : item.data.url;
    } else {
      return item.data.previewUrl;
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
      <div className="admin-header-actions">
        <h1>포스트 관리</h1>
        <button
          className="admin-add-btn-header"
          onClick={handleGenerateThumbnails}
          disabled={thumbGenerating}
          style={{ fontSize: '12px' }}
        >
          {thumbGenerating ? thumbProgress || '생성 중...' : '🖼️ 썸네일 일괄 생성'}
        </button>
      </div>

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
              placeholder="예: 민주, 모카"
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
                onChange={handleFileSelect}
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

            {mediaItems.length > 0 && (
              <div className="media-preview-list">
                {mediaItems.map((item, index) => {
                  const previewUrl = getPreviewUrl(item);
                  const isVideo = item.kind === 'uploaded'
                    ? item.data.type === 'video'
                    : item.data.type === 'video';
                  const isPending = item.kind === 'pending';

                  return (
                    <div key={item.kind === 'uploaded' ? item.data.url : item.data.id} className={`media-preview-item ${isPending ? 'pending' : ''}`}>
                      <div className="media-preview-thumb">
                        {previewUrl ? (
                          <img src={previewUrl} alt={`미디어 ${index + 1}`} />
                        ) : (
                          <div className="video-placeholder">🎬</div>
                        )}
                        {isVideo && <span className="video-badge">영상</span>}
                        {isPending && <span className="pending-badge">대기</span>}
                      </div>
                      <div className="media-preview-actions">
                        <span className="media-index">#{index + 1}</span>
                        <button
                          type="button"
                          className="move-btn"
                          onClick={() => moveMedia(index, 'up')}
                          disabled={index === 0 || uploading}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="move-btn"
                          onClick={() => moveMedia(index, 'down')}
                          disabled={index === mediaItems.length - 1 || uploading}
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => handleRemoveMedia(index)}
                          disabled={uploading}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-buttons">
            <button type="submit" className="admin-submit-btn" disabled={uploading}>
              {uploading ? '업로드 중...' : (editingId ? '수정하기' : '추가하기')}
            </button>
            {editingId && (
              <button type="button" className="admin-clear-btn" onClick={handleCancelEdit} disabled={uploading}>
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
