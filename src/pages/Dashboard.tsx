import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, LogOut, ShieldCheck } from 'lucide-react';
import { useApp } from '../lib/context';
import { api, post } from '../lib/api';
import { EmptyState } from '../components/Layout';
/**
 * The account page for site editors: sign-out and two-factor authentication,
 * which the private editor tools require. Visitors never need an account.
 */
export default function Dashboard() {
  const { session, loading, refresh } = useApp();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
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
  if (loading) return <div className="loading-panel">Opening your account…</div>;
  if (!session.user)
    return (
      <EmptyState
        title="For site editors."
        text="Artificials is free to use without an account. Editors sign in here to look after the site’s articles."
        link="/login?next=/dashboard"
        label="Editor sign-in"
      />
    );
  return (
    <div className="container page dashboard">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">EDITOR ACCOUNT</span>
          <h1>Editor account.</h1>
          <p>Keep your sign-in protected with two-factor authentication.</p>
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
      <div role="alert" className={error ? 'error' : ''}>
        {error}
      </div>
      <div className="dashboard-content">
        <section>
          <div className="account-panel">
            <h2>Signed in</h2>
            <label>Email address</label>
            <p className="account-email">{session.user.email}</p>
            <p className="caption">
              Editor access also needs the editor role and a verified authenticator.
            </p>
          </div>
        </section>
        <aside>
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
