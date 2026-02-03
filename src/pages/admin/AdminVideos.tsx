import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createVideo, updateVideo, deleteVideo } from '../../lib/database';
import type { Video } from '../../lib/database';
import { uploadVideoToR2, uploadThumbnailFromVideo, deleteFileFromR2, isVideoFile } from '../../lib/r2Upload';
import AdminModal from '../../components/AdminModal';
import PlatformIcon from '../../components/PlatformIcon';
import { detectVideoPlatform } from '../../lib/platformUtils';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/ConfirmDialog';

const HEART_OPTIONS = [
  { value: '🤍', label: '🤍 둘만' },
  { value: '💙', label: '💙 모카' },
  { value: '🩵', label: '🩵 민주' },
  { value: '🖤', label: '🖤 여러명' },
];

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function fetchYouTubeInfo(videoId: string): Promise<{ title: string; date: string; channelName: string } | null> {
  // videoId 검증 (11자 영숫자와 -_만 허용)
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${YOUTUBE_API_KEY}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // 응답 구조 검증
    if (!data || typeof data !== 'object') {
      return null;
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      return null;
    }

    const snippet = data.items[0]?.snippet;
    if (!snippet || typeof snippet.title !== 'string' || typeof snippet.publishedAt !== 'string') {
      return null;
    }

    // XSS 방지: 제목에서 위험한 문자 제거
    const safeTitle = snippet.title.replaceAll(/[<>]/g, '');
    const dateMatch = snippet.publishedAt.match(/^\d{4}-\d{2}-\d{2}/);
    const safeDate = dateMatch ? dateMatch[0] : '';
    const safeChannelName = (snippet.channelTitle || '').replaceAll(/[<>]/g, '');

    return { title: safeTitle, date: safeDate, channelName: safeChannelName };
  } catch {
    return null;
  }
}

export default function AdminVideos() {
  const { videos: cachedVideos, fetchVideos, invalidateCache } = useData();
  const { toasts, showToast, removeToast } = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const [loading, setLoading] = useState(!cachedVideos);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    date: '',
    icon: '',
    icon_text: '',
    thumbnail_url: '',
    channel_name: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (cachedVideos) setVideos(cachedVideos); }, [cachedVideos]);

  const groupedVideos = useMemo(() => {
    let filtered = videos;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = videos.filter(video =>
        video.title.toLowerCase().includes(query) || video.date.includes(query)
      );
    }

    const groups: Record<string, Video[]> = {};
    filtered.forEach((video) => {
      if (!groups[video.date]) groups[video.date] = [];
      groups[video.date].push(video);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [videos, searchQuery]);

  const toggleDate = (date: string) => {
    setExpandedDate(prev => prev === date ? null : date);
  };

  const handleFetchYouTube = async () => {
    const videoId = extractYouTubeId(formData.url);
    if (!videoId) { showToast('올바른 YouTube URL을 입력해주세요.', 'error'); return; }
    setFetching(true);
    try {
      const info = await fetchYouTubeInfo(videoId);
      if (info) {
        setFormData(prev => ({ ...prev, title: info.title, date: info.date, channel_name: info.channelName }));
      } else {
        showToast('영상 정보를 가져올 수 없어요.', 'error');
      }
    } catch (error) {
      console.error('Error fetching YouTube info:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isVideoFile(file)) { showToast('비디오 파일만 업로드 가능합니다.', 'error'); return; }

    setUploading(true);
    setUploadProgress(0);
    setUploadMessage('업로드 중... (0%)');

    try {
      setFormData(prev => ({ ...prev, url: '업로드 중...' }));
      const uploadedUrl = await uploadVideoToR2(file, (percent) => {
        setUploadProgress(percent);
        setUploadMessage(`업로드 중... (${percent}%)`);
      });
      if (!uploadedUrl) throw new Error('업로드된 URL이 비어있습니다.');
      setFormData(prev => ({ ...prev, url: uploadedUrl }));

      setUploadMessage('썸네일 생성 중...');
      try {
        const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
        const videoKey = uploadedUrl.replace(`${r2PublicUrl}/`, '');
        const thumbnailUrl = await uploadThumbnailFromVideo(file, videoKey);
        setFormData(prev => ({ ...prev, thumbnail_url: thumbnailUrl }));
      } catch (thumbErr) {
        console.warn('썸네일 생성 실패:', thumbErr);
      }

      setUploadMessage('업로드 완료!');
      setTimeout(() => setUploadMessage(''), 3000);
    } catch (error) {
      showToast('업로드 실패: ' + (error as Error).message, 'error');
      setUploadMessage('');
      setFormData(prev => ({ ...prev, url: '', thumbnail_url: '' }));
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
          if (originalVideo.thumbnail_url) {
            deleteFileFromR2(originalVideo.thumbnail_url).catch(err => console.error('Thumb cleanup failed:', err));
          }
        }
        await updateVideo(editingId, {
          title: formData.title,
          url: formData.url,
          date: formData.date,
          icon: isWeverseUrl ? formData.icon : undefined,
          icon_text: isWeverseUrl && formData.icon === '🖤' ? formData.icon_text : undefined,
          thumbnail_url: formData.thumbnail_url || undefined,
          channel_name: formData.channel_name || undefined,
        });
        showToast('수정되었어요!', 'success');
      } else {
        // 중복 체크: 같은 제목 + 같은 날짜
        const duplicate = videos.find(v => v.title === formData.title && v.date === formData.date);
        if (duplicate) {
          showToast('이미 등록된 영상입니다.', 'error');
          return;
        }
        await createVideo({
          title: formData.title,
          url: formData.url,
          date: formData.date,
          ...(isWeverseUrl && { icon: formData.icon }),
          ...(isWeverseUrl && formData.icon === '🖤' && formData.icon_text && { icon_text: formData.icon_text }),
          ...(formData.thumbnail_url && { thumbnail_url: formData.thumbnail_url }),
          ...(formData.channel_name && { channel_name: formData.channel_name }),
        });
        showToast('추가되었어요!', 'success');
      }
      invalidateCache('videos');
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Error saving video:', error);
      showToast('저장 중 오류가 발생했어요.', 'error');
    }
  };

  const handleEdit = (video: Video) => {
    setEditingId(video.id);
    setFormData({
      title: video.title,
      url: video.url,
      date: video.date,
      icon: video.icon || '',
      icon_text: video.icon_text || '',
      thumbnail_url: video.thumbnail_url || '',
      channel_name: video.channel_name || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({ title: '', url: '', date: '', icon: '', icon_text: '', thumbnail_url: '', channel_name: '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ title: '', url: '', date: '', icon: '', icon_text: '', thumbnail_url: '', channel_name: '' });
    setUploadMessage('');
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({ message: '정말 삭제하시겠어요?', type: 'danger' });
    if (!confirmed) return;
    try {
      const video = videos.find(v => v.id === id);
      if (video?.url) await deleteFileFromR2(video.url);
      if (video?.thumbnail_url) deleteFileFromR2(video.thumbnail_url).catch(err => console.error('Thumb delete failed:', err));
      await deleteVideo(id);
      invalidateCache('videos');
      showToast('삭제되었어요!', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting video:', error);
      showToast('삭제 중 오류가 발생했어요.', 'error');
    }
  };

  if (loading) {
    return <div className="admin-page"><div className="loading">로딩 중...</div></div>;
  }

  return (
    <>
      <Toast toasts={toasts} onRemove={removeToast} />
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <div className="admin-page">
        <div className="admin-header-actions">
          <h1>영상 관리 ({videos.length}개)</h1>
        <button className="admin-add-btn-header" onClick={handleOpenAddModal}>+ 추가</button>
      </div>

      <div className="admin-search-box">
        <input
          type="text"
          className="admin-search-input"
          placeholder="제목 또는 날짜로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="admin-accordion-list">
        {groupedVideos.map(([date, dateVideos]) => (
          <div key={date} className="admin-accordion-item">
            <button
              className={`admin-accordion-header ${expandedDate === date ? 'open' : ''}`}
              onClick={() => toggleDate(date)}
            >
              <span className="accordion-date">{date}</span>
              <span className="accordion-count">{dateVideos.length}개</span>
              <span className={`expand-arrow ${expandedDate === date ? 'open' : ''}`}>&#9660;</span>
            </button>

            {expandedDate === date && (
              <div className="admin-accordion-content">
                {dateVideos.map((video) => (
                  <div key={video.id} className="admin-video-row">
                    <span className="video-platform">
                      <PlatformIcon platform={detectVideoPlatform(video.url)} size={16} />
                    </span>
                    <span className="video-title-text">{video.title}</span>
                    <div className="admin-row-actions">
                      <button className="admin-btn-sm edit" onClick={() => handleEdit(video)}>수정</button>
                      <button className="admin-btn-sm delete" onClick={() => handleDelete(video.id)}>삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <AdminModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingId ? '영상 수정' : '영상 추가'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>영상 URL 또는 파일 *</label>
            <div className="url-input-group">
              <input
                type="text"
                value={formData.url}
                onChange={(e) => {
                  const newUrl = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    url: newUrl,
                    icon: newUrl.includes('weverse.io') && !prev.icon ? '🤍' : prev.icon
                  }));
                }}
                placeholder="YouTube, Weverse URL 또는 파일 업로드"
                required
                disabled={uploading}
              />
              <input
                key={fileInputKey}
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <button type="button" className="upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? `${uploadProgress}%` : '📁'}
              </button>
              {isYouTubeUrl && (
                <button type="button" className="fetch-btn" onClick={handleFetchYouTube} disabled={fetching}>
                  {fetching ? '...' : '정보'}
                </button>
              )}
            </div>
            {uploadMessage && <p className="upload-status">{uploadMessage}</p>}
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

          {isWeverseUrl && formData.icon === '🖤' && (
            <div className="form-group">
              <label htmlFor="video-icon-text">멤버 표시</label>
              <input
                id="video-icon-text"
                type="text"
                value={formData.icon_text}
                onChange={(e) => setFormData(prev => ({ ...prev, icon_text: e.target.value }))}
                placeholder="예: 둘만+모카"
              />
            </div>
          )}

          <div className="form-buttons">
            <button type="submit" className="admin-submit-btn">{editingId ? '수정하기' : '추가하기'}</button>
            <button type="button" className="admin-clear-btn" onClick={handleCloseModal}>취소</button>
          </div>
        </form>
      </AdminModal>

      <button className="admin-add-btn-fixed" onClick={handleOpenAddModal}>+ 영상 추가</button>
      </div>
    </>
  );
}