import { useState } from 'react';
import { moments, videos } from '../../data/mockData';

export default function AdminMoments() {
  const [formData, setFormData] = useState({
    title: '',
    tweetUrl: '',
    date: '',
    videoId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newMoment = {
      id: String(Date.now()),
      title: formData.title,
      tweetUrl: formData.tweetUrl,
      date: formData.date,
      videoId: formData.videoId || undefined,
    };
    
    console.log('새 모먼트 추가:', newMoment);
    alert('콘솔에 데이터가 출력되었어요!\n실제 저장은 Supabase 연동 후 가능해요.');
    
    setFormData({ title: '', tweetUrl: '', date: '', videoId: '' });
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
      videoId,
      date: selectedVideo ? selectedVideo.date : formData.date,
    });
  };

  return (
    <div className="admin-page">
      <h1>모먼트 관리</h1>
      
      <div className="admin-section">
        <h2>새 모먼트 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="어떤 순간인지 설명"
              required
            />
          </div>
          
          <div className="form-group">
            <label>트윗 URL *</label>
            <input
              type="url"
              value={formData.tweetUrl}
              onChange={(e) => setFormData({ ...formData, tweetUrl: e.target.value })}
              placeholder="https://x.com/.../status/..."
              required
            />
            <span className="form-hint">트위터(X)에 영상을 올린 후 트윗 URL을 복사해서 붙여넣으세요</span>
          </div>

          <div className="form-group">
            <label>연결할 영상</label>
            <select
              value={formData.videoId}
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
            <label>날짜 *</label>
            <input
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
                {moment.videoId && (
                  <p className="linked-video">🎬 {getVideoTitle(moment.videoId)}</p>
                )}
                <a href={moment.tweetUrl} target="_blank" rel="noopener noreferrer" className="item-link">
                  {moment.tweetUrl}
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
