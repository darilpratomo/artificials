import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  ArrowUpRight,
  Monitor,
  Smartphone,
  Download,
  Code2,
  Eye,
  Database,
  ArrowRight,
  Check,
  LoaderCircle,
} from 'lucide-react';
import { useApp } from '../lib/context';
import { api } from '../lib/api';
import { DEMO } from '../lib/demo';
import type { Artifact } from '../../shared/schema';
import { safePreview } from '../../worker/security';
export default function Studio() {
  const { session, config, refresh } = useApp();
  const [params, setParams] = useSearchParams();
  const [prompt, setPrompt] = useState(params.get('prompt') || '');
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [demo, setDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'preview' | 'code' | 'database'>('preview');
  const [mobile, setMobile] = useState(false);
  const requestId = useRef<string | undefined>(undefined);
  const abort = useRef<AbortController | null>(null);
  const projectId = params.get('project');
  useEffect(() => {
    if (projectId && session.user)
      void api<{ artifact: Artifact | null }>('/projects/' + projectId)
        .then((d) => {
          setArtifact(d.artifact);
          setDemo(false);
        })
        .catch((e) => setError(e.message));
  }, [projectId, session.user?.id]);
  useEffect(() => () => abort.current?.abort(), []);
  async function build() {
    setBusy(true);
    setError('');
    setDemo(false);
    setStatus('Preparing your workspace…');
    const id = requestId.current || crypto.randomUUID();
    requestId.current = id;
    abort.current = new AbortController();
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ prompt, requestId: id, projectId: projectId || undefined }),
        signal: abort.current.signal,
      });
      if (!response.ok) {
        requestId.current = undefined;
        const d = (await response.json()) as { error?: string };
        throw new Error(d.error || 'Generation unavailable.');
      }
      if (response.headers.get('content-type')?.includes('application/json')) {
        const d = (await response.json()) as { status: string; projectId?: string };
        if (d.status === 'completed' && d.projectId) {
          const p = await api<{ artifact: Artifact }>('/projects/' + d.projectId);
          setArtifact(p.artifact);
          setParams({ project: d.projectId });
          requestId.current = undefined;
        } else {
          throw new Error(
            'This request was already submitted. Open your dashboard to check its status.',
          );
        }
        return;
      }
      if (!response.body) throw new Error('Stream unavailable.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let complete = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          const event = part
            .split('\n')
            .find((l) => l.startsWith('event:'))
            ?.slice(6)
            .trim();
          const raw = part
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).trim())
            .join('\n');
          if (!raw) continue;
          const d = JSON.parse(raw);
          if (event === 'status') setStatus(d.message);
          if (event === 'failure') {
            requestId.current = undefined;
            throw new Error(d.message);
          }
          if (event === 'complete') {
            setArtifact(d.artifact);
            setParams({ project: d.projectId });
            setPrompt('');
            setMode('preview');
            complete = true;
            requestId.current = undefined;
          }
        }
      }
      if (!complete)
        throw new Error(
          'Connection interrupted. Retry to check the same request, or open your dashboard.',
        );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setStatus('');
      await refresh();
    }
  }
  async function download() {
    if (!artifact) return;
    const [{ zipSync, strToU8 }, { projectFiles }] = await Promise.all([
      import('fflate'),
      import('../../shared/export'),
    ]);
    const zipped = zipSync(
      Object.fromEntries(
        Object.entries(projectFiles(artifact)).map(([name, data]) => [name, strToU8(data)]),
      ),
    );
    const blob = new Blob([new Uint8Array(zipped)], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  const canGenerate =
    !!session.user &&
    session.subscription?.status === 'active' &&
    new Date(session.subscription.period_end) > new Date() &&
    config.ai;
  return (
    <div className="container page studio-page">
      <div className="studio-page-head">
        <div>
          <span className="eyebrow">
            <Sparkles size={14} /> ARTIFICIALS STUDIO
          </span>
          <h1>From prompt to application.</h1>
          <p>
            Generate a responsive interface, an API, and a database. Download the complete project.
          </p>
        </div>
        <Link className="text-link" to="/pricing">
          Explore plans <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="builder">
        <aside className="builder-sidebar">
          <div className="builder-sidebar-title">
            <Sparkles size={19} />
            <h2>Describe your application</h2>
          </div>
          <p>Describe who will use your app, what they need to do, and the data it should save.</p>
          <label className="sr-only" htmlFor="app-prompt">
            Your app idea
          </label>
          <textarea
            id="app-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              projectId
                ? 'Tell us what you’d like to change…'
                : 'Build a project dashboard with sign-in, task assignments, status filters, and a database for each user’s projects…'
            }
            maxLength={4000}
            disabled={busy}
          />
          <div className="prompt-counter">{prompt.length.toLocaleString()} / 4,000</div>
          {canGenerate ? (
            <button
              className="btn full"
              disabled={busy || prompt.trim().length < 10}
              onClick={() => void build()}
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={16} /> Creating your app…
                </>
              ) : (
                <>
                  {projectId ? 'Refine your app' : 'Generate application'}
                  <ArrowUpRight size={16} />
                </>
              )}
            </button>
          ) : (
            <Link className="btn full" to={session.user ? '/pricing' : '/login?next=/studio'}>
              {session.user ? 'Choose your Studio plan' : 'Sign in to start building'}
              <ArrowRight size={16} />
            </Link>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {busy && (
            <div className="build-status" role="status">
              <span className="status-dot" />
              {status}
            </div>
          )}
          <span className="caption centered">1 generation per build or revision</span>
          <div className="builder-divider" />
          <span className="eyebrow">START WITH AN IDEA</span>
          {['A personal habit tracker', 'A client project portal', 'An inventory dashboard'].map(
            (x) => (
              <button
                className="idea-button"
                key={x}
                disabled={busy}
                onClick={() =>
                  setPrompt(
                    `Build ${x.toLowerCase()} with user sign-in, a clean dashboard, and a database to create, edit, and delete my records.`,
                  )
                }
              >
                {x}
                <ArrowUpRight size={14} />
              </button>
            ),
          )}
          <div className="builder-includes">
            <span>
              <Check size={13} /> Interface + backend + database
            </span>
            <span>
              <Check size={13} /> Full source code download
            </span>
            <span>
              <Check size={13} /> Your infrastructure, your control
            </span>
          </div>
        </aside>
        <div className="builder-main">
          <div className="preview-toolbar">
            <div className="preview-tabs">
              {(
                [
                  ['preview', Eye, 'Preview'],
                  ['code', Code2, 'Code'],
                  ['database', Database, 'Database'],
                ] as const
              ).map(([key, Icon, label]) => (
                <button
                  className={mode === key ? 'active' : ''}
                  key={key}
                  onClick={() => setMode(key)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            <div className="preview-actions">
              <button
                className={`icon-btn ${!mobile ? 'active' : ''}`}
                aria-label="Desktop preview"
                onClick={() => setMobile(false)}
              >
                <Monitor size={16} />
              </button>
              <button
                className={`icon-btn ${mobile ? 'active' : ''}`}
                aria-label="Mobile preview"
                onClick={() => setMobile(true)}
              >
                <Smartphone size={16} />
              </button>
              <button
                className="icon-btn"
                aria-label="Download complete project"
                disabled={!artifact || busy}
                onClick={() => void download()}
              >
                <Download size={17} />
              </button>
            </div>
          </div>
          {artifact ? (
            <>
              <div className="preview-title">
                <span className="browser-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <span>{artifact.title}</span>
                <span>{demo ? 'Example project' : 'Your project'}</span>
              </div>
              {mode === 'preview' ? (
                <div className={`preview-canvas ${mobile ? 'is-mobile' : ''}`}>
                  <iframe
                    title="Isolated app design preview"
                    sandbox=""
                    referrerPolicy="no-referrer"
                    srcDoc={safePreview(artifact.preview)}
                  />
                </div>
              ) : mode === 'code' ? (
                <pre className="code-preview">
                  <code>{artifact.app}</code>
                </pre>
              ) : (
                <div className="database-preview">
                  <span className="eyebrow">YOUR APP’S DATA MODEL</span>
                  <h2>Your database structure.</h2>
                  <p>
                    Each collection includes an owner ID. The exported API only returns the
                    signed-in user’s records.
                  </p>
                  {artifact.collections.map((c) => (
                    <div className="schema-card" key={c.name}>
                      <h3>
                        <Database size={16} />
                        {c.name}
                      </h3>
                      {c.fields.map((f) => (
                        <div key={f.name}>
                          <code>{f.name}</code>
                          <span>
                            {f.type} {f.required ? '· required' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                  <p className="caption">
                    Connect your own Cloudflare D1 database after downloading.
                  </p>
                </div>
              )}
              <div className="preview-footer">
                <span>Static design preview · Database runs after deployment</span>
                <button className="text-link" onClick={() => void download()}>
                  Download full project <Download size={14} />
                </button>
              </div>
            </>
          ) : (
            <div className="builder-empty">
              <span className="builder-empty-icon">
                <Sparkles size={34} />
              </span>
              <span className="eyebrow">IDEA → INTERFACE → APPLICATION</span>
              <h2>
                One prompt.
                <br />A working foundation.
              </h2>
              <p>
                Start with a prompt, or inspect an example with source code and a database schema.
              </p>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setArtifact(DEMO);
                  setDemo(true);
                  setMode('preview');
                }}
              >
                Explore an example <ArrowUpRight size={16} />
              </button>
              <span className="caption">Example preview is free. No generation credits used.</span>
            </div>
          )}
        </div>
      </div>
      <div className="studio-bottom-note">
        <ShieldNote />
        Generated apps include record management and authentication. The preview shows the design;
        sign-in and database features run after you deploy the downloaded project. Review and test
        your code, then connect your own hosting and database. Custom integrations require setup.
      </div>
    </div>
  );
}
function ShieldNote() {
  return <Code2 size={16} />;
}
