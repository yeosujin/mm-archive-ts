import { useState, useEffect } from 'react';
import { getArticles, createArticle, updateArticle, deleteArticle } from '../../lib/database';
import { supabase } from '../../lib/supabase';
import type { Article } from '../../lib/database';

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    url: '',
    date: '',
    tags: '',
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const data = await getArticles();
      setArticles(data);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPostypeUrl = (url: string) => {
    return url.includes('posty.pe') || url.includes('postype.com');
  };

  const fetchPostypeMeta = async () => {
    if (!formData.url || !isPostypeUrl(formData.url)) {
      alert('포스타입 URL을 먼저 입력해주세요.');
      return;
    }

    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-task', {
        body: { url: formData.url }
      });

      if (error) throw error;

      if (data) {
        // 따옴표나 불필요한 문자 제거
        const cleanString = (str: string) => str?.replace(/["']/g, '').trim() || '';
        // 제목에서 맨 뒤의 " : 채널명" 또는 " - 채널명" 제거 (채널명이 짧을 때만)
        const cleanTitle = (str: string) => {
          const cleaned = cleanString(str);
          // 맨 마지막 " : " 또는 " - " 찾기
          const lastColonIdx = cleaned.lastIndexOf(' : ');
          const lastDashIdx = cleaned.lastIndexOf(' - ');
          const splitIdx = Math.max(lastColonIdx, lastDashIdx);
          
          if (splitIdx > 0) {
            const afterSplit = cleaned.substring(splitIdx + 3).trim();
            // 뒤의 부분이 15자 이하면 채널명으로 간주하고 제거
            if (afterSplit.length <= 15) {
              return cleaned.substring(0, splitIdx).trim();
            }
          }
          return cleaned;
        };
        
        setFormData(prev => ({
          ...prev,
          title: cleanTitle(data.title) || prev.title,
          author: cleanString(data.author) || prev.author,
          date: data.date || prev.date,
          tags: data.tags?.map((t: string) => cleanString(t)).join(', ') || prev.tags,
        }));
        alert('정보를 불러왔어요!');
      }
    } catch (error) {
      console.error('Error fetching Postype meta:', error);
      alert('정보를 불러오는데 실패했어요.');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const articleData = {
        title: formData.title,
        author: formData.author,
        url: formData.url,
        date: formData.date,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (editingId) {
        await updateArticle(editingId, articleData);
        alert('수정되었어요!');
        setEditingId(null);
      } else {
        await createArticle(articleData);
        alert('글이 추가되었어요!');
      }
      
      setFormData({ title: '', author: '', url: '', date: '', tags: '' });
      loadArticles();
    } catch (error) {
      console.error('Error saving article:', error);
      alert('저장 중 오류가 발생했어요.');
    }
  };

  const handleEdit = (article: Article) => {
    setEditingId(article.id);
    setFormData({
      title: article.title,
      author: article.author,
      url: article.url,
      date: article.date,
      tags: article.tags.join(', '),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', author: '', url: '', date: '', tags: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠어요?')) return;
    
    try {
      await deleteArticle(id);
      alert('삭제되었어요!');
      loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
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
      <h1>글 관리</h1>
      
      <div className="admin-section">
        <h2>{editingId ? '글 수정' : '새 글 추가'}</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="article-title">제목 *</label>
            <input
              id="article-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="글 제목"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="article-author">글쓴이 *</label>
            <input
              id="article-author"
              type="text"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              placeholder="작성자 또는 매체명"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="article-url">링크 URL *</label>
            <div className="input-with-button">
              <input
                id="article-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://posty.pe/xxxxx"
                required
              />
              {isPostypeUrl(formData.url) && (
                <button 
                  type="button" 
                  className="fetch-btn"
                  onClick={fetchPostypeMeta}
                  disabled={fetching}
                >
                  {fetching ? '불러오는 중...' : '정보 불러오기'}
                </button>
              )}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="article-date">날짜 *</label>
            <input
              id="article-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="article-tags">태그 (쉼표로 구분)</label>
            <input
              id="article-tags"
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="소설, 팬픽, 로맨스"
            />
          </div>
          
          <div className="form-buttons">
            <button type="submit" className="admin-submit-btn">
              {editingId ? '수정하기' : '추가하기'}
            </button>
            {editingId && (
              <button type="button" className="admin-clear-btn" onClick={handleCancelEdit}>
                취소
              </button>
            )}
          </div>
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
                <button className="edit-btn" onClick={() => handleEdit(article)}>수정</button>
                <button className="delete-btn" onClick={() => handleDelete(article.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
