// 공사중 - 임시 숨김
// import { useState, useEffect, useCallback } from 'react';
// import { useSearchParams } from 'react-router-dom';
// import type { Article } from '../lib/database';
// import { useData } from '../hooks/useData';

export default function Articles() {
  // 공사중 - 임시 숨김
  return (
    <div className="page articles-page">
      <div className="page-header">
        <h1>글</h1>
      </div>
      <div className="empty-state" style={{ marginTop: '3rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</p>
        <p>공사중이에요!</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          곧 새로운 모습으로 찾아올게요
        </p>
      </div>
    </div>
  );

  /* 원래 코드 - 공사 완료 후 복구
  if (loading) {
    return (
      <div className="page articles-page">
        <div className="loading">로딩 중...</div>
      </div>
  );
  }

  return (
    <div className="page articles-page">
      <div className="page-header">
        <h1>글</h1>

        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="제목, 글쓴이, 태그, 날짜로 검색..."
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
        <div className="article-list">
          {filteredArticles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`article-card ${highlightedId === article.id ? 'highlighted' : ''}`}
              data-article-id={article.id}
            >
              <div className="article-info">
                <h3 className="article-title">{article.title}</h3>
                <span className="article-author">{article.author}</span>
                <time className="article-date">{article.date}</time>
              </div>
              <div className="article-tags">
                {article.tags.map((tag) => (
                  <span key={tag} className="article-tag">#{tag}</span>
                ))}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
  */
}
