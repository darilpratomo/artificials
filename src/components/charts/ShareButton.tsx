import { useState } from 'react';
import { Check, ImageDown, LoaderCircle } from 'lucide-react';
import './charts.css';

/**
 * Saves a chart as a PNG with the Artificials lockup and a data credit. The
 * drawing code loads on first use, so pages stay light for everyone else.
 */
export function ShareButton({
  title,
  render,
}: {
  title: string;
  render: (tools: typeof import('./share-image')) => Promise<HTMLCanvasElement>;
}) {
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const save = async () => {
    setState('working');
    try {
      const tools = await import('./share-image');
      const image = await render(tools);
      await tools.saveImage(image, tools.fileName(title), title);
      setState('done');
      window.setTimeout(() => setState('idle'), 2400);
    } catch {
      setState('error');
    }
  };
  return (
    <button
      type="button"
      className="share-button"
      onClick={save}
      disabled={state === 'working'}
      aria-label={`Download "${title}" as an image`}
      title={state === 'error' ? 'Try again' : `Download "${title}"`}
    >
      {state === 'working' ? (
        <LoaderCircle size={16} className="spin" aria-hidden="true" />
      ) : state === 'done' ? (
        <Check size={16} aria-hidden="true" />
      ) : (
        <ImageDown size={16} aria-hidden="true" />
      )}
      <span className="sr-only" aria-live="polite">
        {state === 'working'
          ? 'Preparing…'
          : state === 'done'
            ? 'Saved'
            : state === 'error'
              ? 'Try again'
              : 'Download image'}
      </span>
    </button>
  );
}
