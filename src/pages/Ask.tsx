import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { PhotoIcon, SearchIcon } from '../components/Icons';
import { createAsk } from '../lib/database';
import { uploadAskImages } from '../lib/askStorage';
import { formatDotDate } from '../lib/videoCatalog';
import AskBubbles from '../components/AskBubbles';

const MAX_IMAGES = 3;
const MAX_LENGTH = 500;
const PAGE_SIZE = 10;

export default function Ask() {
  const { asks, fetchAsks } = useData();
  const { toasts, showToast, removeToast } = useToast();
  const [loading, setLoading] = useState(!asks);
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
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
    const files = e.target.files;
    if (!files) return;
    const remaining = MAX_IMAGES - imageFiles.length;
    const newFiles = Array.from(files).slice(0, remaining);
    if (newFiles.length === 0) return;
    setImageFiles(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAllImages = () => {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setImageFiles([]);
    setImagePreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      let image_url: string | undefined;
      if (imageFiles.length > 0) {
        try {
          const urls = await uploadAskImages(imageFiles);
          image_url = JSON.stringify(urls);
        } catch (error_) {
          console.error('Image upload failed:', error_);
          showToast('이미지 업로드에 실패했어요.', 'error');
          setSubmitting(false);
          return;
        }
      }
      await createAsk({ content: content.trim(), image_url });
      setContent('');
      handleRemoveAllImages();
      showToast('질문이 전달되었어요!', 'success');
    } catch (error) {
      console.error('Error creating ask:', error);
      showToast('전송 중 오류가 발생했어요.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const filtered = asks?.filter(a =>
    !q || a.content.toLowerCase().includes(q) || a.answer?.toLowerCase().includes(q)
  ) ?? [];
  const visible = filtered.slice(0, displayCount);

  let list: React.ReactNode;
  if (loading) {
    list = <div className="loading">불러오는 중</div>;
  } else if (filtered.length === 0) {
    list = <p className="mc-empty">{q ? '찾는 질문이 없어요' : '아직 답변된 질문이 없어요'}</p>;
  } else {
    list = (
      <div className="ask-list">
        {visible.map(ask => (
          <Link key={ask.id} to={`/ask/${ask.id}`} className="ask-card">
            <AskBubbles ask={ask} />
            <time className="ask-date">{formatDotDate(ask.answered_at ?? ask.created_at)}</time>
          </Link>
        ))}
        {filtered.length > displayCount && (
          <button type="button" className="ask-more-btn" onClick={() => setDisplayCount(n => n + PAGE_SIZE)}>
            더보기
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} onRemove={removeToast} />
      <div className="ask">
        <section className="ask-compose">
          <h1 className="ask-title">궁금한 점·요청</h1>
          <p className="ask-intro">
            궁금한 점이나 바라는 점을 남겨 주세요. <b>이름 없이</b> 전달되고, 답변이 달리면 아래 목록에 함께 올라와요.
          </p>
          <form onSubmit={handleSubmit} className="ask-box">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="예: 이 장면이 나온 영상이 뭔가요?"
              maxLength={MAX_LENGTH}
              rows={3}
              required
              aria-label="질문"
              className="ask-input"
            />
            {imagePreviews.length > 0 && (
              <div className="ask-previews">
                {imagePreviews.map((preview, i) => (
                  <div key={preview} className="ask-preview">
                    <img src={preview} alt={`첨부 사진 ${i + 1}`} />
                    <button type="button" onClick={() => handleRemoveImage(i)} className="ask-preview-remove" aria-label={`사진 ${i + 1} 빼기`}>&times;</button>
                  </div>
                ))}
              </div>
            )}
            <div className="ask-box-bar">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="file-input-hidden"
                id="ask-image-input"
                disabled={imageFiles.length >= MAX_IMAGES}
              />
              <label
                htmlFor="ask-image-input"
                className={`ask-photo-btn${imageFiles.length >= MAX_IMAGES ? ' is-full' : ''}`}
                aria-label="사진 첨부"
              >
                <PhotoIcon size={18} />
              </label>
              <span className="ask-hint">{imageFiles.length ? `사진 ${imageFiles.length}/${MAX_IMAGES}` : `사진 ${MAX_IMAGES}장까지`}</span>
              <span className="ask-count">{content.length}/{MAX_LENGTH}</span>
              <button type="submit" className="ask-send-btn" disabled={submitting || !content.trim()}>
                {submitting ? '보내는 중' : '보내기'}
              </button>
            </div>
          </form>
        </section>

        <section className="ask-feed">
          <h2 className="mc-month-title">
            답변 모음 {asks && <small>{asks.length}개</small>}
          </h2>
          {asks && asks.length > 0 && (
            <div className="mc-search ask-search">
              <SearchIcon size={15} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setDisplayCount(PAGE_SIZE);
                }}
                placeholder="질문·답변에서 찾기"
                aria-label="질문·답변에서 찾기"
                className="mc-search-input"
              />
            </div>
          )}
          {list}
        </section>
      </div>
    </>
  );
}
