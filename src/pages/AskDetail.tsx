import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAsk } from '../lib/database';
import type { Ask } from '../lib/database';
import { formatDotDate } from '../lib/videoCatalog';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import AskBubbles from '../components/AskBubbles';
import { ShareIcon } from '../components/Icons';

export default function AskDetail() {
  const { id } = useParams<{ id: string }>();
  const [ask, setAsk] = useState<Ask | null>(null);
  const [loading, setLoading] = useState(true);
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    if (!id) return;
    getAsk(id)
      .then(data => setAsk(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // 공유: 휴대폰은 공유 시트, 안 되면 링크 복사
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // 공유 시트를 닫음
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('링크를 복사했어요', 'success');
    } catch {
      showToast('링크를 복사하지 못했어요', 'error');
    }
  };

  if (loading) {
    return <div className="loading">불러오는 중</div>;
  }

  if (!ask) {
    return (
      <div className="ask">
        <p className="mc-empty">질문을 찾을 수 없어요</p>
        <Link to="/ask" className="ask-more-btn">다른 답변 보기</Link>
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} onRemove={removeToast} />
      <div className="ask ask-detail">
        <div className="ask-card ask-card-detail">
          <AskBubbles ask={ask} />
          <time className="ask-date">{formatDotDate(ask.answered_at ?? ask.created_at)}</time>
        </div>
        <div className="ask-detail-actions">
          <button type="button" className="ask-outline-btn" onClick={handleShare}>
            <ShareIcon size={16} /> 공유하기
          </button>
          <Link to="/ask" className="ask-send-btn ask-detail-ask">나도 질문하기</Link>
        </div>
        <Link to="/ask" className="ask-detail-more">다른 답변 보기 ›</Link>
      </div>
    </>
  );
}
