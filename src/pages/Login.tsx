import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useApp } from '../lib/context';
import { post } from '../lib/api';
import Turnstile from '../components/Turnstile';
export default function Login() {
  const { config, session, refresh } = useApp();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [captcha, setCaptcha] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get('next') || '/dashboard';
  const next =
    requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\')
      ? requested
      : '/dashboard';
  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (sent) {
        await post('/auth/verify', { email, code });
        await refresh();
        navigate(next);
      } else {
        await post('/auth/otp', { email, captcha });
        setSent(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page container">
      <div className="auth-story">
        <span className="eyebrow">FOR SITE EDITORS</span>
        <h1>
          Editor
          <br />
          sign-in.
        </h1>
        <p>
          Artificials is free to use without an account. Sign-in is only for the volunteers who edit
          the site’s articles.
        </p>
        <div className="auth-illustration" aria-hidden="true">
          <div />
          <div />
          <div />
          <ArrowUpRight size={49} strokeWidth={1.5} />
        </div>
        <span className="caption">
          <ShieldCheck size={15} /> Email sign-in. Optional two-factor authentication.
        </span>
      </div>
      <div className="auth-card">
        {session.user ? (
          <>
            <CheckCircle2 size={34} />
            <h2>You’re signed in.</h2>
            <p>Signed in as {session.user.email}</p>
            <Link className="btn full" to={next}>
              Open your editor account <ArrowRight size={16} />
            </Link>
          </>
        ) : (
          <>
            <span className="auth-icon">
              <Mail size={25} />
            </span>
            <h2>{sent ? 'Check your inbox.' : 'Sign in as an editor.'}</h2>
            <p>
              {sent
                ? `Enter the sign-in code sent to ${email}.`
                : 'Sign in with a code sent to your email. No password to remember.'}
            </p>
            {!config.auth && (
              <div className="notice">
                Editor sign-in is not set up yet. Everything else on Artificials is open to
                everyone, without an account.
              </div>
            )}
            {config.google && (
              <>
                <button
                  className="btn btn-outline full"
                  onClick={async () => {
                    try {
                      const d = await post<{ url: string }>('/auth/google');
                      location.assign(d.url);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  <span className="google-g">G</span> Continue with Google
                </button>
                <div className="divider">
                  <span>or use your email</span>
                </div>
              </>
            )}
            <form onSubmit={submit}>
              <label>
                Email address
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  disabled={sent}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  maxLength={254}
                />
              </label>
              {sent ? (
                <label>
                  Sign-in code
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6,8}"
                    minLength={6}
                    maxLength={8}
                    placeholder="Enter your code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  />
                </label>
              ) : (
                <Turnstile siteKey={config.turnstileSiteKey} onToken={setCaptcha} />
              )}
              <div role="alert" className={error ? 'error' : ''}>
                {error}
              </div>
              <button
                className="btn full"
                disabled={!config.auth || busy || (!sent && !!config.turnstileSiteKey && !captcha)}
              >
                {busy ? 'One moment…' : sent ? 'Verify & continue' : 'Continue with email'}
                <ArrowRight size={16} />
              </button>
            </form>
            {sent && (
              <button
                className="text-link centered"
                onClick={() => {
                  setSent(false);
                  setCode('');
                  setCaptcha('');
                }}
              >
                Use a different email or resend
              </button>
            )}
            <p className="auth-terms">
              By continuing, you agree to our <Link to="/terms">Terms</Link> and acknowledge our{' '}
              <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
