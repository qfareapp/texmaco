import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, LoaderCircle, Newspaper } from 'lucide-react';
import { publicApi } from './api';

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    publicApi.news().then(setArticles).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return (
    <main className="news-page">
      <header className="news-header">
        <a className="news-brand" href="/" aria-label="Return to Texmaco brochure">
          <img src="/assets/texmaco-logo.png" alt="Texmaco Rail & Engineering Ltd." />
        </a>
        <a className="news-back" href="/"><ArrowLeft /> Back to brochure</a>
      </header>

      <section className="news-hero">
        <div>
          <span><Newspaper /> Newsroom</span>
          <h1>Texmaco in the news.</h1>
          <p>Recent coverage, company developments and industry stories from trusted publications.</p>
        </div>
        <strong>{String(articles.length).padStart(2, '0')}<small>published stories</small></strong>
      </section>

      <section className="news-content">
        {loading ? <div className="news-state"><LoaderCircle className="spin" /> Loading recent coverage…</div>
          : error ? <div className="news-state news-state--error"><Newspaper /><strong>News is temporarily unavailable.</strong><span>{error}</span></div>
            : !articles.length ? <div className="news-state"><Newspaper /><strong>No articles published yet.</strong><span>Please check back soon.</span></div>
              : <div className="news-grid">
                {articles.map((article, index) => (
                  <article className={index === 0 ? 'news-card news-card--featured' : 'news-card'} key={article._id}>
                    <a className="news-card-image" href={article.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Read ${article.headline} on ${article.sourceName}`}>
                      <img src={article.image} alt="" />
                      <span>Read original <ArrowUpRight /></span>
                    </a>
                    <div className="news-card-copy">
                      <div><span>{article.sourceName}</span><time>{formatDate(article.publishedAt)}</time></div>
                      <h2><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">{article.headline}</a></h2>
                      <p>{article.gist}</p>
                      <a className="news-source-link" href={article.sourceUrl} target="_blank" rel="noopener noreferrer">Continue to {article.sourceName} <ArrowUpRight /></a>
                    </div>
                  </article>
                ))}
              </div>}
      </section>

      <footer className="news-footer"><span>Texmaco Rail &amp; Engineering Ltd.</span><a href="/">Explore the digital brochure <ArrowUpRight /></a></footer>
    </main>
  );
}
