import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createMoment, updateMoment, deleteMoment, updateMomentPositions } from '../../lib/database';
import type { Moment, Video } from '../../lib/database';
import { uploadVideoToR2, uploadThumbnailFromVideo, generateThumbnailFromUrl, deleteFileFromR2, isVideoFile } from '../../lib/r2Upload';
import AdminModal from '../../components/AdminModal';
import VideoEmbed from '../../components/VideoEmbed';
import { useData } from '../../hooks/useData';

export default function AdminMoments() {
  const { moments: cachedMoments, videos: cachedVideos, fetchMoments, fetchVideos, invalidateCache } = useData();
  const [loading, setLoading] = useState(!cachedMoments || !cachedVideos);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortingDate, setSortingDate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    tweet_url: '',
    date: '',
    video_id: '',
    position: 0,
    thumbnail_url: '',
  });
  const [thumbGenerating, setThumbGenerating] = useState(false);
  const [thumbProgress, setThumbProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  // 이전 선택 영상 기억
  const lastVideoIdRef = useRef<string>('');

  // Searchable select 상태
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [isVideoDropdownOpen, setIsVideoDropdownOpen] = useState(false);
  const videoDropdownRef = useRef<HTMLDivElement>(null);

  const [moments, setMoments] = useState<Moment[]>(cachedMoments || []);
  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);

  const loadData = useCallback(async () => {
    try {
      const [momentsData, videosData] = await Promise.all([
        fetchMoments(),
        fetchVideos()
      ]);
      setMoments(momentsData);
      setVideos(videosData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchMoments, fetchVideos]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update local state when cache updates
  useEffect(() => {
    if (cachedMoments) setMoments(cachedMoments);
  }, [cachedMoments]);

  useEffect(() => {
    if (cachedVideos) setVideos(cachedVideos);
  }, [cachedVideos]);

  // 검색어로 필터링된 비디오 목록
  const filteredVideos = useMemo(() => {
    if (!videoSearchQuery.trim()) return videos;
    const query = videoSearchQuery.toLowerCase();
    return videos.filter(v =>
      v.title.toLowerCase().includes(query) ||
      v.date.includes(query)
    );
  }, [videos, videoSearchQuery]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (videoDropdownRef.current && !videoDropdownRef.current.contains(e.target as Node)) {
        setIsVideoDropdownOpen(false);
      }
    };
    if (isVideoDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVideoDropdownOpen]);

  // 타임라인 그룹화 로직
  const groupedMoments = useMemo(() => {
    const groups: Record<string, Moment[]> = {};

    const sortedMoments = [...moments].sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return (a.position || 0) - (b.position || 0);
    });

    sortedMoments.forEach((item) => {
      if (!groups[item.date]) {
        groups[item.date] = [];
      }
      groups[item.date].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [moments]);

  // 같은 날짜 그룹 내에서 아이템 이동
  const handleMove = async (momentId: string, direction: 'up' | 'down') => {
    // 같은 날짜의 모먼트들만 추출 (position 순서 유지)
    const targetMoment = moments.find(m => m.id === momentId);
    if (!targetMoment) return;

    const sameDateMoments = [...moments]
      .filter(m => m.date === targetMoment.date)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const currentIdx = sameDateMoments.findIndex(m => m.id === momentId);
    const swapIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;

    if (swapIdx < 0 || swapIdx >= sameDateMoments.length) return;

    // 배열에서 위치 스왑
    const reordered = [...sameDateMoments];
    [reordered[currentIdx], reordered[swapIdx]] = [reordered[swapIdx], reordered[currentIdx]];

    // 인덱스 기반으로 새 position 할당
    const updates = reordered.map((m, idx) => ({
      id: m.id,
      position: idx,
    }));

    // 로컬 상태 즉시 반영
    setMoments(prev => prev.map(m => {
      const update = updates.find(u => u.id === m.id);
      return update ? { ...m, position: update.position } : m;
    }));

    try {
      await updateMomentPositions(updates);
      invalidateCache('moments');
    } catch (error) {
      console.error('[AdminMoments] Failed to update positions:', error);
      alert('순서 저장에 실패했습니다.');
      loadData();
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
      setFormData(prev => ({ ...prev, tweet_url: '업로드 중...' }));
      const uploadedUrl = await uploadVideoToR2(file, (percent) => {
        setUploadProgress(percent);
        setUploadMessage(`업로드 중... (${percent}%)`);
      });

      if (!uploadedUrl) throw new Error('업로드된 URL이 비어있습니다.');
      setFormData(prev => ({ ...prev, tweet_url: uploadedUrl }));

      // 썸네일 추출 및 업로드
      setUploadMessage('썸네일 생성 중...');
      try {
        const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
        const videoKey = uploadedUrl.replace(`${r2PublicUrl}/`, '');
        const thumbnailUrl = await uploadThumbnailFromVideo(file, videoKey);
        setFormData(prev => ({ ...prev, thumbnail_url: thumbnailUrl }));
      } catch (thumbErr) {
        console.warn('썸네일 생성 실패 (영상은 정상 업로드됨):', thumbErr);
      }

      setUploadMessage('업로드 완료! ✅');
      setTimeout(() => setUploadMessage(''), 3000);
    } catch (error) {
      alert('업로드 실패: ' + (error as Error).message);
      setUploadMessage('');
      setFormData(prev => ({ ...prev, tweet_url: '', thumbnail_url: '' }));
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
        const originalMoment = moments.find(m => m.id === editingId);
        if (originalMoment && originalMoment.tweet_url !== formData.tweet_url) {
          deleteFileFromR2(originalMoment.tweet_url).catch(err => console.error('Cleanup failed:', err));
          if (originalMoment.thumbnail_url) {
            deleteFileFromR2(originalMoment.thumbnail_url).catch(err => console.error('Thumb cleanup failed:', err));
          }
        }

        await updateMoment(editingId, {
          title: formData.title,
          tweet_url: formData.tweet_url,
          date: formData.date,
          video_id: formData.video_id || undefined,
          position: Number(formData.position) || 0,
          thumbnail_url: formData.thumbnail_url || undefined,
        });
        alert('수정되었어요!');
      } else {
        await createMoment({
          title: formData.title,
          tweet_url: formData.tweet_url,
          date: formData.date,
          video_id: formData.video_id || undefined,
          position: Number(formData.position) || 0,
          ...(formData.thumbnail_url && { thumbnail_url: formData.thumbnail_url }),
        });
        alert('모먼트가 추가되었어요!');
      }
      
      invalidateCache('moments');
      handleCloseModal();
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
      position: moment.position || 0,
      thumbnail_url: moment.thumbnail_url || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    const lastVideo = lastVideoIdRef.current ? videos.find(v => v.id === lastVideoIdRef.current) : null;
    setFormData({
      title: '',
      tweet_url: '',
      date: lastVideo ? lastVideo.date : '',
      video_id: lastVideoIdRef.current || '',
      position: 0,
      thumbnail_url: ''
    });
    setVideoSearchQuery('');
    setIsVideoDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ title: '', tweet_url: '', date: '', video_id: '', position: 0, thumbnail_url: '' });
    setUploadMessage('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      const moment = moments.find(m => m.id === id);
      if (moment?.tweet_url) {
        await deleteFileFromR2(moment.tweet_url);
      }
      if (moment?.thumbnail_url) {
        deleteFileFromR2(moment.thumbnail_url).catch(err => console.error('Thumb delete failed:', err));
      }

      await deleteMoment(id);
      invalidateCache('moments');
      alert('삭제되었어요!');
      loadData();
    } catch (error) {
      console.error('Error deleting moment:', error);
      alert('삭제 중 오류가 발생했어요.');
    }
  };

  const handleGenerateThumbnail = async (moment: Moment) => {
    const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;

    // R2 영상 URL인지 확인
    if (!moment.tweet_url || !moment.tweet_url.startsWith(r2PublicUrl)) {
      return;
    }

    try {
      setThumbGenerating(true);

      const thumbnailUrl = await generateThumbnailFromUrl(moment.tweet_url);

      await updateMoment(moment.id, {
        ...moment,
        thumbnail_url: thumbnailUrl,
      });

      invalidateCache('moments');
      loadData();
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    } finally {
      setThumbGenerating(false);
    }
  };

  const handleVideoSelect = (videoId: string) => {
    const selectedVideo = videos.find(v => v.id === videoId);
    if (videoId) {
      lastVideoIdRef.current = videoId;
    }
    setFormData(prev => ({
      ...prev,
      video_id: videoId,
      date: selectedVideo ? selectedVideo.date : prev.date,
    }));
    setVideoSearchQuery('');
    setIsVideoDropdownOpen(false);
  };

  // R2 영상(moments) 중 썸네일 없는 항목들에 대해 일괄 생성
  const handleGenerateThumbnails = async () => {
    const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
    const isR2Url = (url: string) =>
      (r2PublicUrl && url.startsWith(r2PublicUrl)) || url.includes('.r2.dev');

    const targets = moments.filter(m =>
      !m.thumbnail_url && isR2Url(m.tweet_url)
    );

    if (targets.length === 0) {
      alert('썸네일이 필요한 R2 영상이 없어요.');
      return;
    }

    if (!confirm(`${targets.length}개 모먼트의 썸네일을 생성할까요?`)) return;

    setThumbGenerating(true);
    let success = 0;

    for (let i = 0; i < targets.length; i++) {
      const moment = targets[i];
      setThumbProgress(`${i + 1}/${targets.length}: ${moment.title}`);
      try {
        const thumbnailUrl = await generateThumbnailFromUrl(moment.tweet_url);
        await updateMoment(moment.id, { thumbnail_url: thumbnailUrl });
        success++;
      } catch (err) {
        console.error(`썸네일 생성 실패 (${moment.title}):`, err);
      }
    }

    setThumbGenerating(false);
    setThumbProgress('');
    invalidateCache('moments');
    alert(`완료! ${success}/${targets.length}개 썸네일 생성됨`);
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
        <h1>모먼트 관리</h1>
        <div className="admin-header-btns">
          <button
            className="admin-header-btn"
            onClick={handleGenerateThumbnails}
            disabled={thumbGenerating}
          >
            {thumbGenerating ? '생성 중...' : '썸네일 일괄'}
          </button>
          <button className="admin-add-btn-header" onClick={handleOpenAddModal}>+ 추가</button>
        </div>
      </div>
      {thumbProgress && (
        <div style={{ padding: '8px 16px', fontSize: '13px', color: '#666' }}>
          {thumbProgress}
        </div>
      )}

      <div className="moments-timeline">
        {groupedMoments.map(([date, dateMoments]) => (
          <div key={date} className="moment-date-group">
            <div className="moment-date-header expanded">
              <span className="date-marker">✨</span>
              <time>{date}</time>
              <button
                className={`sort-date-btn ${sortingDate === date ? 'active' : ''}`}
                onClick={() => setSortingDate(sortingDate === date ? null : date)}
              >
                {sortingDate === date ? '완료' : '순서'}
              </button>
            </div>

            <div className="moment-list">
              {dateMoments.map((moment, idx) => (
                <div key={moment.id} className="admin-item-wrapper admin-moment-card">
                  <div className="admin-item-content">
                    <div className="moment-item">
                      <div className="admin-moment-title">{moment.title}</div>
                      <VideoEmbed url={moment.tweet_url} title={moment.title} thumbnailUrl={moment.thumbnail_url} />
                    </div>
                    {sortingDate !== date && (
                      <div className="admin-moment-actions">
                        <button className="admin-control-btn edit" onClick={() => handleEdit(moment)}>수정</button>
                        {moment.tweet_url?.startsWith(import.meta.env.VITE_R2_PUBLIC_URL) && (
                          <button
                            className="admin-control-btn"
                            onClick={() => handleGenerateThumbnail(moment)}
                            disabled={thumbGenerating}
                          >
                            {thumbGenerating ? '생성중...' : '썸네일'}
                          </button>
                        )}
                        <button className="admin-control-btn delete" onClick={() => handleDelete(moment.id)}>삭제</button>
                      </div>
                    )}
                  </div>
                  {sortingDate === date && (
                    <div className="sort-buttons">
                      <button
                        className="sort-arrow-btn"
                        onClick={() => handleMove(moment.id, 'up')}
                        disabled={idx === 0}
                      >▲</button>
                      <button
                        className="sort-arrow-btn"
                        onClick={() => handleMove(moment.id, 'down')}
                        disabled={idx === dateMoments.length - 1}
                      >▼</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AdminModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        title={editingId ? '모먼트 수정' : '새 모먼트 추가'}
      >
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="moment-file">📤 영상 파일 직접 업로드</label>
            <div className="upload-container" style={{ position: 'relative' }}>
              <input
                key={fileInputKey}
                ref={fileInputRef}
                id="moment-file"
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
            <label htmlFor="moment-title">제목 *</label>
            <input
              id="moment-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="어떤 순간인지 설명"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="moment-url">영상 URL *</label>
            <input
              id="moment-url"
              type="text"
              value={formData.tweet_url}
              onChange={(e) => setFormData(prev => ({ ...prev, tweet_url: e.target.value }))}
              placeholder="트윗 URL 또는 R2 업로드 URL"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="moment-video">연결할 영상</label>
            <div className="searchable-select" ref={videoDropdownRef}>
              <input
                type="text"
                placeholder={formData.video_id
                  ? `[${videos.find(v => v.id === formData.video_id)?.date}] ${videos.find(v => v.id === formData.video_id)?.title}`
                  : '영상 검색 (날짜/제목)'}
                value={videoSearchQuery}
                onChange={(e) => {
                  setVideoSearchQuery(e.target.value);
                  setIsVideoDropdownOpen(true);
                }}
                onFocus={() => setIsVideoDropdownOpen(true)}
                className="searchable-select-input"
              />
              {formData.video_id && (
                <button
                  type="button"
                  className="searchable-select-clear"
                  onClick={() => handleVideoSelect('')}
                >
                  ✕
                </button>
              )}
              {isVideoDropdownOpen && (
                <div className="searchable-select-dropdown">
                  <div
                    className={`searchable-select-option ${!formData.video_id ? 'selected' : ''}`}
                    onClick={() => handleVideoSelect('')}
                  >
                    선택 안함
                  </div>
                  {filteredVideos.map((video) => (
                    <div
                      key={video.id}
                      className={`searchable-select-option ${formData.video_id === video.id ? 'selected' : ''}`}
                      onClick={() => handleVideoSelect(video.id)}
                    >
                      [{video.date}] {video.title}
                    </div>
                  ))}
                  {filteredVideos.length === 0 && (
                    <div className="searchable-select-empty">검색 결과 없음</div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="moment-date">날짜 *</label>
            <input
              id="moment-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="form-buttons">
            <button type="submit" className="admin-submit-btn">
              {editingId ? '수정하기' : '추가하기'}
            </button>
            <button type="button" className="admin-clear-btn" onClick={handleCloseModal}>취소</button>
          </div>
        </form>
      </AdminModal>

      <button className="admin-add-btn-fixed" onClick={handleOpenAddModal}>+ 모먼트 추가</button>
    </div>
  );
}
