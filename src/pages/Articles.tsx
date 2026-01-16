import { useState } from 'react';
import ArticleList from '../components/ArticleList';
import { articles } from '../data/mockData';

export default function Articles() {
  const [searchTerm, setSearchTerm] = useState('');

  // 검색 필터링
  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page articles-page">
      <div className="page-header">
        <h1>글</h1>
        
        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="제목, 글쓴이, 태그로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {filteredArticles.length === 0 ? (
        <div className="empty-state">
          <p>검색 결과가 없습니다 😢</p>
        </div>
      ) : (
        <ArticleList articles={filteredArticles} />
      )}
    </div>
  );
}
