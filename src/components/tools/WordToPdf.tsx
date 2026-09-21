import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileText, LoaderCircle, Printer, X } from 'lucide-react';
import { convertWordLocally, wordPreviewDocument } from '../../lib/tools/word';
import './word-to-pdf.css';

export default function WordToPdf({ file }: { file: File }) {
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const conversion = useRef<AbortController | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    conversion.current = controller;
    const current = ++generation.current;
    setBusy(true);
    setReady(false);
    setError('');
    setNotice('');
    setPreview('');
    convertWordLocally(file, controller.signal)
      .then((result) => {
        if (controller.signal.aborted || generation.current !== current) return;
        setPreview(wordPreviewDocument(result.html));
        setNotice(
          result.warnings || result.omittedImages
            ? 'Some formatting or images could not be preserved. Check the preview before saving.'
            : 'Your preview is ready. Check page breaks and layout in the print dialog before saving.',
        );
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || generation.current !== current) return;
        setError(
          reason instanceof Error ? reason.message : 'This document could not be converted.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted && generation.current === current) setBusy(false);
      });
    return () => {
      controller.abort();
      generation.current++;
    };
  }, [file]);

  const print = () => {
    if (!ready || !frame.current?.contentWindow) return;
    try {
      frame.current.contentWindow.focus();
      frame.current.contentWindow.print();
    } catch {
      setError(
        'This browser blocked printing. Try a current desktop browser with Save as PDF support.',
      );
    }
  };

  return (
    <section className="word-pdf" aria-label="Word document preview" aria-busy={busy}>
      <div className="word-pdf-heading">
        <div>
          <FileText size={21} aria-hidden="true" />
          <h2>Preview your document</h2>
        </div>
        <span>Processed on your device</span>
      </div>
      <p className="word-pdf-help">
        Choose “Save as PDF” in your browser’s print dialog. DOCX only; complex layouts may differ.
        No uploads.
      </p>
      {busy && (
        <div className="word-pdf-progress" role="status">
          <LoaderCircle size={20} aria-hidden="true" />
          <span>Preparing your document locally…</span>
          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={() => {
              conversion.current?.abort();
              setBusy(false);
              setNotice('Conversion cancelled. Select the file again to restart.');
            }}
          >
            <X size={15} aria-hidden="true" />
            Cancel
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="word-pdf-notice" role="status">
          <CheckCircle2 size={17} aria-hidden="true" />
          {notice}
        </p>
      )}
      {preview && (
        <>
          <div className="word-pdf-actions">
            <button className="btn btn-light" type="button" disabled={!ready} onClick={print}>
              <Printer size={18} aria-hidden="true" />
              {ready ? 'Print / save as PDF' : 'Loading preview…'}
            </button>
            <span>Text stays selectable. Review the result before sharing.</span>
          </div>
          <iframe
            ref={frame}
            className="word-pdf-preview"
            title="Converted DOCX preview"
            sandbox="allow-same-origin allow-modals"
            referrerPolicy="no-referrer"
            srcDoc={preview}
            onLoad={() => {
              const current = generation.current;
              const images = Array.from(frame.current?.contentDocument?.images || []);
              Promise.all(images.map((image) => image.decode().catch(() => undefined))).then(() => {
                if (current === generation.current && !conversion.current?.signal.aborted)
                  setReady(true);
              });
            }}
          />
        </>
      )}
    </section>
  );
}
