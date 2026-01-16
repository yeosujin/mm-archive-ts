import { useState } from 'react';
import { articles } from '../../data/mockData';

export default function AdminArticles() {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    url: '',
    date: '',
    tags: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 현재는 콘솔에만 출력 (나중에 Supabase 연동)
    const newArticle = {
      id: String(Date.now()),
      title: formData.title,
      author: formData.author,
      url: formData.url,
      date: formData.date,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    
    console.log('새 글 추가:', newArticle);
    alert('콘솔에 데이터가 출력되었어요!\n실제 저장은 Supabase 연동 후 가능해요.');
    
    // 폼 초기화
    setFormData({ title: '', author: '', url: '', date: '', tags: '' });
  };

  return (
    <div className="admin-page">
      <h1>글 관리</h1>
      
      <div className="admin-section">
        <h2>새 글 추가</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="글 제목"
              required
            />
          </div>
          
          <div className="form-group">
            <label>글쓴이 *</label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="작성자 또는 매체명"
              required
            />
          </div>
          
          <div className="form-group">
            <label>링크 URL *</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com/article"
              required
            />
          </div>
          
          <div className="form-group">
            <label>날짜 *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label>태그 (쉼표로 구분)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="인터뷰, 기사, 뉴스"
            />
          </div>
          
          <button type="submit" className="admin-submit-btn">
            추가하기
          </button>
        </form>
      </div>

      <div className="admin-section">
        <h2>등록된 글 ({articles.length}개)</h2>
        <div className="admin-list">
          {articles.map((article) => (
            <div key={article.id} className="admin-list-item article-item">
              <div className="admin-list-info">
                <h3>{article.title}</h3>
                <p>by {article.author} · {article.date}</p>
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="article-link">
                  {article.url}
                </a>
                <div className="admin-list-tags">
                  {article.tags.map((tag) => (
                    <span key={tag} className="tag">#{tag}</span>
                  ))}
                </div>
              </div>
              <div className="admin-list-actions">
                <button className="edit-btn">수정</button>
                <button className="delete-btn">삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
