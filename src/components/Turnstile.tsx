import { useEffect, useRef } from 'react';
declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}
export default function Turnstile({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;
  useEffect(() => {
    if (!siteKey) return;
    let id: string | undefined;
    let stopped = false;
    const render = () => {
      if (!stopped && ref.current && window.turnstile)
        id = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (token: string) => cb.current(token),
          'expired-callback': () => cb.current(''),
          'error-callback': () => cb.current(''),
        });
    };
    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.dataset.turnstile = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', render, { once: true });
    }
    return () => {
      stopped = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [siteKey]);
  return <div ref={ref} />;
}
