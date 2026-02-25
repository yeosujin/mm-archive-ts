import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { createAsk } from '../lib/database';
import { uploadAskImage } from '../lib/askStorage';

export default function Ask() {
  const { asks, fetchAsks } = useData();
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(!asks);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      await fetchAsks();
    } catch (error) {
      console.error('Error loading asks:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAsks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      let image_url: string | undefined;
      if (imageFile) {
        console.log('Uploading image...', imageFile.name, imageFile.type, imageFile.size);
        try {
          image_url = await uploadAskImage(imageFile);
          console.log('Upload success:', image_url);
        } catch (error_) {
          console.error('Image upload failed:', error_);
          showToast('이미지 업로드에 실패했어요.', 'error');
          setSubmitting(false);
          return;
        }
      }
      await createAsk({ content: content.trim(), image_url });
      setContent('');
      handleRemoveImage();
      showToast('질문이 전달되었어요!', 'success');
    } catch (error) {
      console.error('Error creating ask:', error);
      showToast('전송 중 오류가 발생했어요.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Toast toasts={toasts} onRemove={removeToast} />
    <div className="page ask-page">
      <section className="ask-form-section">
        <h1 className="ask-title">Ask</h1>
        <p className="ask-subtitle">궁금한 점을 물어보세요</p>

        <form onSubmit={handleSubmit} className="ask-form">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="질문을 입력하세요..."
            maxLength={500}
            rows={4}
            required
            className="ask-textarea"
          />
          <div className="ask-form-footer">
            <div className="ask-image-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="file-input-hidden"
                id="ask-image-input"
              />
              <label htmlFor="ask-image-input" className="ask-image-btn">
                이미지 첨부
              </label>
              {imagePreview && (
                <div className="ask-image-preview">
                  <img src={imagePreview} alt="첨부 이미지" />
                  <button type="button" onClick={handleRemoveImage} className="ask-image-remove">&times;</button>
                </div>
              )}
            </div>
            <span className="ask-char-count">{content.length}/500</span>
          </div>
          <button type="submit" className="ask-submit-btn" disabled={submitting || !content.trim()}>
            {submitting ? '보내는 중...' : '질문 보내기'}
          </button>
        </form>
      </section>

      <section className="ask-feed-section">
        <h2 className="ask-feed-title">Q&A</h2>
        {asks && asks.length > 0 && (
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Q&A 검색..."
            className="ask-search-input"
          />
        )}
        {(() => {
          const q = searchQuery.toLowerCase();
          const filtered = asks?.filter(a =>
            !q || a.content.toLowerCase().includes(q) || a.answer?.toLowerCase().includes(q)
          );
          if (loading) return <div className="loading">로딩 중...</div>;
          if (!filtered || filtered.length === 0) {
            return (
              <div className="empty-state">
                <p>{searchQuery ? '검색 결과가 없어요' : '아직 답변된 질문이 없어요'}</p>
              </div>
            );
          }
          return (
            <div className="ask-feed">
              {filtered.map((ask) => (
                <Link key={ask.id} to={`/ask/${ask.id}`} className="ask-card">
                  <div className="ask-card-question">
                    <span className="ask-card-q">Q.</span>
                    <p>{ask.content}</p>
                  </div>
                  <div className="ask-card-answer">
                    <span className="ask-card-a">A.</span>
                    <p>{ask.answer}</p>
                  </div>
                </Link>
              ))}
            </div>
          );
        })()}
      </section>
    </div>
    </>
  );
}
