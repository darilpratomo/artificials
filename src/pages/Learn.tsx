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
  const paragraphs = article?.body.replace(/^(## [^\n]+)\n/gm, '$1\n\n').split(/\n\s*\n/) || [];
  const sections = paragraphs.flatMap((paragraph, index) =>
    paragraph.startsWith('## ') ? [{ title: paragraph.slice(3), id: `section-${index}` }] : [],
  );
  const related = articles
    .filter((a) => a.published && a.slug !== slug)
    .sort(
      (a, b) => Number(b.category === article?.category) - Number(a.category === article?.category),
    )
    .slice(0, 3);
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
                timeZone: 'UTC',
              })}{' '}
              · {readingMinutes(article.body)} min read
            </small>
          </div>
        </div>
        <figure className="article-hero-image">
          <ArticleCover article={article} priority />
        </figure>
        {sections.length > 3 && (
          <nav className="article-contents" aria-label="Article contents">
            <span className="eyebrow">IN THIS GUIDE</span>
            <ol>
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="prose">
          {paragraphs.map((p, i) =>
            p.startsWith('## ') ? (
              <h2 id={`section-${i}`} key={i}>
                {p.slice(3)}
              </h2>
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
        {related.length > 0 && (
          <aside className="article-related" aria-label="Related reading">
            <h2>Keep exploring</h2>
            {related.map((a) => (
              <Link key={a.slug} to={'/news/' + a.slug}>
                <span>
                  <small>
                    {a.category} · {readingMinutes(a.body)} min read
                  </small>
                  {a.title}
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            ))}
          </aside>
        )}
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
            <span className="eyebrow">
              {a.category} · {readingMinutes(a.body)} min read
            </span>
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

function readingMinutes(body: string) {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 220));
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
  const titles: Record<string, string> = {
    'https://arxiv.org/abs/2501.12948': 'DeepSeek-R1: Reasoning through reinforcement learning',
    'https://arxiv.org/abs/2501.19393': 's1: Simple test-time scaling',
    'https://arxiv.org/abs/1503.02531': 'Distilling the Knowledge in a Neural Network',
    'https://arxiv.org/abs/2404.14219': 'Phi-3 Technical Report',
    'https://arxiv.org/abs/2305.17493':
      'The Curse of Recursion: Training on Generated Data Makes Models Forget',
    'https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html':
      'Sentence Transformers: Semantic search and query encoding',
    'https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions':
      'Google Cloud: Model versions and lifecycle',
    'https://developers.deepgram.com/docs/understand-endpointing-interim-results':
      'Deepgram: Endpointing and interim transcript results',
  };
  if (titles[url]) return titles[url];
  const host = new URL(url).hostname;
  const labels: Record<string, string> = {
    'crfm.stanford.edu': 'Stanford CRFM: Holistic evaluation of language models',
    'ai.google.dev': 'Google AI for Developers: Technical documentation',
    'platform.claude.com': 'Anthropic: Technical documentation',
    'www.anthropic.com': 'Anthropic: Engineering research and guidance',
    'huggingface.co': 'Hugging Face: Technical documentation',
    'scikit-learn.org': 'Scikit-learn: Technical documentation',
    'sbert.net': 'Sentence Transformers: Retrieve and rerank documentation',
    'www.swebench.com': 'SWE-bench: Software engineering evaluation',
    'genai.owasp.org': 'OWASP: Prompt injection risks and mitigations',
    'arxiv.org': 'Read the original research paper on arXiv',
    'supabase.com': 'Supabase: Authentication documentation',
    'developers.cloudflare.com': 'Cloudflare: Developer documentation',
  };
  return labels[host] || `Read source on ${host}`;
}
