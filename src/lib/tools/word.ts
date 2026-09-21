import createDOMPurify from 'dompurify';
import { DOCX_MAX_FILE_BYTES } from './word-archive';

export interface WordPreview {
  html: string;
  warnings: number;
  omittedImages: number;
}

export function convertWordLocally(file: File, signal: AbortSignal): Promise<WordPreview> {
  if (!/\.docx$/i.test(file.name))
    return Promise.reject(
      new Error('Choose a .docx file. Older .doc documents must be saved as DOCX first.'),
    );
  if (file.size > DOCX_MAX_FILE_BYTES)
    return Promise.reject(new Error('Choose a DOCX smaller than 25 MB.'));
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Cancelled', 'AbortError'));
      return;
    }
    const worker = new Worker(new URL('./word.worker.ts', import.meta.url), { type: 'module' });
    const dispose = () => {
      worker.terminate();
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
    };
    const fail = (error: Error) => {
      dispose();
      reject(error);
    };
    const cancel = () => fail(new DOMException('Cancelled', 'AbortError'));
    const timeout = setTimeout(
      () =>
        fail(new Error('This document took too long to convert. Try a smaller or simpler DOCX.')),
      45_000,
    );
    signal.addEventListener('abort', cancel, { once: true });
    worker.onmessage = (event: MessageEvent<WordPreview & { error?: string }>) => {
      dispose();
      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }
      resolve(event.data);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      fail(new Error('The document preview could not start. Reload the page and try again.'));
    };
    file
      .arrayBuffer()
      .then((buffer) => {
        if (!signal.aborted) worker.postMessage(buffer, [buffer]);
      })
      .catch(() => fail(new Error('This file could not be read. Select it again.')));
  });
}

export function wordPreviewDocument(html: string): string {
  const purifier = createDOMPurify(window);
  const safeRaster = /^data:image\/(png|jpeg|gif);base64,[a-z0-9+/=]+$/i;
  purifier.addHook('uponSanitizeAttribute', (_node, event) => {
    if (event.attrName === 'src' && !safeRaster.test(event.attrValue)) event.keepAttr = false;
  });
  const content = purifier.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'sup',
      'sub',
      'ul',
      'ol',
      'li',
      'blockquote',
      'pre',
      'code',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'img',
      'hr',
      'span',
    ],
    ALLOWED_ATTR: ['src', 'alt', 'colspan', 'rowspan', 'start'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    SANITIZE_NAMED_PROPS: true,
  });
  purifier.removeAllHooks();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'"><title>Document preview</title><style>
    *{box-sizing:border-box}html{background:#e7e8eb;color-scheme:light}body{margin:24px auto;padding:48px;width:min(100% - 32px,794px);min-height:600px;background:#fff;color:#17191c;font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.6;overflow-wrap:anywhere}h1,h2,h3,h4,h5,h6{line-height:1.25;break-after:avoid}h1{font-size:25pt}h2{font-size:19pt}h3{font-size:15pt}p{margin:0 0 12pt}img{max-width:100%;height:auto;object-fit:contain}img:not([src]),img[src=""]{display:none}table{width:100%;border-collapse:collapse;table-layout:fixed;margin:16pt 0}td,th{border:1px solid #c6c9ce;padding:7pt;vertical-align:top}th{background:#f0f1f3}tr{break-inside:avoid}blockquote{margin:16pt 0;padding-left:16pt;border-left:3px solid #adb2bb}pre{white-space:pre-wrap;font-size:9pt;background:#f5f5f5;padding:12pt}ul,ol{padding-left:22pt}li{margin-bottom:4pt}@page{size:A4;margin:18mm}@media(max-width:500px){body{padding:24px 20px;width:calc(100% - 16px);margin:8px auto}}@media print{html{background:#fff}body{width:auto;min-height:0;margin:0;padding:0}img{max-height:245mm;break-inside:avoid}p{orphans:3;widows:3}}
    </style></head><body>${content}</body></html>`;
}
