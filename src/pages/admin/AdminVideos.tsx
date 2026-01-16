import { useState, useEffect } from 'react';
import { getVideos, createVideo, deleteVideo } from '../../lib/database';
import type { Video } from '../../lib/database';

export default function AdminVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    date: '',
  });

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const data = await getVideos();
      setVideos(data);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createVideo({
        title: formData.title,
        url: formData.url,
        date: formData.date,
      });
      
      alert('영상이 추가되었어요!');
      setFormData({ title: '', url: '', date: '' });
      loadVideos(); // 목록 새로고침
    } catch (error) {
      console.error('Error creating video:', error);
      alert('영상 추가 중 오류가 발생했어요.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      await deleteVideo(id);
      alert('삭제되었어요!');
      loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
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
      <h1>영상 관리</h1>
      
      <div className="admin-section">
        <h2>새 영상 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="video-title">제목 *</label>
            <input
              id="video-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="영상 제목"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="video-url">영상 URL *</label>
            <input
              id="video-url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="YouTube, Twitter(X) 영상 URL"
              required
            />
            <span className="form-hint">예: https://youtube.com/watch?v=... 또는 https://x.com/.../status/...</span>
          </div>
          
          <div className="form-group">
            <label htmlFor="video-date">날짜 *</label>
            <input
              id="video-date"
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
                <button className="delete-btn" onClick={() => handleDelete(video.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
