import { lazy, Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  Columns2,
  Crop,
  Download,
  FileImage,
  FileText,
  Files,
  ImageDown,
  Image as ImageIcon,
  Layers,
  ListOrdered,
  LockKeyhole,
  Minimize2,
  Monitor,
  RotateCw,
  Search,
  Scissors,
  Settings2,
  ShieldCheck,
  SplitSquareHorizontal,
  Stamp,
  Trash2,
  Upload,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { UTILITIES, type UtilityDefinition } from '../../shared/utilities';
import { EmptyState } from '../components/Layout';
import { Reveal } from '../components/Motion';
import { Select } from '../components/Select';
import {
  DEFAULT_OPTIONS,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  type UtilityId,
  type UtilityOptions,
  type UtilityResult,
} from '../lib/tools/types';
import './tools.css';

const WordToPdf = lazy(() => import('../components/tools/WordToPdf'));
const CropEditor = lazy(() => import('../components/tools/CropEditor'));
const icons: Record<UtilityId, LucideIcon> = {
  'compress-image': ImageDown,
  'convert-image': ImageIcon,
  'crop-image': Crop,
  'watermark-image': Stamp,
  'compress-pdf': Minimize2,
  'merge-pdf': Layers,
  'extract-pdf': Scissors,
  'remove-pdf-pages': Trash2,
  'reorder-pdf': ListOrdered,
  'split-pdf': SplitSquareHorizontal,
  'rotate-pdf': RotateCw,
  'pdf-to-images': FileImage,
  'images-to-pdf': Files,
  'pdf-to-word': FileText,
  'word-to-pdf': FileText,
};
const defaults = DEFAULT_OPTIONS;
/** Accepted input kind per tool, stated explicitly rather than guessed from the id. */
const inputKind: Record<UtilityId, 'image' | 'pdf' | 'docx'> = {
  'compress-image': 'image',
  'convert-image': 'image',
  'crop-image': 'image',
  'watermark-image': 'image',
  'images-to-pdf': 'image',
  'compress-pdf': 'pdf',
  'merge-pdf': 'pdf',
  'extract-pdf': 'pdf',
  'remove-pdf-pages': 'pdf',
  'reorder-pdf': 'pdf',
  'split-pdf': 'pdf',
  'rotate-pdf': 'pdf',
  'pdf-to-images': 'pdf',
  'pdf-to-word': 'pdf',
  'word-to-pdf': 'docx',
};
/** Tools whose input and output are both standalone images. */
const imageTools = new Set<UtilityId>([
  'compress-image',
  'convert-image',
  'crop-image',
  'watermark-image',
]);
const pageFieldLabels: Partial<
  Record<UtilityId, { label: string; hint: string; placeholder: string }>
> = {
  'extract-pdf': {
    label: 'Pages to keep',
    hint: 'Choose the pages to keep, or leave empty for all pages.',
    placeholder: 'e.g. 1-3, 5',
  },
  'remove-pdf-pages': {
    label: 'Pages to delete',
    hint: 'These pages are removed. At least one page must remain.',
    placeholder: 'e.g. 2, 5-7',
  },
  'reorder-pdf': {
    label: 'New page order',
    hint: 'List pages in your preferred order. Pages you leave out are added at the end.',
    placeholder: 'e.g. 3, 1, 2',
  },
};

export default function Tools() {
  const { toolId } = useParams();
  const [category, setCategory] = useState('All tools');
  const [search, setSearch] = useState('');
  const tool = UTILITIES.find((item) => item.id === toolId);
  if (toolId)
    return tool ? (
      <UtilityWorkbench key={tool.id} tool={tool} />
    ) : (
      <EmptyState
        title="Tool not found."
        text="Find a utility for your images and documents."
        link="/tools"
        label="Explore tools"
      />
    );
  const filtered = UTILITIES.filter(
    (item) =>
      (category === 'All tools' || category === item.category) &&
      (item.title + ' ' + item.description).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="container page tools-page">
      <section className="tools-hero">
        <div>
          <span className="eyebrow">THE ARTIFICIALS TOOLKIT</span>
          <h1>
            Smaller files.
            <br />
            <span>Less friction.</span>
          </h1>
          <p>
            Compress, convert, crop and organize. Fifteen thoughtful tools for the files you work
            with every day, all running on your own device.
          </p>
          <div className="tools-promises">
            <span>
              <LockKeyhole size={15} /> Files stay on your device
            </span>
            <span>
              <Zap size={15} /> Free to use
            </span>
            <span>
              <Monitor size={15} /> No account needed
            </span>
          </div>
        </div>
        <div className="tools-sculpture" aria-hidden="true">
          <div className="tools-orbit" />
          <div className="tools-glass tools-glass-back">
            <FileImage />
          </div>
          <div className="tools-glass tools-glass-front">
            <FileText />
            <span>LOCAL / PRIVATE</span>
          </div>
          <span className="tools-sculpture-label">LESS WEIGHT. MORE POSSIBILITY.</span>
        </div>
      </section>
      <div className="tools-toolbar">
        <div className="tools-tabs" aria-label="Filter tools">
          {['All tools', 'Images', 'PDF', 'Documents'].map((value) => (
            <button
              key={value}
              aria-pressed={category === value}
              className={category === value ? 'active' : ''}
              onClick={() => setCategory(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search tools"
            placeholder="Find a tool…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      <div className="tools-grid">
        {filtered.map((item, index) => {
          const Icon = icons[item.id];
          return (
            <Reveal key={item.id} from={index % 2 ? 'right' : 'left'}>
              <Link to={'/tools/' + item.id} className="tool-card">
                <div className="tool-card-top">
                  <span className="tool-icon">
                    <Icon size={25} strokeWidth={1.4} />
                  </span>
                  <span className="mono">{item.category}</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                <span className="tool-card-bottom">
                  Open tool <ArrowUpRight size={19} />
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
      {!filtered.length && (
        <EmptyState title="No matching tools." text="Try image, PDF, Word, or clear your search." />
      )}
      <section className="tools-privacy">
        <ShieldCheck size={32} strokeWidth={1.4} />
        <div>
          <h2>Your files. Your device.</h2>
          <p>
            File processing happens in your browser. We do not upload your files or send their names
            or contents to analytics. Clear the workspace when you finish. Downloads remain wherever
            you save them.
          </p>
          <Link to="/privacy">
            How privacy works <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      <section className="tools-faq">
        <h2>A few useful details.</h2>
        <details>
          <summary>Is everything free?</summary>
          <p>
            Yes. These utilities need no subscription or account. Your device performs the work, so
            there is no paid conversion API.
          </p>
        </details>
        <details>
          <summary>Will compression always make a file smaller?</summary>
          <p>
            No. Already optimized files may not shrink. You can compare the input and output sizes
            before downloading. Lossless PDF optimization preserves page appearance; image-based
            compression trades document features and some quality for potential size reduction.
          </p>
        </details>
        <details>
          <summary>How accurate are Word and PDF conversions?</summary>
          <p>
            PDF to Word exports selectable text into an editable DOCX and rebuilds bold, italic,
            type sizes and headings from the source fonts. Tables, columns, images and equations are
            not reconstructed. Word to PDF builds a downloadable PDF with selectable text, keeping
            headings, lists, tables and embedded images. Original fonts, headers and footers, and
            exact page breaks can differ. Review the result. Scanned PDF text needs OCR, which is
            not included.
          </p>
        </details>
        <details>
          <summary>Do my files leave my device?</summary>
          <p>
            No. Every tool runs in your browser, so your files are never uploaded. You can confirm
            this in your browser’s network panel: you will see the site’s own code loading, and no
            request carrying your file.
          </p>
        </details>
        <details>
          <summary>Which files can I process?</summary>
          <p>
            Use JPEG, PNG, WebP, PDF and DOCX. The limit is 25 MB per file, 60 MB per batch and up
            to 12 files. PDF page limits and device memory also apply. Password-protected documents
            and animated images are not supported.
          </p>
        </details>
      </section>
    </div>
  );
}

function UtilityWorkbench({ tool }: { tool: UtilityDefinition }) {
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<UtilityOptions>({
    ...defaults,
    imageFormat: tool.id === 'pdf-to-images' ? 'image/jpeg' : defaults.imageFormat,
  });
  const [results, setResults] = useState<UtilityResult[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [dragging, setDragging] = useState(false);
  const [zipping, setZipping] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const job = useRef(0);
  const terminateZip = useRef<(() => void) | null>(null);
  useEffect(
    () => () => {
      job.current++;
      controller.current?.abort();
      terminateZip.current?.();
    },
    [],
  );
  const Icon = icons[tool.id];
  const ordered = tool.id === 'merge-pdf' || tool.id === 'images-to-pdf';
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const outputTotal = results.reduce((sum, result) => sum + result.blob.size, 0);
  const changed = (next: Partial<UtilityOptions>) => {
    setOptions((old) => ({ ...old, ...next }));
    setResults([]);
    setError('');
    setStatus('');
  };
  function addFiles(chosen: File[]) {
    if (busy || zipping) return;
    const next = tool.multiple ? [...files, ...chosen] : chosen.slice(0, 1);
    if (!chosen.length) return;
    const kind = inputKind[tool.id];
    const extension =
      kind === 'image' ? /\.(jpe?g|png|webp)$/i : kind === 'docx' ? /\.docx$/i : /\.pdf$/i;
    if (chosen.some((file) => !extension.test(file.name))) {
      setError(`Choose ${tool.formats} files. Other formats are not supported by this tool.`);
      return;
    }
    if (next.length > MAX_FILES) {
      setError('Choose up to 12 files per batch.');
      return;
    }
    if (chosen.some((file) => !file.size || file.size > MAX_FILE_BYTES)) {
      setError('Each file must be non-empty and no larger than 25 MB.');
      return;
    }
    if (next.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
      setError('Keep the combined file size below 60 MB per batch.');
      return;
    }
    setFiles(next);
    setResults([]);
    setError('');
    setStatus('');
  }
  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files || []));
    event.target.value = '';
  };
  function cancel() {
    job.current++;
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setProgress(0);
    setStatus('Processing cancelled. Your original files are unchanged.');
  }
  function reset() {
    cancel();
    setFiles([]);
    setResults([]);
    setError('');
    setStatus('');
  }
  async function run() {
    if (!files.length || busy || zipping) return;
    if (tool.id === 'merge-pdf' && files.length < 2) {
      setError('Add at least two PDFs to merge.');
      return;
    }
    const current = ++job.current;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError('');
    setResults([]);
    setProgress(0);
    setStatus('Preparing your workspace…');
    const report = (amount: number, message: string) => {
      if (job.current === current) {
        setProgress(Math.min(100, Math.max(0, amount)));
        setStatus(message);
      }
    };
    try {
      // Image-only tools use the canvas engine; anything producing or reading a
      // PDF goes to the document engine. Driven by imageTools so adding a tool
      // cannot silently route to the wrong engine.
      const output = imageTools.has(tool.id)
        ? await (
            await import('../lib/tools/images')
          ).runImageTool(tool.id, files, options, report, abort.signal)
        : await (
            await import('../lib/tools/pdf')
          ).runPdfTool(tool.id, files, options, report, abort.signal);
      if (job.current !== current || abort.signal.aborted) return;
      if (output.reduce((sum, result) => sum + result.blob.size, 0) > 100 * 1024 * 1024)
        throw new Error('The results exceed 100 MB. Try fewer pages or a lower resolution.');
      setResults(output);
      setProgress(100);
      setStatus('Ready. Review your results, then download.');
    } catch (reason) {
      if (job.current === current && !abort.signal.aborted) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'This file could not be processed. Try another file.',
        );
        setStatus('');
      }
    } finally {
      if (job.current === current) {
        setBusy(false);
        controller.current = null;
      }
    }
  }
  async function downloadZip() {
    if (zipping || busy || !results.length) return;
    const current = job.current;
    setZipping(true);
    setError('');
    try {
      const { zip } = await import('fflate');
      const entries: Record<string, Uint8Array> = {};
      for (const [index, result] of results.entries())
        entries[`${String(index + 1).padStart(2, '0')}-${result.name}`] = new Uint8Array(
          await result.blob.arrayBuffer(),
        );
      if (job.current !== current) return;
      const bytes = await new Promise<Uint8Array>((resolve, reject) => {
        terminateZip.current = zip(entries, { level: 0 }, (failure, data) =>
          failure ? reject(failure) : resolve(data),
        );
      });
      terminateZip.current = null;
      if (job.current !== current) return;
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: 'application/zip' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'artificials-files.zip';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      if (job.current === current)
        setError('The archive could not be created. Download the files individually instead.');
    } finally {
      if (job.current === current) setZipping(false);
    }
  }
  return (
    <div className="container page tools-workbench">
      <Link to="/tools" className="text-link">
        <ArrowLeft size={16} /> All tools
      </Link>
      <div className="tool-heading">
        <span className="tool-icon">
          <Icon size={27} />
        </span>
        <div>
          <span className="eyebrow">{tool.category} / LOCAL WORKSPACE</span>
          <h1>{tool.title}</h1>
          <p>{tool.description}</p>
        </div>
      </div>
      <div className="tools-local-note">
        <LockKeyhole size={16} />
        <span>Processed on your device. No file uploads. No sign-in.</span>
      </div>
      <div className="tool-work-grid">
        <section className="tool-file-panel" aria-label="File workspace">
          <div
            className={`tools-dropzone${dragging ? ' is-dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault();
              if (!busy && !zipping) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(Array.from(event.dataTransfer.files));
            }}
          >
            <Upload size={32} strokeWidth={1.3} aria-hidden="true" />
            <h2>{files.length ? 'Add or replace files' : 'Give your files a fresh start.'}</h2>
            <p>Drop {tool.formats} here, or choose from your device.</p>
            <input
              ref={input}
              className="sr-only"
              type="file"
              accept={tool.accept}
              multiple={tool.multiple}
              onChange={selectFiles}
              tabIndex={-1}
              aria-label={`Choose ${tool.formats} files`}
              disabled={busy || zipping}
            />
            <button
              className="btn"
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy || zipping}
            >
              Choose {tool.multiple ? 'files' : 'a file'} <ArrowUpRight size={15} />
            </button>
            <small>
              25 MB per file ·{' '}
              {tool.multiple ? 'Up to 12 files, 60 MB combined' : 'One file at a time'}
            </small>
          </div>
          {files.length > 0 && (
            <div className="tools-file-list">
              <div className="tools-list-heading">
                <strong>
                  {files.length} {files.length === 1 ? 'file' : 'files'} · {formatBytes(total)}
                </strong>
                <button type="button" disabled={busy || zipping} onClick={reset}>
                  Clear workspace
                </button>
              </div>
              <ol>
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <FileText size={20} aria-hidden="true" />
                    <div className="tools-file-name">
                      <strong>{file.name}</strong>
                      <small>{formatBytes(file.size)}</small>
                    </div>
                    <div className="tools-file-actions">
                      {ordered && (
                        <>
                          <button
                            type="button"
                            disabled={busy || zipping || index === 0}
                            aria-label={`Move ${file.name} earlier`}
                            onClick={() => {
                              const next = [...files];
                              [next[index - 1], next[index]] = [next[index], next[index - 1]];
                              setFiles(next);
                              setResults([]);
                            }}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            disabled={busy || zipping || index === files.length - 1}
                            aria-label={`Move ${file.name} later`}
                            onClick={() => {
                              const next = [...files];
                              [next[index + 1], next[index]] = [next[index], next[index + 1]];
                              setFiles(next);
                              setResults([]);
                            }}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={busy || zipping}
                        aria-label={`Remove ${file.name}`}
                        onClick={() => {
                          setFiles(files.filter((_, i) => i !== index));
                          setResults([]);
                          setStatus('');
                        }}
                      >
                        <X size={17} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              {ordered && (
                <p className="tools-helper">
                  Files are combined from top to bottom. Use the arrows to change the order.
                </p>
              )}
            </div>
          )}
        </section>
        <aside className="tool-settings-panel">
          <h2>
            <Settings2 size={18} /> Your settings
          </h2>
          {tool.id === 'crop-image' && files[0] && (
            <Suspense
              fallback={
                <div className="loading-panel" role="status">
                  Loading crop editor…
                </div>
              }
            >
              <CropEditor
                file={files[0]}
                crop={options.crop}
                aspectRatio={options.aspectRatio}
                disabled={busy || zipping}
                onChange={(next) => changed(next)}
              />
            </Suspense>
          )}
          <fieldset disabled={busy || zipping} className="tool-settings">
            <legend className="sr-only">Conversion options</legend>
            {(tool.id === 'convert-image' || tool.id === 'pdf-to-images') && (
              <div className="tools-field">
                <label htmlFor="output-format">Output format</label>
                <Select
                  id="output-format"
                  aria-label="Output format"
                  value={options.imageFormat}
                  onValueChange={(value) =>
                    changed({ imageFormat: value as UtilityOptions['imageFormat'] })
                  }
                >
                  <option value="image/jpeg">JPEG · smaller photos</option>
                  <option value="image/png">PNG · lossless pixels</option>
                  {tool.id !== 'pdf-to-images' && (
                    <option value="image/webp">WebP · efficient web images</option>
                  )}
                </Select>
              </div>
            )}
            {(tool.id === 'compress-image' ||
              tool.id === 'convert-image' ||
              tool.id === 'crop-image') && (
              <div className="tools-field">
                <label htmlFor="max-dimension">Longest edge</label>
                <Select
                  id="max-dimension"
                  aria-label="Longest edge"
                  value={String(options.maxDimension)}
                  onValueChange={(value) => changed({ maxDimension: Number(value) })}
                >
                  <option value="0">Keep dimensions (up to 4096 px)</option>
                  <option value="4096">4096 px · large</option>
                  <option value="2048">2048 px · balanced</option>
                  <option value="1280">1280 px · compact</option>
                  <option value="800">800 px · small</option>
                </Select>
              </div>
            )}
            {tool.id === 'compress-pdf' && (
              <div className="tools-field">
                <label htmlFor="pdf-mode">Compression mode</label>
                <Select
                  id="pdf-mode"
                  aria-label="Compression mode"
                  value={options.pdfMode}
                  onValueChange={(value) =>
                    changed({ pdfMode: value as UtilityOptions['pdfMode'] })
                  }
                >
                  <option value="lossless">Lossless · preserve page content</option>
                  <option value="raster">Image-based · flatten pages</option>
                </Select>
              </div>
            )}
            {(tool.id === 'compress-image' ||
              tool.id === 'crop-image' ||
              tool.id === 'watermark-image' ||
              ((tool.id === 'convert-image' || tool.id === 'pdf-to-images') &&
                options.imageFormat !== 'image/png') ||
              (tool.id === 'compress-pdf' && options.pdfMode === 'raster')) && (
              <div className="tools-field">
                <label htmlFor="quality">
                  Image quality <span>{Math.round(options.quality * 100)}%</span>
                </label>
                <input
                  id="quality"
                  type="range"
                  min="40"
                  max="100"
                  step="1"
                  value={Math.round(options.quality * 100)}
                  onChange={(event) => changed({ quality: Number(event.target.value) / 100 })}
                />
                <small>
                  {tool.id === 'compress-image' ||
                  tool.id === 'crop-image' ||
                  tool.id === 'watermark-image'
                    ? 'Quality applies to JPEG and WebP. PNG keeps lossless pixels. The original format is preserved.'
                    : 'Higher quality keeps more detail and usually increases file size.'}
                </small>
              </div>
            )}
            {(tool.id === 'pdf-to-images' ||
              (tool.id === 'compress-pdf' && options.pdfMode === 'raster')) && (
              <div className="tools-field">
                <label htmlFor="resolution">Render resolution</label>
                <Select
                  id="resolution"
                  aria-label="Render resolution"
                  value={String(options.dpi)}
                  onValueChange={(value) => changed({ dpi: Number(value) })}
                >
                  <option value="96">96 DPI · smaller files</option>
                  <option value="144">144 DPI · balanced</option>
                  <option value="200">200 DPI · more detail</option>
                </Select>
              </div>
            )}
            {[
              'extract-pdf',
              'remove-pdf-pages',
              'reorder-pdf',
              'rotate-pdf',
              'pdf-to-images',
              'pdf-to-word',
            ].includes(tool.id) && (
              <div className="tools-field">
                <label htmlFor="page-range">{pageFieldLabels[tool.id]?.label ?? 'Pages'}</label>
                <input
                  id="page-range"
                  value={options.pages}
                  onChange={(event) => changed({ pages: event.target.value })}
                  placeholder={pageFieldLabels[tool.id]?.placeholder ?? 'e.g. 1-3, 5'}
                  maxLength={200}
                />
                <small>
                  Use page numbers and ranges.{' '}
                  {pageFieldLabels[tool.id]?.hint ?? 'Leave empty for all pages.'}
                </small>
              </div>
            )}
            {tool.id === 'split-pdf' && (
              <>
                <div className="tools-field">
                  <label htmlFor="split-mode">How to split</label>
                  <Select
                    id="split-mode"
                    aria-label="How to split"
                    value={options.splitMode}
                    onValueChange={(value) =>
                      changed({
                        splitMode: value as UtilityOptions['splitMode'],
                        splitValue: '',
                      })
                    }
                  >
                    <option value="each-page">One file per page</option>
                    <option value="every-n">Fixed number of pages</option>
                    <option value="at-pages">Split at chosen pages</option>
                  </Select>
                </div>
                {options.splitMode !== 'each-page' && (
                  <div className="tools-field">
                    <label htmlFor="split-value">
                      {options.splitMode === 'every-n' ? 'Pages per file' : 'Start a new file at'}
                    </label>
                    <input
                      id="split-value"
                      value={options.splitValue}
                      onChange={(event) => changed({ splitValue: event.target.value })}
                      placeholder={options.splitMode === 'every-n' ? 'e.g. 2' : 'e.g. 4, 9'}
                      maxLength={200}
                      inputMode="numeric"
                    />
                    <small>
                      {options.splitMode === 'every-n'
                        ? 'Each file holds this many pages; the last file holds what remains.'
                        : 'Each page you list begins a new document. Page 1 always starts the first.'}
                    </small>
                  </div>
                )}
              </>
            )}
            {tool.id === 'watermark-image' && (
              <>
                <div className="tools-field">
                  <label htmlFor="watermark-text">Watermark text</label>
                  <input
                    id="watermark-text"
                    value={options.watermarkText}
                    onChange={(event) => changed({ watermarkText: event.target.value })}
                    placeholder="e.g. Draft — Artificials"
                    maxLength={120}
                  />
                  <small>Up to 120 characters. Drawn into the pixels and not removable.</small>
                </div>
                <div className="tools-field">
                  <label htmlFor="watermark-position">Position</label>
                  <Select
                    id="watermark-position"
                    aria-label="Watermark position"
                    value={options.watermarkPosition}
                    onValueChange={(value) =>
                      changed({
                        watermarkPosition: value as UtilityOptions['watermarkPosition'],
                      })
                    }
                  >
                    <option value="bottom-right">Bottom right</option>
                    <option value="bottom-left">Bottom left</option>
                    <option value="top-right">Top right</option>
                    <option value="top-left">Top left</option>
                    <option value="center">Center</option>
                    <option value="tile">Tiled across the image</option>
                  </Select>
                </div>
                <div className="tools-field">
                  <label htmlFor="watermark-size">
                    Text size <span>{options.watermarkSize}% of image</span>
                  </label>
                  <input
                    id="watermark-size"
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={options.watermarkSize}
                    onChange={(event) => changed({ watermarkSize: Number(event.target.value) })}
                  />
                  <small>Size scales with each image, so a batch stays consistent.</small>
                </div>
                <div className="tools-field">
                  <label htmlFor="watermark-opacity">
                    Strength <span>{Math.round(options.watermarkOpacity * 100)}%</span>
                  </label>
                  <input
                    id="watermark-opacity"
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={Math.round(options.watermarkOpacity * 100)}
                    onChange={(event) =>
                      changed({ watermarkOpacity: Number(event.target.value) / 100 })
                    }
                  />
                </div>
              </>
            )}
            {tool.id === 'rotate-pdf' && (
              <div className="tools-field">
                <label htmlFor="rotation">Clockwise rotation</label>
                <Select
                  id="rotation"
                  aria-label="Clockwise rotation"
                  value={String(options.rotation)}
                  onValueChange={(value) =>
                    changed({ rotation: Number(value) as UtilityOptions['rotation'] })
                  }
                >
                  <option value="90">90° · quarter turn</option>
                  <option value="180">180° · half turn</option>
                  <option value="270">270° · three-quarter turn</option>
                </Select>
              </div>
            )}
            <p className="tools-format-note">{tool.note}</p>
            {tool.category !== 'Images' && tool.id !== 'word-to-pdf' && (
              <small className="tools-helper">
                Up to 120 pages for PDF edits; up to 40 selected pages for image or text export.
                Password-protected PDFs are not supported.
              </small>
            )}
          </fieldset>
          {tool.id !== 'word-to-pdf' && (
            <button
              type="button"
              className="btn tools-run"
              disabled={!files.length || busy || zipping}
              onClick={() => void run()}
            >
              {busy ? 'Processing…' : tool.action}
              <ArrowRight size={17} />
            </button>
          )}
          <p className="tools-helper">Your original files are never overwritten.</p>
        </aside>
      </div>
      {error && (
        <div className="tools-error" role="alert">
          {error}
        </div>
      )}
      {(busy || status) && (
        <div className="tools-progress">
          <div role="status" aria-live="polite">
            {!busy && results.length > 0 && <Check size={17} />}
            {status}
          </div>
          {busy && (
            <>
              <progress max="100" value={progress} aria-label="Processing progress" />
              <button type="button" onClick={cancel}>
                Cancel processing
              </button>
            </>
          )}
        </div>
      )}
      {tool.id === 'word-to-pdf' && files[0] && (
        <Suspense
          fallback={
            <div className="loading-panel" role="status">
              Preparing document preview…
            </div>
          }
        >
          <WordToPdf file={files[0]} />
        </Suspense>
      )}
      {results.length > 0 && (
        <section className="tools-results" aria-label="Processed files">
          <div className="tools-results-heading">
            <div>
              <span className="eyebrow">READY WHEN YOU ARE</span>
              <h2>Your files, refreshed.</h2>
              <p>
                {formatBytes(total)} input → {formatBytes(outputTotal)} output
                {tool.id.startsWith('compress-') &&
                  (outputTotal < total
                    ? ` · ${Math.round((1 - outputTotal / total) * 100)}% smaller`
                    : ' · No size reduction')}
              </p>
            </div>
            {results.length > 1 && (
              <button
                className="btn btn-outline"
                type="button"
                disabled={zipping}
                onClick={() => void downloadZip()}
              >
                <Download size={17} />
                {zipping ? 'Preparing ZIP…' : 'Download all as ZIP'}
              </button>
            )}
          </div>
          <div className="tools-result-grid">
            {results.map((result, index) => (
              <ResultCard
                key={`${index}-${result.name}`}
                result={result}
                // Per-image tools map one output to one input, so a before/after
                // comparison is meaningful. Merges and page exports do not.
                source={
                  results.length === files.length && result.blob.type.startsWith('image/')
                    ? files[index]
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}
      <div className="tools-work-bottom">
        <ShieldCheck size={18} />
        <p>
          Files are held temporarily in this tab. Clear the workspace or leave the page to release
          them. Downloads stay on your device. Check converted documents before sharing.
        </p>
      </div>
    </div>
  );
}

function ResultCard({ result, source }: { result: UtilityResult; source?: File }) {
  const [url, setUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [compare, setCompare] = useState(50);
  const [showCompare, setShowCompare] = useState(false);
  const isImage = result.blob.type.startsWith('image/');
  useEffect(() => {
    const next = URL.createObjectURL(result.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [result.blob]);
  useEffect(() => {
    if (!source || !source.type.startsWith('image/')) {
      setSourceUrl('');
      return;
    }
    const next = URL.createObjectURL(source);
    setSourceUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [source]);
  const comparable = Boolean(isImage && sourceUrl && url);
  const change =
    source && source.size > 0 ? Math.round((1 - result.blob.size / source.size) * 100) : null;
  return (
    <article className="tools-result-card">
      {isImage && url ? (
        showCompare && comparable ? (
          <div className="tools-compare">
            <div className="tools-compare-stage">
              <img src={sourceUrl} alt={`Original version of ${result.name}`} />
              <div className="tools-compare-after" style={{ width: `${compare}%` }}>
                <img src={url} alt={`Processed version of ${result.name}`} />
              </div>
              <span
                className="tools-compare-divider"
                style={{ left: `${compare}%` }}
                aria-hidden="true"
              />
              <span className="tools-compare-tag tools-compare-tag-before">Before</span>
              <span className="tools-compare-tag tools-compare-tag-after">After</span>
            </div>
            <label className="sr-only" htmlFor={`compare-${result.name}`}>
              Reveal the processed image for {result.name}
            </label>
            <input
              id={`compare-${result.name}`}
              type="range"
              min="0"
              max="100"
              step="1"
              value={compare}
              onChange={(event) => setCompare(Number(event.target.value))}
            />
          </div>
        ) : (
          <img src={url} alt={`Processed preview of ${result.name}`} />
        )
      ) : (
        <div className="tools-document-icon">
          <FileText size={32} strokeWidth={1.3} />
        </div>
      )}
      {comparable && (
        <button
          type="button"
          className="tools-compare-toggle"
          aria-pressed={showCompare}
          onClick={() => setShowCompare((value) => !value)}
        >
          <Columns2 size={14} aria-hidden="true" />
          {showCompare ? 'Hide comparison' : 'Compare with original'}
        </button>
      )}
      <h3>{result.name}</h3>
      <small>
        {formatBytes(result.blob.size)}
        {source && change !== null && change > 0 ? ` · ${change}% smaller` : ''}
        {source && change !== null && change <= 0 ? ` · from ${formatBytes(source.size)}` : ''}
      </small>
      {result.detail && <p>{result.detail}</p>}
      <a
        className="btn btn-outline"
        href={url || undefined}
        download={result.name}
        aria-disabled={!url}
      >
        <Download size={16} /> Download
      </a>
    </article>
  );
}

function formatBytes(value: number) {
  return value >= 1024 * 1024
    ? `${(value / (1024 * 1024)).toFixed(2)} MB`
    : `${(value / 1024).toFixed(1)} KB`;
}
