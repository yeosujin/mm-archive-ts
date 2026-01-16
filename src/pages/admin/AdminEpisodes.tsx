import { useState } from 'react';
import { episodes } from '../../data/mockData';

export default function AdminEpisodes() {
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    date: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newEpisode = {
      id: String(Date.now()),
      title: formData.title,
      imageUrl: formData.imageUrl,
      date: formData.date,
    };
    
    console.log('새 에피소드 추가:', newEpisode);
    alert('콘솔에 데이터가 출력되었어요!\n실제 저장은 Supabase 연동 후 가능해요.');
    
    setFormData({ title: '', imageUrl: '', date: '' });
  };

  return (
    <div className="admin-page">
      <h1>에피소드 관리</h1>
      
      <div className="admin-section">
        <h2>새 에피소드 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="EP.01 에피소드 제목"
              required
            />
          </div>
          
          <div className="form-group">
            <label>커버 이미지 URL *</label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/cover.jpg"
              required
            />
            <span className="form-hint">에피소드 대표 이미지 URL</span>
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
        <h2>등록된 에피소드 ({episodes.length}개)</h2>
        <div className="admin-list">
          {episodes.map((episode) => (
            <div key={episode.id} className="admin-list-item">
              <img src={episode.imageUrl} alt={episode.title} className="admin-list-thumb landscape" />
              <div className="admin-list-info">
                <h3>{episode.title}</h3>
                <p>{episode.date}</p>
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
