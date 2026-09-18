import { applyPageMetadata } from '../components/Metadata';
import { pageMetadata } from '../../shared/seo';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Search } from 'lucide-react';
import { ARTICLES, ARTICLE_CATEGORIES, type Article } from '../../shared/content';
import { api } from '../lib/api';
import { EmptyState, PageHeading } from '../components/Layout';
import { ArticleCover } from '../components/ArticleCover';
export default function Learn() {
  const { slug } = useParams();
  const [articles, setArticles] = useState(ARTICLES);
  const [category, setCategory] = useState('All topics');
  const [query, setQuery] = useState('');
  useEffect(() => {
    void api<{ articles: Article[] }>('/articles')
      .then((d) => setArticles(d.articles))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (slug) applyPageMetadata(pageMetadata('/news/' + slug, articles));
  }, [slug, articles]);
  const article = articles.find((a) => a.slug === slug);
  if (slug)
    return article ? (
      <article className="container article-page">
        <Link className="text-link" to="/news">
          <ArrowLeft size={16} /> Back to News & insights
        </Link>
        <span className="eyebrow">{article.category}</span>
        <h1>{article.title}</h1>
        <p className="article-deck">{article.excerpt}</p>
        <div className="author-line">
          <div>
            <small>
              Editorial guide · Updated{' '}
              {new Date(article.updated_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </small>
          </div>
        </div>
        <figure className="article-hero-image">
          <ArticleCover article={article} priority />
        </figure>
        <div className="prose">
          {article.body
            .replace(/^(## [^\n]+)\n/gm, '$1\n\n')
            .split(/\n\s*\n/)
            .map((p, i) =>
              p.startsWith('## ') ? (
                <h2 key={i}>{p.slice(3)}</h2>
              ) : isSourceUrl(p.trim()) ? (
                <p key={i}>
                  <a href={p.trim()} target="_blank" rel="noopener noreferrer">
                    {sourceLabel(p.trim())} <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                </p>
              ) : (
                <p key={i}>{p}</p>
              ),
            )}
        </div>
        <div className="risk-note">
          An original editorial guide. Provider capabilities and documentation can change. Follow
          the linked sources and test the exact model or service before relying on it.
        </div>
      </article>
    ) : (
      <EmptyState
        title="Article not found."
        text="Explore our guides to AI models, evaluation, and building applications."
        link="/news"
        label="Browse insights"
      />
    );
  const filtered = articles.filter(
    (a) =>
      (category === 'All topics' || a.category === category) &&
      (a.title + ' ' + a.excerpt).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="container page">
      <PageHeading
        eyebrow="NEWS & INSIGHTS"
        title="Understand what comes next."
        text="Original guides to AI models, research, and the technology behind useful applications."
      />
      <div className="learn-controls">
        <div className="tabs">
          {['All topics', ...ARTICLE_CATEGORIES].map((c) => (
            <button
              className={category === c ? 'active' : ''}
              aria-pressed={category === c}
              key={c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={16} />
          <input
            placeholder="Find a topic"
            aria-label="Search articles"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="learn-grid">
        {filtered.map((a) => (
          <Link className="learn-card" to={'/news/' + a.slug} key={a.id}>
            <ArticleCover article={a} decorative />
            <span className="eyebrow">{a.category} · Editorial guide</span>
            <h2>{a.title}</h2>
            <p>{a.excerpt}</p>
            <span className="text-link">
              Read the guide <ArrowUpRight size={16} />
            </span>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <EmptyState
          title="No articles match your search."
          text="Try another topic or clear your search."
        />
      )}
    </div>
  );
}

function isSourceUrl(value: string) {
  if (!/^https:\/\/[^\s]+$/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function sourceLabel(url: string) {
  const host = new URL(url).hostname;
  const labels: Record<string, string> = {
    'crfm.stanford.edu': 'Stanford CRFM: Holistic evaluation of language models',
    'ai.google.dev': 'Google AI for Developers: Technical documentation',
    'platform.claude.com': 'Anthropic: Streaming messages documentation',
    'supabase.com': 'Supabase: Authentication documentation',
    'developers.cloudflare.com': 'Cloudflare: Querying a D1 database',
  };
  return labels[host] || `Read source on ${host}`;
}
