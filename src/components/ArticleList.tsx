import type { Article } from '../data/mockData';

interface Props {
  articles: Article[];
}

export default function ArticleList({ articles }: Props) {
  const handleClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="article-list">
      {articles.map((article) => (
        <article 
          key={article.id} 
          className="article-card"
          onClick={() => handleClick(article.url)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick(article.url)}
        >
          <div className="article-content">
            <h3 className="article-title">{article.title}</h3>
            <p className="article-author">by {article.author}</p>
            <div className="article-tags">
              {article.tags.map((tag) => (
                <span key={tag} className="tag">#{tag}</span>
              ))}
            </div>
          </div>
          <div className="article-meta">
            <time className="article-date">{article.date}</time>
            <span className="external-icon">↗</span>
          </div>
        </article>
      ))}
    </div>
  );
}
