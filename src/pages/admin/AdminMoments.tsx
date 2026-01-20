import { useState, useEffect } from 'react';
import { getMoments, getVideos, createMoment, updateMoment, deleteMoment } from '../../lib/database';
import type { Moment, Video } from '../../lib/database';
import { uploadVideoToR2, isVideoFile, formatFileSize } from '../../lib/r2Upload';

export default function AdminMoments() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
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

  // 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isVideoFile(file)) {
      alert('비디오 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 확인 (500MB 제한)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      alert('파일 크기는 500MB 이하여야 합니다.');
      return;
    }

    setUploading(true);
    setUploadProgress(`업로드 중... (${formatFileSize(file.size)})`);

    try {
      const url = await uploadVideoToR2(file);
      setFormData({ ...formData, tweet_url: url });
      setUploadProgress('업로드 완료! ✅');
      setTimeout(() => setUploadProgress(''), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      alert('업로드 실패: ' + (error as Error).message);
      setUploadProgress('');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        await updateMoment(editingId, {
          title: formData.title,
          tweet_url: formData.tweet_url,
          date: formData.date,
          video_id: formData.video_id || undefined,
        });
        alert('수정되었어요!');
        setEditingId(null);
      } else {
        await createMoment({
      title: formData.title,
          tweet_url: formData.tweet_url,
      date: formData.date,
          video_id: formData.video_id || undefined,
        });
        alert('모먼트가 추가되었어요!');
      }
      
      setFormData({ title: '', tweet_url: '', date: '', video_id: '' });
      loadData();
    } catch (error) {
      console.error('Error saving moment:', error);
      alert('저장 중 오류가 발생했어요.');
    }
  };

  const handleEdit = (moment: Moment) => {
    setEditingId(moment.id);
    setFormData({
      title: moment.title,
      tweet_url: moment.tweet_url,
      date: moment.date,
      video_id: moment.video_id || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', tweet_url: '', date: '', video_id: '' });
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

  const getVideoTitle = (videoId: string | undefined) => {
    if (!videoId) return '연결된 영상 없음';
    const video = videos.find(v => v.id === videoId);
    return video ? video.title : '알 수 없는 영상';
  };

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
        <h2>{editingId ? '모먼트 수정' : '새 모먼트 추가'}</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          {/* R2 직접 업로드 */}
          <div className="form-group">
            <label htmlFor="moment-file">📤 영상 파일 직접 업로드</label>
            <input
              id="moment-file"
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ marginBottom: '0.5rem' }}
            />
            {uploadProgress && (
              <span className="form-hint" style={{ color: uploading ? '#666' : '#4CAF50' }}>
                {uploadProgress}
              </span>
            )}
            <span className="form-hint">
              또는 아래에 트윗 URL을 입력하세요
            </span>
          </div>

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
            <label htmlFor="moment-url">영상 URL *</label>
            <input
              id="moment-url"
              type="url"
              value={formData.tweet_url}
              onChange={(e) => setFormData({ ...formData, tweet_url: e.target.value })}
              placeholder="트윗 URL 또는 R2 업로드 URL"
              required
            />
            <span className="form-hint">트위터(X) 트윗 URL 또는 위에서 업로드한 영상 URL</span>
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
                <button className="edit-btn" onClick={() => handleEdit(moment)}>수정</button>
                <button className="delete-btn" onClick={() => handleDelete(moment.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
