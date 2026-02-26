import { useState, useEffect, useCallback } from 'react';
import { getAsks, answerAsk, updateAsk, deleteAsk, getExpiredImageAsks, clearAskImageUrl } from '../../lib/database';
import { deleteAskImages, parseImageUrls } from '../../lib/askStorage';
import type { Ask } from '../../lib/database';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { useConfirm } from '../../hooks/useConfirm';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdminAsks() {
  const { invalidateCache } = useData();
  const { toasts, showToast, removeToast } = useToast();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const [asks, setAsks] = useState<Ask[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [viewingImages, setViewingImages] = useState<string[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const cleanupExpiredImages = useCallback(async () => {
    try {
      const expired = await getExpiredImageAsks();
      for (const ask of expired) {
        if (ask.image_url) {
          await deleteAskImages(ask.image_url).catch(console.error);
          await clearAskImageUrl(ask.id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired images:', error);
    }
  }, []);

  const loadAsks = useCallback(async () => {
    try {
      await cleanupExpiredImages();
      const data = await getAsks();
      setAsks(data);
    } catch (error) {
      console.error('Error loading asks:', error);
    } finally {
      setLoading(false);
    }
  }, [cleanupExpiredImages]);

  useEffect(() => {
    loadAsks();
  }, [loadAsks]);

  const pendingAsks = asks.filter(a => a.status === 'pending');
  const q = searchQuery.toLowerCase();
  const answeredAsks = asks.filter(a => a.status === 'answered' && (!q || a.content.toLowerCase().includes(q) || a.answer?.toLowerCase().includes(q)));

  const handleAnswer = async (id: string) => {
    if (!answerText.trim()) return;
    try {
      const answered = await answerAsk(id, answerText.trim());
      showToast('답변이 등록되었어요!', 'success');
      setAnsweringId(null);
      setAnswerText('');
      invalidateCache('asks');
      loadAsks();
      // X 공유 여부 확인
      const wantShare = await confirm({ message: 'X에 공유하시겠어요?', confirmText: '공유', cancelText: '나중에' });
      if (wantShare) {
        handleShareToX(answered);
      }
    } catch (error) {
      console.error('Error answering ask:', error);
      showToast('답변 등록 중 오류가 발생했어요.', 'error');
    }
  };

  const handleEditAnswer = async (id: string) => {
    if (!editText.trim()) return;
    try {
      await updateAsk(id, { answer: editText.trim() });
      showToast('답변이 수정되었어요!', 'success');
      setEditingId(null);
      setEditText('');
      invalidateCache('asks');
      loadAsks();
    } catch (error) {
      console.error('Error updating ask:', error);
      showToast('수정 중 오류가 발생했어요.', 'error');
    }
  };

  const handleDelete = async (ask: Ask) => {
    const confirmed = await confirm({ message: '정말 삭제하시겠어요?', type: 'danger' });
    if (!confirmed) return;
    try {
      if (ask.image_url) {
        await deleteAskImages(ask.image_url).catch(console.error);
      }
      await deleteAsk(ask.id);
      showToast('삭제되었어요!', 'success');
      invalidateCache('asks');
      loadAsks();
    } catch (error) {
      console.error('Error deleting ask:', error);
      showToast('삭제 중 오류가 발생했어요.', 'error');
    }
  };

  const handleShareToX = (ask: Ask) => {
    const siteUrl = window.location.origin;
    const askUrl = `${siteUrl}/ask/${ask.id}`;
    const maxLen = 60;
    const answer = ask.answer || '';
    const tweetText = answer.length > maxLen
      ? `${answer.slice(0, maxLen)}… 더보기\n\n`
      : `${answer}\n\n`;
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(askUrl)}`;
    window.open(intentUrl, '_blank', 'width=600,height=400');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">로딩 중...</div>
      </div>
    );
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
        <h1>질문 관리</h1>

        <div className="admin-section">
          <h2>대기 중 ({pendingAsks.length}개)</h2>
          {pendingAsks.length === 0 ? (
            <p className="empty-text">새 질문이 없어요</p>
          ) : (
            <div className="admin-list">
              {pendingAsks.map((ask) => (
                <div key={ask.id} className="admin-list-item ask-admin-item">
                  <div className="admin-list-info">
                    <p className="ask-admin-content">{ask.content}</p>
                    {ask.image_url && (
                      <button type="button" className="ask-image-view-btn" onClick={() => { setViewingImages(parseImageUrls(ask.image_url)); setViewingImageIndex(0); }}>
                        이미지 보기 ({parseImageUrls(ask.image_url).length})
                      </button>
                    )}
                    <span className="ask-admin-meta">{formatDate(ask.created_at)}</span>
                  </div>

                  {answeringId === ask.id ? (
                    <div className="ask-admin-answer-form">
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="답변을 입력하세요..."
                        rows={3}
                      />
                      <div className="admin-list-actions">
                        <button className="edit-btn" onClick={() => handleAnswer(ask.id)}>등록</button>
                        <button className="delete-btn" onClick={() => { setAnsweringId(null); setAnswerText(''); }}>취소</button>
                      </div>
                    </div>
                  ) : (
                    <div className="admin-list-actions">
                      <button className="edit-btn" onClick={() => { setAnsweringId(ask.id); setAnswerText(''); }}>답변하기</button>
                      <button className="delete-btn" onClick={() => handleDelete(ask)}>삭제</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-section">
          <h2>답변 완료 ({answeredAsks.length}개)</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="답변 검색..."
            className="ask-search-input"
          />
          {answeredAsks.length === 0 ? (
            <p className="empty-text">답변된 질문이 없어요</p>
          ) : (
            <div className="admin-list">
              {answeredAsks.map((ask) => (
                <div key={ask.id} className="admin-list-item ask-admin-item">
                  <div className="admin-list-info">
                    <p className="ask-admin-content"><strong>Q.</strong> {ask.content}</p>
                    {ask.image_url && (
                      <button type="button" className="ask-image-view-btn" onClick={() => { setViewingImages(parseImageUrls(ask.image_url)); setViewingImageIndex(0); }}>
                        이미지 보기 ({parseImageUrls(ask.image_url).length})
                      </button>
                    )}
                    {editingId === ask.id ? (
                      <div className="ask-admin-answer-form">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                        />
                        <div className="admin-list-actions">
                          <button className="edit-btn" onClick={() => handleEditAnswer(ask.id)}>저장</button>
                          <button className="delete-btn" onClick={() => { setEditingId(null); setEditText(''); }}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <p className="ask-admin-answer"><strong>A.</strong> {ask.answer}</p>
                    )}
                    <span className="ask-admin-meta">
                      {ask.answered_at && formatDate(ask.answered_at)}
                    </span>
                  </div>

                  {editingId !== ask.id && (
                    <div className="admin-list-actions">
                      <button className="share-x-btn" onClick={() => handleShareToX(ask)}>X 공유</button>
                      <button className="edit-btn" onClick={() => { setEditingId(ask.id); setEditText(ask.answer || ''); }}>수정</button>
                      <button className="delete-btn" onClick={() => handleDelete(ask)}>삭제</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {viewingImages.length > 0 && (
        <div className="image-viewer-overlay">
          <button type="button" className="image-viewer-backdrop" onClick={() => setViewingImages([])} aria-label="닫기" />
          <img src={viewingImages[viewingImageIndex]} alt={`첨부 이미지 ${viewingImageIndex + 1}`} className="image-viewer-img" />
          {viewingImages.length > 1 && (
            <div className="image-viewer-nav">
              <button type="button" disabled={viewingImageIndex === 0} onClick={() => setViewingImageIndex(i => i - 1)}>&lsaquo;</button>
              <span>{viewingImageIndex + 1} / {viewingImages.length}</span>
              <button type="button" disabled={viewingImageIndex === viewingImages.length - 1} onClick={() => setViewingImageIndex(i => i + 1)}>&rsaquo;</button>
            </div>
          )}
          <button type="button" className="image-viewer-close" onClick={() => setViewingImages([])}>&times;</button>
        </div>
      )}
    </>
  );
}
