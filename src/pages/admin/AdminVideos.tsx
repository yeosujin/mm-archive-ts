import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createVideo, updateVideo, deleteVideo } from '../../lib/database';
import type { Video } from '../../lib/database';
import { uploadVideoToR2, deleteFileFromR2, isVideoFile } from '../../lib/r2Upload';
import AdminModal from '../../components/AdminModal';
import PlatformIcon from '../../components/PlatformIcon';
import { detectVideoPlatform } from '../../lib/platformUtils';
import VideoEmbed from '../../components/VideoEmbed';
import { useData } from '../../context/DataContext';

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
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();
    
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
  const { videos: cachedVideos, fetchVideos, invalidateCache } = useData();
  const [loading, setLoading] = useState(!cachedVideos);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    date: '',
    icon: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  // Sync with cache
  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);

  // URL 타입 확인
  const isYouTubeUrl = formData.url.includes('youtube.com') || formData.url.includes('youtu.be');
  const isWeverseUrl = formData.url.includes('weverse.io');

  const loadData = useCallback(async () => {
    try {
      const data = await fetchVideos();
      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchVideos]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (cachedVideos) setVideos(cachedVideos);
  }, [cachedVideos]);

  // 그룹화 로직 (Videos.tsx와 동일)
  const groupedVideos = useMemo(() => {
    const groups: Record<string, Video[]> = {};
    videos.forEach((video) => {
      if (!groups[video.date]) {
        groups[video.date] = [];
      }
      groups[video.date].push(video);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [videos]);

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
    } finally {
      setFetching(false);
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

    setUploading(true);
    setUploadProgress(0);
    setUploadMessage(`업로드 중... (0%)`);

    try {
      setFormData(prev => ({ ...prev, url: '업로드 중...' }));
      const uploadedUrl = await uploadVideoToR2(file, (percent) => {
        setUploadProgress(percent);
        setUploadMessage(`업로드 중... (${percent}%)`);
      });
      
      if (!uploadedUrl) throw new Error('업로드된 URL이 비어있습니다.');
      setFormData(prev => ({ ...prev, url: uploadedUrl }));
      setUploadMessage('업로드 완료! ✅');
      setTimeout(() => setUploadMessage(''), 3000);
    } catch (error) {
      alert('업로드 실패: ' + (error as Error).message);
      setUploadMessage('');
      setFormData(prev => ({ ...prev, url: '' }));
    } finally {
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
        if (originalVideo && originalVideo.url !== formData.url) {
          deleteFileFromR2(originalVideo.url).catch(err => console.error('Cleanup failed:', err));
        }

        await updateVideo(editingId, {
          title: formData.title,
          url: formData.url,
          date: formData.date,
          icon: isWeverseUrl ? formData.icon : undefined,
        });
        alert('수정되었어요!');
      } else {
        await createVideo({
          title: formData.title,
          url: formData.url,
          date: formData.date,
          ...(isWeverseUrl && { icon: formData.icon }),
        });
        alert('영상이 추가되었어요!');
      }
      
      invalidateCache('videos');
      handleCloseModal();
      loadData();
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
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({ title: '', url: '', date: '', icon: '🩵' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ title: '', url: '', date: '', icon: '🩵' });
    setUploadMessage('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      const video = videos.find(v => v.id === id);
      if (video?.url) {
        await deleteFileFromR2(video.url);
      }
      
      await deleteVideo(id);
      invalidateCache('videos');
      alert('삭제되었어요!');
      loadData();
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
      <div className="admin-header-actions">
        <h1>영상 관리</h1>
        <button className="admin-add-btn-header" onClick={handleOpenAddModal}>+ 추가</button>
      </div>

      <div className="video-timeline">
        {groupedVideos.map(([date, dateVideos]) => (
          <div key={date} className="date-thread">
            <div className="thread-date-header">
              <span className="thread-marker"></span>
              <time>{date}</time>
            </div>

            <div className="thread-content">
              {dateVideos.map((video) => (
                <div key={video.id} className="admin-item-wrapper">
                  <div className="admin-item-content">
                    <div className="thread-video-item">
                      <div className="thread-item-header" style={{ cursor: 'default' }}>
                        <span className="item-icon">
                          <PlatformIcon platform={detectVideoPlatform(video.url)} size={18} />
                        </span>
                        <span className="item-title">{video.title}</span>
                      </div>
                      <div className="thread-item-content" style={{ padding: '0 1rem 1rem' }}>
                        <VideoEmbed url={video.url} title={video.title} icon={video.icon} />
                      </div>
                    </div>
                  </div>
                  <div className="admin-item-controls">
                    <button className="admin-control-btn edit" onClick={() => handleEdit(video)}>수정</button>
                    <button className="admin-control-btn delete" onClick={() => handleDelete(video.id)}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingId ? '영상 수정' : '새 영상 추가'}
      >
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
                <div className="upload-progress-overlay" style={{ borderRadius: '8px' }}>
                  <div className="spinner"></div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
            {uploadMessage && <span className="form-hint" style={{ color: '#4CAF50', fontWeight: 'bold' }}>{uploadMessage}</span>}
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
                <button type="button" className="fetch-btn" onClick={handleFetchYouTube} disabled={fetching}>
                  {fetching ? '...' : '정보'}
                </button>
              )}
            </div>
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
            </div>
          )}
          
          <div className="form-buttons">
            <button type="submit" className="admin-submit-btn">
              {editingId ? '수정하기' : '추가하기'}
            </button>
            <button type="button" className="admin-clear-btn" onClick={handleCloseModal}>취소</button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
