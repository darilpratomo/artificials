import { useEffect, useState } from 'react';
import { Check, Link2 } from 'lucide-react';

/**
 * Shares the page's address: the share sheet on touch screens, the clipboard
 * elsewhere. The button says when the link is copied.
 */
export function ShareLink({ title, path }: { title: string; path?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 2400);
    return () => window.clearTimeout(timer);
  }, [state]);
  const share = async () => {
    const url = new URL(path ?? location.pathname, location.origin).toString();
    try {
      if (matchMedia('(pointer: coarse)').matches && navigator.share)
        await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setState('copied');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setState('error');
    }
  };
  return (
    <>
      <button type="button" className="btn btn-small share-link" onClick={share}>
        {state === 'copied' ? (
          <Check size={15} aria-hidden="true" />
        ) : (
          <Link2 size={15} aria-hidden="true" />
        )}
        {state === 'copied' ? 'Link copied' : state === 'error' ? 'Copy failed' : 'Share link'}
      </button>
      <span className="sr-only" role="status">
        {state === 'copied' ? 'Link copied to the clipboard.' : ''}
      </span>
    </>
  );
}
