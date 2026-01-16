import { useState } from 'react';
import { videos, moments, photos, episodes, articles, featuredContent } from '../../data/mockData';

export default function Dashboard() {
  const [selectedType, setSelectedType] = useState<string>(featuredContent.type || '');
  const [selectedId, setSelectedId] = useState<string>(featuredContent.id || '');

  // 선택된 타입에 따른 아이템 목록 (에피소드 제외 - DM 형식)
  const getItemsForType = () => {
    switch (selectedType) {
      case 'video': return videos;
      case 'moment': return moments;
      case 'photo': return photos;
      default: return [];
    }
  };

  // 현재 메인 걸기 정보
  const getCurrentFeatured = () => {
    if (!featuredContent.type || !featuredContent.id) return '없음';
    const typeLabel: Record<string, string> = { video: '영상', moment: '모먼트', photo: '사진' };
    let itemTitle = '';
    
    if (featuredContent.type === 'video') {
      const item = videos.find(v => v.id === featuredContent.id);
      itemTitle = item?.title || '';
    } else if (featuredContent.type === 'moment') {
      const item = moments.find(m => m.id === featuredContent.id);
      itemTitle = item?.title || '';
    } else if (featuredContent.type === 'photo') {
      const item = photos.find(p => p.id === featuredContent.id);
      itemTitle = item?.title || '';
    }
    
    return itemTitle ? `${typeLabel[featuredContent.type]}: ${itemTitle}` : '없음';
  };

  const handleSave = () => {
    if (selectedType && selectedId) {
      featuredContent.type = selectedType as 'video' | 'photo' | 'moment';
      featuredContent.id = selectedId;
      alert('메인 걸기가 저장되었어요!\n(새로고침하면 홈에서 확인 가능)');
    }
  };

  const handleClear = () => {
    featuredContent.type = null;
    featuredContent.id = null;
    setSelectedType('');
    setSelectedId('');
    alert('메인 걸기가 해제되었어요!');
  };

  return (
    <div className="admin-page">
      <h1>대시보드</h1>
      
      <div className="admin-stats">
        <div className="admin-stat-card">
          <span className="admin-stat-icon">📹</span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{videos.length}</span>
            <span className="admin-stat-label">영상</span>
          </div>
        </div>
        
        <div className="admin-stat-card">
          <span className="admin-stat-icon">✨</span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{moments.length}</span>
            <span className="admin-stat-label">모먼트</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon">📷</span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{photos.length}</span>
            <span className="admin-stat-label">사진</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon">🎬</span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{episodes.length}</span>
            <span className="admin-stat-label">에피소드</span>
          </div>
        </div>
        
        <div className="admin-stat-card">
          <span className="admin-stat-icon">📰</span>
          <div className="admin-stat-info">
            <span className="admin-stat-number">{articles.length}</span>
            <span className="admin-stat-label">글</span>
          </div>
        </div>
      </div>

      {/* 메인 걸기 설정 */}
      <div className="admin-section">
        <h2>⭐ 홈 메인 걸기</h2>
        <p className="admin-hint" style={{ marginBottom: '1rem' }}>
          현재: <strong>{getCurrentFeatured()}</strong>
        </p>
        
        <div className="admin-form" style={{ maxWidth: '100%' }}>
          <div className="featured-select-row">
            <div className="form-group">
              <label>종류</label>
              <select 
                value={selectedType} 
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setSelectedId('');
                }}
                className="form-select"
              >
                <option value="">선택하세요</option>
                <option value="video">📹 영상</option>
                <option value="moment">✨ 모먼트</option>
                <option value="photo">📷 사진</option>
              </select>
            </div>

            {selectedType && (
              <div className="form-group">
                <label>항목</label>
                <select 
                  value={selectedId} 
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="form-select"
                >
                  <option value="">선택하세요</option>
                  {getItemsForType().map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="featured-btn-row">
            <button 
              type="button" 
              className="admin-submit-btn"
              onClick={handleSave}
              disabled={!selectedType || !selectedId}
            >
              메인 걸기 저장
            </button>
            <button 
              type="button" 
              className="admin-clear-btn"
              onClick={handleClear}
            >
              해제
            </button>
          </div>
        </div>
      </div>

      <div className="admin-section">
        <h2>빠른 작업</h2>
        <div className="admin-quick-actions">
          <a href="/admin/videos" className="quick-action-btn">
            ➕ 영상
          </a>
          <a href="/admin/moments" className="quick-action-btn">
            ➕ 모먼트
          </a>
          <a href="/admin/photos" className="quick-action-btn">
            ➕ 사진
          </a>
          <a href="/admin/episodes" className="quick-action-btn">
            ➕ 에피소드
          </a>
          <a href="/admin/articles" className="quick-action-btn">
            ➕ 글
          </a>
        </div>
      </div>
    </div>
  );
}
