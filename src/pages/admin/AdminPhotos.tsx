import { useState, useEffect } from 'react';
import { getPhotos, createPhoto, updatePhoto, deletePhoto } from '../../lib/database';
import type { Photo } from '../../lib/database';

export default function AdminPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    date: '',
  });

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const data = await getPhotos();
      setPhotos(data);
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updatePhoto(editingId, {
          title: formData.title,
          image_url: formData.image_url,
          date: formData.date,
        });
        alert('수정되었어요!');
        setEditingId(null);
      } else {
        await createPhoto({
          title: formData.title,
          image_url: formData.image_url,
          date: formData.date,
        });
        alert('사진이 추가되었어요!');
      }
      
      setFormData({ title: '', image_url: '', date: '' });
      loadPhotos();
    } catch (error) {
      console.error('Error saving photo:', error);
      alert('저장 중 오류가 발생했어요.');
    }
  };

  const handleEdit = (photo: Photo) => {
    setEditingId(photo.id);
    setFormData({
      title: photo.title,
      image_url: photo.image_url,
      date: photo.date,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', image_url: '', date: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      await deletePhoto(id);
      alert('삭제되었어요!');
      loadPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
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
              placeholder="사진 제목"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="photo-url">이미지 URL *</label>
            <input
              id="photo-url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
              required
            />
            <span className="form-hint">이미지 호스팅 서비스(Imgur 등)에 올린 후 URL을 복사하세요</span>
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
        <h2>등록된 사진 ({photos.length}개)</h2>
        <div className="admin-list">
          {photos.map((photo) => (
            <div key={photo.id} className="admin-list-item">
              <img src={photo.image_url} alt={photo.title} className="admin-list-thumb" />
              <div className="admin-list-info">
                <h3>{photo.title}</h3>
                <p>{photo.date}</p>
              </div>
              <div className="admin-list-actions">
                <button className="edit-btn" onClick={() => handleEdit(photo)}>수정</button>
                <button className="delete-btn" onClick={() => handleDelete(photo.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
