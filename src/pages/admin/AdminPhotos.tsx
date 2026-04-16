import { useState, useEffect, useRef } from 'react';
import { createPhoto, updatePhoto, deletePhoto } from '../../lib/database';
import type { Photo } from '../../lib/database';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/ConfirmDialog';
import { uploadPhotoToR2, deleteFileFromR2 } from '../../lib/r2Upload';

function resizeImage(file: File, maxSize: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 이미 작으면 그대로 반환
      if (img.width <= maxSize && img.height <= maxSize) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: file.lastModified }));
        },
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
}

export default function AdminPhotos() {
  const { photos: cachedPhotos, fetchPhotos } = useData();
  const { toasts, showToast, removeToast } = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const photos = cachedPhotos || [];
  const [loading, setLoading] = useState(!cachedPhotos);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    tags: '',
  });
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const pendingFilesRef = useRef<PendingFile[]>([]);
  pendingFilesRef.current = pendingFiles;
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPhotos().finally(() => setLoading(false));
  }, [fetchPhotos]);

  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach(f => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPending: PendingFile[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingFiles(prev => [...prev, ...newPending]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    const file = pendingFiles.find(f => f.id === id);
    if (file) URL.revokeObjectURL(file.previewUrl);
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  };

  const parseTags = (input: string): string[] => {
    return input
      .split(/[,#\s]+/)
      .map(t => t.trim())
      .filter(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // 수정 모드
      try {
        await updatePhoto(editingId, {
          title: formData.title,
          date: formData.date,
          tags: parseTags(formData.tags),
        });
        showToast('수정되었어요!', 'success');
        resetForm();
        await fetchPhotos(true);
      } catch (error) {
        console.error('Error updating photo:', error);
        showToast('수정 중 오류가 발생했어요.', 'error');
      }
      return;
    }

    // 신규 등록 (다중 업로드)
    if (pendingFiles.length === 0) {
      showToast('사진을 선택해주세요.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = pendingFiles.length;
      const tags = parseTags(formData.tags);
      let completedFiles = 0;

      // 이미지 리사이즈 + R2 업로드 병렬 처리
      const BATCH_SIZE = 3;
      const results: { title: string; imageUrl: string; thumbnailUrl: string }[] = [];

      for (let batchStart = 0; batchStart < pendingFiles.length; batchStart += BATCH_SIZE) {
        const batch = pendingFiles.slice(batchStart, batchStart + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map(async (pending, batchIndex) => {
            const i = batchStart + batchIndex;
            const title = totalFiles === 1
              ? formData.title
              : `${formData.title}-${i + 1}`;

            // 원본(1920px) + 썸네일(400px) 동시 리사이즈
            const [resizedFile, thumbFile] = await Promise.all([
              resizeImage(pending.file, 1920),
              resizeImage(pending.file, 400),
            ]);

            // 원본 + 썸네일 동시 업로드
            const [imageUrl, thumbnailUrl] = await Promise.all([
              uploadPhotoToR2(resizedFile),
              uploadPhotoToR2(thumbFile),
            ]);

            URL.revokeObjectURL(pending.previewUrl);
            return { title, imageUrl, thumbnailUrl };
          })
        );

        results.push(...batchResults);
        completedFiles += batch.length;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      }

      // DB 저장도 병렬
      await Promise.all(
        results.map(({ title, imageUrl, thumbnailUrl }) =>
          createPhoto({
            title,
            date: formData.date,
            tags,
            image_url: imageUrl,
            thumbnail_url: thumbnailUrl,
          })
        )
      );

      showToast(`${totalFiles}장 업로드 완료!`, 'success');
      resetForm();
      await fetchPhotos(true);
    } catch (error) {
      console.error('Error uploading photos:', error);
      showToast('업로드 중 오류가 발생했어요.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setFormData({ title: '', date: '', tags: '' });
    setPendingFiles([]);
    setEditingId(null);
  };

  const handleEdit = (photo: Photo) => {
    pendingFiles.forEach(f => URL.revokeObjectURL(f.previewUrl));
    setEditingId(photo.id);
    setFormData({
      title: photo.title,
      date: photo.date,
      tags: photo.tags.join(', '),
    });
    setPendingFiles([]);
    globalThis.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ message: '정말 삭제하시겠어요?', type: 'danger' });
    if (!confirmed) return;

    const photo = photos.find(p => p.id === id);
    if (photo) {
      try {
        await deleteFileFromR2(photo.image_url);
        if (photo.thumbnail_url) {
          await deleteFileFromR2(photo.thumbnail_url);
        }
      } catch (error) {
        console.error('R2 파일 삭제 실패:', error);
      }
    }

    try {
      await deletePhoto(id);
      showToast('삭제되었어요!', 'success');
      await fetchPhotos(true);
    } catch (error) {
      console.error('Error deleting photo:', error);
      showToast('삭제 중 오류가 발생했어요.', 'error');
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
    <>
      <Toast toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <div className="admin-page">
        <h1>사진 관리</h1>

        <div className="admin-section">
          <h2>{editingId ? '사진 수정' : '새 사진 추가'}</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-group">
              <label htmlFor="photo-title">제목 *</label>
              <input
                id="photo-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="여러 장 업로드 시 제목-1, 제목-2 ... 로 저장됩니다"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="photo-date">날짜 *</label>
              <input
                id="photo-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="photo-tags">태그</label>
              <input
                id="photo-tags"
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="쉼표 또는 #으로 구분 (예: 팬미팅, 콘서트)"
              />
            </div>

            {!editingId && (
              <div className="form-group">
                <label>사진 파일 *</label>
                <div className="media-upload-area">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="file-input"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="file-input-label">
                    {uploading ? (
                      <span>업로드 중... {uploadProgress}%</span>
                    ) : (
                      <span>사진 선택 (여러 장 가능)</span>
                    )}
                  </label>
                  {uploading && (
                    <div className="upload-progress">
                      <div className="progress-bar" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </div>

                {pendingFiles.length > 0 && (
                  <div className="media-preview-list">
                    {pendingFiles.map((pending, index) => (
                      <div key={pending.id} className="media-preview-item pending">
                        <div className="media-preview-thumb">
                          <img src={pending.previewUrl} alt={`미리보기 ${index + 1}`} loading="lazy" />
                        </div>
                        <div className="media-preview-actions">
                          <span className="media-index">
                            {pendingFiles.length === 1 ? formData.title || '#1' : `${formData.title || ''}-${index + 1}`}
                          </span>
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => handleRemoveFile(pending.id)}
                            disabled={uploading}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="form-buttons">
              <button type="submit" className="admin-submit-btn" disabled={uploading}>
                {uploading ? '업로드 중...' : (editingId ? '수정하기' : `추가하기${pendingFiles.length > 0 ? ` (${pendingFiles.length}장)` : ''}`)}
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
          <h2>등록된 사진 ({photos.length}개)</h2>
          <div className="admin-photos-grid">
            {photos.map((photo) => (
              <div key={photo.id} className="admin-photo-card">
                <div className="admin-photo-card-thumb">
                  <img src={photo.thumbnail_url || photo.image_url} alt={photo.title} loading="lazy" />
                </div>
                <div className="admin-photo-card-info">
                  <h3>{photo.title}</h3>
                  <p>{photo.date}</p>
                  {photo.tags.length > 0 && (
                    <p className="photo-tags-preview">
                      {photo.tags.map(t => `#${t}`).join(' ')}
                    </p>
                  )}
                </div>
                <div className="admin-photo-card-actions">
                  <button className="edit-btn" onClick={() => handleEdit(photo)}>수정</button>
                  <button className="delete-btn" onClick={() => handleDelete(photo.id)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
