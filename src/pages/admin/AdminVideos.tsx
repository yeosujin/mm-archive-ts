import { useState, useEffect, useRef } from 'react';
import { getVideos, createVideo, updateVideo, deleteVideo } from '../../lib/database';
import type { Video } from '../../lib/database';
import { uploadVideoToR2, deleteFileFromR2, isVideoFile } from '../../lib/r2Upload';

const HEART_OPTIONS = [
  { value: '💙', label: '💙 파란색' },
  { value: '🩵', label: '🩵 하늘색' },
  { value: '🖤', label: '🖤 검은색' },
  { value: '🤍', label: '🤍 흰색' },
];

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// YouTube URL에서 비디오 ID 추출
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// YouTube 영상 정보 가져오기
async function fetchYouTubeInfo(videoId: string): Promise<{ title: string; date: string } | null> {
  try {
    console.log('Fetching YouTube info for:', videoId);
    console.log('API Key exists:', !!YOUTUBE_API_KEY);
    console.log('API Key (first 10 chars):', YOUTUBE_API_KEY?.substring(0, 10) + '...');
    
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();
    
    console.log('YouTube API response:', data);
    
    if (data.error) {
      console.error('YouTube API error:', data.error);
      return null;
    }
    
    if (data.items && data.items.length > 0) {
      const snippet = data.items[0].snippet;
      return {
        title: snippet.title,
        date: snippet.publishedAt.split('T')[0], // YYYY-MM-DD 형식
      };
    }
    return null;
  } catch (error) {
    console.error('YouTube API error:', error);
    return null;
  }
}

export default function AdminVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    date: '',
    icon: '🩵',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  // URL 변경 감지 로그
  useEffect(() => {
    console.log('[AdminVideos] formData.url changed:', formData.url);
  }, [formData.url]);

  useEffect(() => {
    console.log('[AdminVideos] uploading state changed:', uploading);
  }, [uploading]);

  // URL 타입 확인
  const isYouTubeUrl = formData.url.includes('youtube.com') || formData.url.includes('youtu.be');
  const isWeverseUrl = formData.url.includes('weverse.io');

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

  // YouTube 정보 불러오기
  const handleFetchYouTube = async () => {
    const videoId = extractYouTubeId(formData.url);
    if (!videoId) {
      alert('올바른 YouTube URL을 입력해주세요.');
      return;
    }

    setFetching(true);
    try {
      const info = await fetchYouTubeInfo(videoId);
      if (info) {
        setFormData(prev => ({
          ...prev,
          title: info.title,
          date: info.date,
        }));
      } else {
        alert('영상 정보를 가져올 수 없어요.');
      }
    } catch (error) {
      console.error('Error fetching YouTube info:', error);
      alert('영상 정보를 가져오는 중 오류가 발생했어요.');
    } finally {
      setFetching(false);
    }
  };

  // 파일 업로드 핸들러
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 비디오 파일 확인
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

    console.log('[AdminVideos] File upload triggered');
    setUploading(true);
    setUploadProgress(0);
    setUploadMessage(`업로드 중... (0%)`);

    try {
      console.log('[AdminVideos] Calling uploadVideoToR2...');
      
      // 업로드 시작과 동시에 "업로드 중..." 선제적 표시
      setFormData(prev => ({ ...prev, url: '업로드 중...' }));

      const uploadedUrl = await uploadVideoToR2(file, (percent) => {
        setUploadProgress(percent);
        setUploadMessage(`업로드 중... (${percent}%)`);
      });
      
      console.log('[AdminVideos] Upload result URL:', uploadedUrl);
      
      if (!uploadedUrl) {
        throw new Error('업로드된 URL이 비어있습니다.');
      }

      console.log('[AdminVideos] Updating formData.url with:', uploadedUrl);
      setFormData(prev => ({ ...prev, url: uploadedUrl }));
      
      setUploadMessage('업로드 완료! ✅');
      setTimeout(() => setUploadMessage(''), 3000);
    } catch (error: any) {
      console.error('[AdminVideos] Upload error details:', error);
      const errorDetail = error.message || '알 수 없는 오류';
      alert(`업로드 실패 ❌\n원인: ${errorDetail}\n\n브라우저 콘솔(F12)을 확인하여 상세 에러 로그를 확인해주세요.`);
      setUploadMessage('');
      // 오류 시 URL 원복 (또는 비우기)
      setFormData(prev => ({ ...prev, url: '' }));
    } finally {
      console.log('[AdminVideos] Upload process finished, resetting uploading state');
      setUploading(false);
      setUploadProgress(0);
      setFileInputKey(prev => prev + 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        const originalVideo = videos.find(v => v.id === editingId);
        // 만약 URL이 바뀌었고, 기존 URL이 R2 파일이었다면 삭제
        if (originalVideo && originalVideo.url !== formData.url) {
          console.log('[AdminVideos] URL changed, checking for old R2 file cleanup:', originalVideo.url);
          deleteFileFromR2(originalVideo.url).catch(err => console.error('Cleanup failed:', err));
        }

        await updateVideo(editingId, {
          title: formData.title,
          url: formData.url,
          date: formData.date,
          icon: isWeverseUrl ? formData.icon : undefined,
        });
        alert('수정되었어요!');
        setEditingId(null);
      } else {
        await createVideo({
          title: formData.title,
          url: formData.url,
          date: formData.date,
          ...(isWeverseUrl && { icon: formData.icon }),
        });
        alert('영상이 추가되었어요!');
      }
      
      setFormData({ title: '', url: '', date: '', icon: '🩵' });
      loadVideos();
    } catch (error) {
      console.error('Error saving video:', error);
      alert('저장 중 오류가 발생했어요.');
    }
  };

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setFormData({
      title: video.title,
      url: video.url,
      date: video.date,
      icon: video.icon || '🩵',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', url: '', date: '', icon: '🩵' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      const video = videos.find(v => v.id === id);
      if (video?.url) {
        await deleteFileFromR2(video.url);
      }
      
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
        <h2>{editingId ? '영상 수정' : '새 영상 추가'}</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="video-file">📤 영상 파일 직접 업로드</label>
            <div className="upload-container" style={{ position: 'relative' }}>
              <input
                key={fileInputKey}
                ref={fileInputRef}
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ marginBottom: '0.5rem', width: '100%' }}
              />
              {uploading && (
                <div className="upload-progress-overlay">
                  <div className="spinner"></div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            {uploadMessage && (
              <span className="form-hint" style={{ color: uploading ? '#666' : '#4CAF50', fontWeight: 'bold' }}>
                {uploadMessage}
              </span>
            )}
            <span className="form-hint">
              또는 아래에 YouTube/Twitter/Weverse URL을 입력하세요
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="video-url">영상 URL *</label>
            <div className="input-with-button">
              <input
                id="video-url"
                type="text"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="YouTube, Twitter(X), Weverse 영상 URL"
                required
              />
              {isYouTubeUrl && (
                <button 
                  type="button" 
                  className="fetch-btn"
                  onClick={handleFetchYouTube}
                  disabled={fetching}
                >
                  {fetching ? '불러오는 중...' : '정보 불러오기'}
                </button>
              )}
            </div>
            <span className="form-hint">
              {isYouTubeUrl 
                ? '✨ YouTube URL이에요! "정보 불러오기"를 눌러 제목과 날짜를 자동으로 가져오세요'
                : 'YouTube, YouTube Shorts, Twitter(X), Weverse 지원'
              }
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="video-title">제목 *</label>
            <input
              id="video-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="영상 제목"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="video-date">날짜 *</label>
            <input
              id="video-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>
          
          {isWeverseUrl && (
            <div className="form-group">
              <label htmlFor="video-icon">아이콘 선택</label>
              <select
                id="video-icon"
                value={formData.icon}
                onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                className="form-select"
              >
                {HEART_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <span className="form-hint">위버스 영상 카드에 표시될 아이콘</span>
            </div>
          )}
          
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
        <h2>등록된 영상 ({videos.length}개)</h2>
        <div className="admin-list">
          {videos.map((video) => (
            <div key={video.id} className="admin-list-item simple-item">
              <div className="admin-list-info">
                <h3>{video.icon && <span style={{ marginRight: '0.5rem' }}>{video.icon}</span>}{video.title}</h3>
                <p>{video.date}</p>
                <a href={video.url} target="_blank" rel="noopener noreferrer" className="item-link">
                  {video.url}
                </a>
              </div>
              <div className="admin-list-actions">
                <button className="edit-btn" onClick={() => handleEdit(video)}>수정</button>
                <button className="delete-btn" onClick={() => handleDelete(video.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
