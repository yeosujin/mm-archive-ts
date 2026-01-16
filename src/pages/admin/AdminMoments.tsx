import { useState, useEffect } from 'react';
import { getMoments, getVideos, createMoment, deleteMoment } from '../../lib/database';
import type { Moment, Video } from '../../lib/database';

export default function AdminMoments() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    tweet_url: '',
    date: '',
    video_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [momentsData, videosData] = await Promise.all([
        getMoments(),
        getVideos()
      ]);
      setMoments(momentsData);
      setVideos(videosData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createMoment({
        title: formData.title,
        tweet_url: formData.tweet_url,
        date: formData.date,
        video_id: formData.video_id || undefined,
      });
      
      alert('모먼트가 추가되었어요!');
      setFormData({ title: '', tweet_url: '', date: '', video_id: '' });
      loadData();
    } catch (error) {
      console.error('Error creating moment:', error);
      alert('모먼트 추가 중 오류가 발생했어요.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      await deleteMoment(id);
      alert('삭제되었어요!');
      loadData();
    } catch (error) {
      console.error('Error deleting moment:', error);
      alert('삭제 중 오류가 발생했어요.');
    }
  };

  // 선택된 영상 정보 가져오기
  const getVideoTitle = (videoId: string | undefined) => {
    if (!videoId) return '연결된 영상 없음';
    const video = videos.find(v => v.id === videoId);
    return video ? video.title : '알 수 없는 영상';
  };

  // 영상 선택 시 날짜 자동 설정
  const handleVideoSelect = (videoId: string) => {
    const selectedVideo = videos.find(v => v.id === videoId);
    setFormData({
      ...formData,
      video_id: videoId,
      date: selectedVideo ? selectedVideo.date : formData.date,
    });
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
      <h1>모먼트 관리</h1>
      
      <div className="admin-section">
        <h2>새 모먼트 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="moment-title">제목 *</label>
            <input
              id="moment-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="어떤 순간인지 설명"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="moment-url">트윗 URL *</label>
            <input
              id="moment-url"
              type="url"
              value={formData.tweet_url}
              onChange={(e) => setFormData({ ...formData, tweet_url: e.target.value })}
              placeholder="https://x.com/.../status/..."
              required
            />
            <span className="form-hint">트위터(X)에 영상을 올린 후 트윗 URL을 복사해서 붙여넣으세요</span>
          </div>

          <div className="form-group">
            <label htmlFor="moment-video">연결할 영상</label>
            <select
              id="moment-video"
              value={formData.video_id}
              onChange={(e) => handleVideoSelect(e.target.value)}
              className="form-select"
            >
              <option value="">영상 선택 (선택사항)</option>
              {videos.map((video) => (
                <option key={video.id} value={video.id}>
                  [{video.date}] {video.title}
                </option>
              ))}
            </select>
            <span className="form-hint">영상 선택 시 날짜가 자동으로 설정돼요</span>
          </div>
          
          <div className="form-group">
            <label htmlFor="moment-date">날짜 *</label>
            <input
              id="moment-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            <span className="form-hint">영상과 다른 날짜로 수정할 수도 있어요</span>
          </div>
          
          <button type="submit" className="admin-submit-btn">
            추가하기
          </button>
        </form>
      </div>

      <div className="admin-section">
        <h2>등록된 모먼트 ({moments.length}개)</h2>
        <div className="admin-list">
          {moments.map((moment) => (
            <div key={moment.id} className="admin-list-item simple-item">
              <div className="admin-list-info">
                <h3>{moment.title}</h3>
                <p>{moment.date}</p>
                {moment.video_id && (
                  <p className="linked-video">🎬 {getVideoTitle(moment.video_id)}</p>
                )}
                <a href={moment.tweet_url} target="_blank" rel="noopener noreferrer" className="item-link">
                  {moment.tweet_url}
                </a>
              </div>
              <div className="admin-list-actions">
                <button className="delete-btn" onClick={() => handleDelete(moment.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
