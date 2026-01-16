import { useState } from 'react';
import { photos } from '../../data/mockData';

export default function AdminPhotos() {
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    date: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newPhoto = {
      id: String(Date.now()),
      title: formData.title,
      imageUrl: formData.imageUrl,
      date: formData.date,
    };
    
    console.log('새 사진 추가:', newPhoto);
    alert('콘솔에 데이터가 출력되었어요!\n실제 저장은 Supabase 연동 후 가능해요.');
    
    setFormData({ title: '', imageUrl: '', date: '' });
  };

  return (
    <div className="admin-page">
      <h1>사진 관리</h1>
      
      <div className="admin-section">
        <h2>새 사진 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="사진 제목"
              required
            />
          </div>
          
          <div className="form-group">
            <label>이미지 URL *</label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              required
            />
            <span className="form-hint">이미지 호스팅 서비스(Imgur 등)에 올린 후 URL을 복사하세요</span>
          </div>
          
          <div className="form-group">
            <label>날짜 *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          
          <button type="submit" className="admin-submit-btn">
            추가하기
          </button>
        </form>
      </div>

      <div className="admin-section">
        <h2>등록된 사진 ({photos.length}개)</h2>
        <div className="admin-list">
          {photos.map((photo) => (
            <div key={photo.id} className="admin-list-item">
              <img src={photo.imageUrl} alt={photo.title} className="admin-list-thumb" />
              <div className="admin-list-info">
                <h3>{photo.title}</h3>
                <p>{photo.date}</p>
              </div>
              <div className="admin-list-actions">
                <button className="edit-btn">수정</button>
                <button className="delete-btn">삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
