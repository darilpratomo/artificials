import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, FileText, LoaderCircle, Printer, X } from 'lucide-react';
import { convertWordLocally, wordPreviewDocument } from '../../lib/tools/word';
import './word-to-pdf.css';

interface Converted {
  blob: Blob;
  name: string;
  pages: number;
  omittedImages: number;
}

export default function WordToPdf({ file }: { file: File }) {
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [building, setBuilding] = useState(false);
  const [pdf, setPdf] = useState<Converted | null>(null);
  const [url, setUrl] = useState('');
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
    setPdf(null);
    setProgress(0);
    setStatus('');
    convertWordLocally(file, controller.signal)
      .then(async (result) => {
        if (controller.signal.aborted || generation.current !== current) return;
        const html = wordPreviewDocument(result.html);
        setPreview(html);
        setNotice(
          result.warnings || result.omittedImages
            ? 'Some formatting or images could not be preserved. Check the preview before saving.'
            : 'Your document is ready. Download the PDF, or print it from the preview.',
        );
        setStatus('Building your PDF…');
        setBuilding(true);
        const { renderDocxPdf } = await import('../../lib/tools/docx-pdf');
        const outcome = await renderDocxPdf(
          result.html,
          { title: file.name.replace(/\.docx$/i, '') },
          (amount, message) => {
            if (generation.current === current) {
              setProgress(Math.min(100, Math.max(0, amount)));
              setStatus(message);
            }
          },
          controller.signal,
        );
        if (controller.signal.aborted || generation.current !== current) return;
        setPdf({
          blob: outcome.blob,
          name: `${
            file.name
              .replace(/\.docx$/i, '')
              .replace(/[\\/\x00-\x1f]/g, '-')
              .slice(0, 120) || 'document'
          }.pdf`,
          pages: outcome.pages,
          omittedImages: outcome.omittedImages,
        });
        setProgress(100);
        setStatus('');
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || generation.current !== current) return;
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(
          reason instanceof Error ? reason.message : 'This document could not be converted.',
        );
        setStatus('');
      })
      .finally(() => {
        if (!controller.signal.aborted && generation.current === current) {
          setBusy(false);
          setBuilding(false);
        }
      });
    return () => {
      controller.abort();
      generation.current++;
    };
  }, [file]);

  useEffect(() => {
    if (!pdf) {
      setUrl('');
      return;
    }
    const next = URL.createObjectURL(pdf.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [pdf]);

  const print = () => {
    if (!ready || !frame.current?.contentWindow) return;
    try {
      frame.current.contentWindow.focus();
      frame.current.contentWindow.print();
    } catch {
      setError('This browser blocked printing. Download the PDF instead, or try another browser.');
    }
  };

  const formatBytes = (value: number) =>
    value >= 1024 * 1024
      ? `${(value / (1024 * 1024)).toFixed(2)} MB`
      : `${(value / 1024).toFixed(1)} KB`;

  return (
    <section className="word-pdf" aria-label="Word document conversion" aria-busy={busy}>
      <div className="word-pdf-heading">
        <div>
          <FileText size={21} aria-hidden="true" />
          <h2>Your document as PDF</h2>
        </div>
        <span>Processed on your device</span>
      </div>
      <p className="word-pdf-help">
        Download a PDF with selectable text, or print the preview. DOCX only; complex page layouts
        may differ. No uploads.
      </p>
      {(busy || building) && (
        <div className="word-pdf-progress" role="status">
          <LoaderCircle size={20} aria-hidden="true" />
          <span>{status || 'Preparing your document locally…'}</span>
          {building && progress > 0 && (
            <progress max="100" value={progress} aria-label="Conversion progress" />
          )}
          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={() => {
              conversion.current?.abort();
              generation.current++;
              setBusy(false);
              setBuilding(false);
              setStatus('');
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
      {pdf && url && (
        <div className="word-pdf-download">
          <div>
            <strong>{pdf.name}</strong>
            <small>
              {pdf.pages} {pdf.pages === 1 ? 'page' : 'pages'} · {formatBytes(pdf.blob.size)}
              {pdf.omittedImages
                ? ` · ${pdf.omittedImages} image${pdf.omittedImages === 1 ? '' : 's'} omitted`
                : ''}
            </small>
          </div>
          <a className="btn" href={url} download={pdf.name}>
            <Download size={17} aria-hidden="true" /> Download PDF
          </a>
        </div>
      )}
      {preview && (
        <>
          <div className="word-pdf-actions">
            <button className="btn btn-outline" type="button" disabled={!ready} onClick={print}>
              <Printer size={18} aria-hidden="true" />
              {ready ? 'Print preview' : 'Loading preview…'}
            </button>
            <span>
              Text stays selectable in both the download and the print output. Review before
              sharing.
            </span>
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
