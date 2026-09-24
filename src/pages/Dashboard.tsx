import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Plus,
  FolderOpen,
  Sparkles,
  CreditCard,
  LogOut,
  ShieldCheck,
  Trash2,
  ArrowRight,
  X,
} from 'lucide-react';
import { useApp } from '../lib/context';
import { api, post } from '../lib/api';
import { EmptyState } from '../components/Layout';
export default function Dashboard() {
  const { session, loading, refresh } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [factor, setFactor] = useState<{ id: string; secret?: string } | null>(null);
  const [code, setCode] = useState('');
  const [securityStatus, setSecurityStatus] = useState('');
  const [securityOpen, setSecurityOpen] = useState(false);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <div className="loading-panel">Opening your workspace…</div>;
  if (!session.user)
    return (
      <EmptyState
        title="Your workspace starts here."
        text="Sign in to see your projects, manage your plan, and pick up where you left off."
        link="/login?next=/dashboard"
        label="Sign in to your account"
      />
    );
  const s = session.subscription;
  const projects = session.projects || [];
  return (
    <div className="container page dashboard">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR WORKSPACE</span>
          <h1>Your workspace.</h1>
          <p>Manage your projects, check usage, and keep your account protected.</p>
        </div>
        <button
          className="text-link"
          disabled={busy}
          onClick={() =>
            void action(async () => {
              await post('/auth/logout');
              await refresh();
              navigate('/');
            })
          }
        >
          Sign out <LogOut size={15} />
        </button>
      </div>
      {session.requiresMfa && (
        <div className="notice">
          Verify your authenticator code in Security settings below to finish signing in.
        </div>
      )}
      <div className="dashboard-stats">
        <div>
          <span className="stat-icon">
            <FolderOpen size={20} />
          </span>
          <span>Your projects</span>
          <strong>
            {projects.length}
            <small> saved projects</small>
          </strong>
        </div>
        <div>
          <span className="stat-icon">
            <Sparkles size={20} />
          </span>
          <span>Generations remaining</span>
          <strong>
            {s ? Math.max(0, s.credit_limit - s.credits_used) : 0}
            <small>
              {' '}
              {s ? `of ${s.credit_limit} this period` : 'Choose a plan to get started'}
            </small>
          </strong>
          {s && (
            <progress
              aria-label="Generations remaining this billing period"
              value={Math.max(0, s.credit_limit - s.credits_used)}
              max={s.credit_limit}
            />
          )}
        </div>
        <div>
          <span className="stat-icon">
            <CreditCard size={20} />
          </span>
          <span>Your plan</span>
          <strong className="capitalize">
            {s?.plan || 'Explorer'}
            <small>{s?.status || 'Free model directory access'}</small>
          </strong>
        </div>
      </div>
      <div role="alert" className={error ? 'error' : ''}>
        {error}
      </div>
      <div className="dashboard-content">
        <section>
          <div className="section-heading">
            <h2>Your projects</h2>
            <Link className="btn btn-small" to="/studio">
              <Plus size={16} /> New project
            </Link>
          </div>
          {projects.length ? (
            <div className="project-grid">
              {projects.map((p) => (
                <div className="project-card" key={p.id}>
                  <span className="project-art">
                    <FolderOpen size={32} />
                  </span>
                  <h3>{p.title}</h3>
                  <p>Updated {new Date(p.updated_at).toLocaleDateString('en-US')}</p>
                  <div className="project-actions">
                    <Link className="text-link" to={'/studio?project=' + p.id}>
                      Open project <ArrowUpRight size={15} />
                    </Link>
                    {confirmDelete === p.id ? (
                      <>
                        <button
                          className="text-link danger"
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              await api('/projects/' + p.id, { method: 'DELETE' });
                              setConfirmDelete(null);
                              await refresh();
                            })
                          }
                        >
                          Confirm delete
                        </button>
                        <button
                          className="icon-btn"
                          aria-label="Cancel deletion"
                          onClick={() => setConfirmDelete(null)}
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <button
                        className="icon-btn"
                        aria-label={'Delete ' + p.title}
                        onClick={() => setConfirmDelete(p.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <span className="empty-icon">
                <FolderOpen size={30} />
              </span>
              <h3>Create your first application.</h3>
              <p>Your first project starts with a prompt.</p>
              <Link className="text-link" to="/studio">
                Open Studio <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </section>
        <aside>
          <div className="account-panel">
            <span className="eyebrow">ACCOUNT AT A GLANCE</span>
            <h3>Your account</h3>
            <label>Email address</label>
            <p className="account-email">{session.user.email}</p>
            <label>Billing</label>
            <p>
              {s
                ? `Current access period ends ${new Date(s.period_end).toLocaleDateString('en-US')}.`
                : 'No paid subscription. Explore at your own pace.'}
            </p>
            {s ? (
              <button
                className="btn btn-outline full"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    const d = await post<{ url: string }>('/billing/portal');
                    location.assign(d.url);
                  })
                }
              >
                Manage subscription <ArrowUpRight size={15} />
              </button>
            ) : (
              <Link className="btn btn-outline full" to="/pricing">
                Explore Studio plans <ArrowUpRight size={15} />
              </Link>
            )}
            <p className="caption">
              Monthly limits are enforced automatically. No overage charges.
            </p>
          </div>
          <div className="security-panel">
            <ShieldCheck size={21} />
            <h3>Account security</h3>
            <p>Protect your account with an authenticator app.</p>
            <button
              className="text-link"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  setSecurityOpen(true);
                  const d = await api<{ factors: { id: string; status: string }[] }>('/security');
                  const verified = d.factors.find((f) => f.status === 'verified');
                  const pending = d.factors.find((f) => f.status === 'unverified');
                  if (verified) {
                    setFactor(verified);
                    setSecurityStatus('Enter a current authenticator code to verify this session.');
                  } else if (pending) {
                    setFactor(pending);
                    setSecurityStatus(
                      'Finish setup with the code from your authenticator app. If you no longer have the setup key, contact support for help resetting the unfinished setup.',
                    );
                  } else setSecurityStatus('Add two-factor authentication to your account.');
                })
              }
            >
              Security settings <ArrowUpRight size={14} />
            </button>
            {securityOpen && (
              <div className="security-form">
                <p role="status">{securityStatus}</p>
                {!factor && (
                  <button
                    className="btn btn-small"
                    disabled={busy}
                    onClick={() =>
                      void action(async () => {
                        setFactor(await post('/security/enroll'));
                        setSecurityStatus(
                          'Add this setup key to your authenticator app, then enter its six-digit code.',
                        );
                      })
                    }
                  >
                    Set up authenticator
                  </button>
                )}
                {factor?.secret && <code className="setup-secret">{factor.secret}</code>}
                {factor && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action(async () => {
                        await post('/security/verify', { factorId: factor.id, code });
                        setSecurityStatus('Two-factor authentication verified for this session.');
                        setFactor(null);
                        setCode('');
                        setSecurityOpen(false);
                        await refresh();
                      });
                    }}
                  >
                    <label>
                      Authentication code
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                      />
                    </label>
                    <button className="btn btn-small" disabled={busy}>
                      Verify
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
