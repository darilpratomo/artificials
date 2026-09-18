import { Select } from '../components/Select';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Save, Trash2, LockKeyhole } from 'lucide-react';
import { ARTICLE_CATEGORIES, type Article } from '../../shared/content';
import { api, post } from '../lib/api';
const empty = {
  slug: '',
  title: '',
  excerpt: '',
  category: 'Guides',
  body: '',
  published: false,
};
export default function Cms() {
  const { token } = useParams();
  const [articles, setArticles] = useState<Article[]>([]);
  const [draft, setDraft] = useState<typeof empty & { id?: string }>(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const endpoint = '/cms/' + encodeURIComponent(token || '') + '/articles';
  async function load() {
    try {
      const d = await api<{ articles: Article[] }>(endpoint);
      setArticles(d.articles);
      setAllowed(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [endpoint]);
  async function save(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const d = await post<{ article: Article }>(endpoint, draft);
      setDraft(d.article);
      setNotice('Article saved.');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!allowed)
    return (
      <div className="container page">
        <div className="empty-state">
          <LockKeyhole size={30} />
          <h1>Private editorial workspace</h1>
          <p role="alert">{error || 'Verifying your access…'}</p>
          <Link className="btn" to="/dashboard">
            Account & two-factor authentication
          </Link>
        </div>
      </div>
    );
  return (
    <div className="container page cms-page">
      <span className="eyebrow">EDITORIAL WORKSPACE</span>
      <div className="section-heading">
        <h1>Editorial dashboard.</h1>
        <button
          className="btn btn-small"
          onClick={() => {
            setDraft(empty);
            setNotice('');
            setConfirmDelete(false);
          }}
        >
          <Plus size={16} /> New article
        </button>
      </div>
      <div className="cms-layout">
        <aside>
          {articles.map((a) => (
            <button
              className={a.id === draft.id ? 'active' : ''}
              key={a.id}
              onClick={() => {
                setDraft({
                  id: a.id,
                  slug: a.slug,
                  title: a.title,
                  excerpt: a.excerpt,
                  category: a.category,
                  body: a.body,
                  published: a.published,
                });
                setConfirmDelete(false);
              }}
            >
              <strong>{a.title}</strong>
              <span>{a.published ? 'Published' : 'Draft'}</span>
            </button>
          ))}
          {!articles.length && <p>No articles yet. Create your first guide.</p>}
        </aside>
        <form className="cms-editor" onSubmit={save}>
          <label>
            Title
            <input
              required
              minLength={5}
              maxLength={180}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <div className="form-row">
            <label>
              URL slug
              <input
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={150}
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
              />
            </label>
            <label>
              Category
              <Select
                aria-label="Category"
                value={draft.category}
                onValueChange={(value) => setDraft({ ...draft, category: value })}
              >
                {ARTICLE_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </label>
          </div>
          <label>
            Short introduction
            <textarea
              required
              minLength={20}
              maxLength={350}
              value={draft.excerpt}
              onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
            />
          </label>
          <label>
            Article content{' '}
            <span className="caption">
              Separate paragraphs with a blank line. Use ## for a heading and a full https:// URL
              for a source.
            </span>
            <textarea
              className="article-editor"
              required
              minLength={100}
              maxLength={50000}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
            />{' '}
            Publish on News & insights
          </label>
          <div className="error" role="alert">
            {error}
          </div>
          <div role="status">{notice}</div>
          <div className="editor-actions">
            <button className="btn" disabled={busy}>
              <Save size={16} />
              {busy ? 'Saving…' : 'Save article'}
            </button>
            {draft.id && (
              <button
                type="button"
                className="btn btn-outline danger"
                disabled={busy}
                onClick={async () => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  setBusy(true);
                  try {
                    await api(endpoint + '/' + draft.id, { method: 'DELETE' });
                    setDraft(empty);
                    setConfirmDelete(false);
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Trash2 size={16} />
                {confirmDelete ? 'Confirm permanent deletion' : 'Delete article'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
