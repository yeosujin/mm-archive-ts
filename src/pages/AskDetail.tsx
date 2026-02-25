import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAsk } from '../lib/database';
import type { Ask } from '../lib/database';

export default function AskDetail() {
  const { id } = useParams<{ id: string }>();
  const [ask, setAsk] = useState<Ask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getAsk(id)
      .then(data => setAsk(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return <div className="page"><div className="loading">로딩 중...</div></div>;
  }

  if (!ask) {
    return (
      <div className="page ask-detail-page">
        <div className="empty-state"><p>질문을 찾을 수 없어요</p></div>
      </div>
    );
  }

  return (
    <div className="page ask-detail-page">
      <Link to="/ask" className="ask-back-link">&larr; 전체 Q&A</Link>

      <div className="ask-detail-card">
        <div className="ask-detail-question">
          <span className="ask-card-q">Q.</span>
          <p>{ask.content}</p>
        </div>
        {ask.answer && (
          <div className="ask-detail-answer">
            <span className="ask-card-a">A.</span>
            <p>{ask.answer}</p>
          </div>
        )}
        <time className="ask-card-date">
          {ask.answered_at ? formatDate(ask.answered_at) : formatDate(ask.created_at)}
        </time>
      </div>
    </div>
  );
}
