import { useState } from 'react';
import { videos } from '../../data/mockData';

export default function AdminVideos() {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    date: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newVideo = {
      id: String(Date.now()),
      title: formData.title,
      url: formData.url,
      date: formData.date,
    };
    
    console.log('새 영상 추가:', newVideo);
    alert('콘솔에 데이터가 출력되었어요!\n실제 저장은 Supabase 연동 후 가능해요.');
    
    setFormData({ title: '', url: '', date: '' });
  };

  return (
    <div className="admin-page">
      <h1>영상 관리</h1>
      
      <div className="admin-section">
        <h2>새 영상 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="영상 제목"
              required
            />
          </div>
          
          <div className="form-group">
            <label>영상 URL *</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="YouTube, Twitter(X) 영상 URL"
              required
            />
            <span className="form-hint">예: https://youtube.com/watch?v=... 또는 https://x.com/.../status/...</span>
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
        <h2>등록된 영상 ({videos.length}개)</h2>
        <div className="admin-list">
          {videos.map((video) => (
            <div key={video.id} className="admin-list-item simple-item">
              <div className="admin-list-info">
                <h3>{video.title}</h3>
                <p>{video.date}</p>
                <a href={video.url} target="_blank" rel="noopener noreferrer" className="item-link">
                  {video.url}
                </a>
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
