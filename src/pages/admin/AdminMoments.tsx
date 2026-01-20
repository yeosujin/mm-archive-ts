import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createMoment, updateMoment, deleteMoment, updateMomentPositions } from '../../lib/database';
import type { Moment, Video } from '../../lib/database';
import { uploadVideoToR2, deleteFileFromR2, isVideoFile } from '../../lib/r2Upload';
import AdminModal from '../../components/AdminModal';
import VideoEmbed from '../../components/VideoEmbed';
import { useData } from '../../context/DataContext';

// DnD Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
function SortableMomentItem({ 
  moment, 
  handleEdit, 
  handleDelete, 
  isSortMode
}: { 
  moment: Moment; 
  handleEdit: (m: Moment) => void; 
  handleDelete: (id: string) => void;
  isSortMode: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: moment.id, disabled: !isSortMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`admin-item-wrapper ${isDragging ? 'dragging' : ''}`}
    >
      {isSortMode && (
        <div className="drag-handle" {...attributes} {...listeners}>
          ⠿
        </div>
      )}
      <div className="admin-item-content">
        <div className="moment-item">
          <VideoEmbed url={moment.tweet_url} title={moment.title} />
          {isSortMode && <div className="moment-title" style={{ marginTop: '0.5rem' }}>{moment.title}</div>}
        </div>
      </div>
      {!isSortMode && (
        <div className="admin-item-controls">
          <button className="admin-control-btn edit" onClick={() => handleEdit(moment)}>수정</button>
          <button className="admin-control-btn delete" onClick={() => handleDelete(moment.id)}>삭제</button>
        </div>
      )}
    </div>
  );
}

export default function AdminMoments() {
  const { moments: cachedMoments, videos: cachedVideos, fetchMoments, fetchVideos, invalidateCache } = useData();
  const [loading, setLoading] = useState(!cachedMoments || !cachedVideos);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    tweet_url: '',
    date: '',
    video_id: '',
    position: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  // Use local state for moments to support DnD smoothly, 
  // but initialize from cache and update cache when data changes.
  const [moments, setMoments] = useState<Moment[]>(cachedMoments || []);
  const [videos, setVideos] = useState<Video[]>(cachedVideos || []);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // 타임라인 그룹화 로직 (Moments.tsx와 유사)
  const groupedMoments = useMemo(() => {
    const groups: Record<string, Moment[][]> = {};
    
    // Sort logic: In Sort Mode, we respect the array order strictly.
    // Otherwise, we follow Date DESC, Position ASC.
    const sortedMoments = isSortMode 
      ? [...moments]
      : [...moments].sort((a, b) => {
          const dateDiff = b.date.localeCompare(a.date);
          if (dateDiff !== 0) return dateDiff;
          return (a.position || 0) - (b.position || 0);
        });

    sortedMoments.forEach((item) => {
      // If the array order says one item is between two others of the same date, 
      // we must ensure they stay grouped if we want to maintain the "Thread" layout.
      // But for simple reordering, we just group by date.
      if (!groups[item.date]) {
        groups[item.date] = [];
      }
      
      const dayGroups = groups[item.date];
      const lastGroup = dayGroups[dayGroups.length - 1];
      
      if (item.video_id && lastGroup && lastGroup[0].video_id === item.video_id) {
        lastGroup.push(item);
      } else {
        dayGroups.push([item]);
      }
    });
    
    // In Sort Mode, we might want to preserve the chronological date order regardless of array order?
    // No, usually array order IS the truth. But grouping by date naturally splits them.
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [moments, isSortMode]);

  // DnD Handle Drag End
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = moments.findIndex((m) => m.id === active.id);
      const newIndex = moments.findIndex((m) => m.id === over.id);

      const reordered = arrayMove(moments, oldIndex, newIndex);
      
      // Update local state WITH new positions so useMemo doesn't sort them back
      // if we were not in Sort Mode. But since we use array order in Sort Mode now,
      // updating positions is mainly for persistence.
      const newMoments = reordered.map((m, idx) => ({
        ...m,
        position: idx
      }));
      
      setMoments(newMoments);

      const updates = newMoments.map((m) => ({
        id: m.id,
        position: m.position
      }));

      try {
        await updateMomentPositions(updates);
        invalidateCache('moments');
      } catch (error) {
        console.error('[AdminMoments] Failed to update positions:', error);
        const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
        alert(`순서 저장에 실패했습니다: ${errorMsg}`);
        loadData();
      }
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
      setUploadMessage('업로드 완료! ✅');
      setTimeout(() => setUploadMessage(''), 3000);
    } catch (error) {
      alert('업로드 실패: ' + (error as Error).message);
      setUploadMessage('');
      setFormData(prev => ({ ...prev, tweet_url: '' }));
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
        }

        await updateMoment(editingId, {
          title: formData.title,
          tweet_url: formData.tweet_url,
          date: formData.date,
          video_id: formData.video_id || undefined,
          position: Number(formData.position) || 0,
        });
        alert('수정되었어요!');
      } else {
        await createMoment({
          title: formData.title,
          tweet_url: formData.tweet_url,
          date: formData.date,
          video_id: formData.video_id || undefined,
          position: Number(formData.position) || 0,
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
    });
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({ title: '', tweet_url: '', date: '', video_id: '', position: 0 });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ title: '', tweet_url: '', date: '', video_id: '', position: 0 });
    setUploadMessage('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      const moment = moments.find(m => m.id === id);
      if (moment?.tweet_url) {
        await deleteFileFromR2(moment.tweet_url);
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

  const handleVideoSelect = (videoId: string) => {
    const selectedVideo = videos.find(v => v.id === videoId);
    setFormData(prev => ({
      ...prev,
      video_id: videoId,
      date: selectedVideo ? selectedVideo.date : prev.date,
    }));
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
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className={`sort-mode-toggle ${isSortMode ? 'active' : ''}`}
            onClick={() => setIsSortMode(!isSortMode)}
          >
            {isSortMode ? '정렬 완료' : '순서 편집'}
          </button>
          <button className="admin-add-btn-header" onClick={handleOpenAddModal}>+ 추가</button>
        </div>
      </div>

      <div className="moments-timeline">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={moments.map(m => m.id)}
            strategy={verticalListSortingStrategy}
            disabled={!isSortMode}
          >
            {groupedMoments.map(([date, dateGroups]) => (
              <div key={date} className="moment-date-group">
                <div className="moment-date-header expanded" style={{ cursor: 'default' }}>
                  <span className="date-marker">✨</span>
                  <time>{date}</time>
                </div>
                
                <div className="moment-list">
                  {dateGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="moment-group">
                      {groupIdx > 0 && <hr className="moment-group-divider" />}
                      <div className="group-items">
                        {group.map((moment) => (
                          <SortableMomentItem 
                            key={moment.id} 
                            moment={moment} 
                            handleEdit={handleEdit}
                            handleDelete={handleDelete}
                            isSortMode={isSortMode}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </SortableContext>
        </DndContext>
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
