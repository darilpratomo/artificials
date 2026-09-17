import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../lib/context';
declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (env: string) => void };
      Initialize: (o: Record<string, unknown>) => void;
      Checkout: { open: (o: Record<string, unknown>) => void };
    };
  }
}
export default function Checkout() {
  const { config } = useApp();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  useEffect(() => {
    const id = params.get('_ptxn');
    if (!config.billing || !config.paddleClientToken || !id || !/^txn_[a-z0-9]+$/.test(id)) return;
    let cancelled = false;
    const start = () => {
      if (cancelled || !window.Paddle) return;
      if (config.paddleSandbox) window.Paddle.Environment.set('sandbox');
      window.Paddle.Initialize({ token: config.paddleClientToken });
      window.Paddle.Checkout.open({
        transactionId: id,
        settings: {
          displayMode: 'overlay',
          successUrl: location.origin + '/dashboard?payment=success',
        },
      });
    };
    if (window.Paddle) start();
    else {
      const script = document.createElement('script');
      script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
      script.onload = start;
      script.onerror = () =>
        setError('Secure checkout could not load. Try again from the pricing page.');
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
    };
  }, [config.billing, config.paddleClientToken, config.paddleSandbox, params]);
  return (
    <div className="container page">
      <div className="empty-state">
        <h1>Activate your Studio plan.</h1>
        <p>
          {error ||
            (config.billing
              ? 'Complete your subscription in the secure checkout. Your plan activates after payment is verified.'
              : 'Subscriptions are not available yet.')}
        </p>
        <Link className="btn btn-outline" to="/pricing">
          Back to plans
        </Link>
      </div>
    </div>
  );
}
