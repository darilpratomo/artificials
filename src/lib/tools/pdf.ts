import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocument } from 'pdf-lib';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { decodeImage, inspectImage } from './images';
import {
  checkCancelled,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  outputName,
  type ProgressReporter,
  type UtilityId,
  type UtilityOptions,
  type UtilityResult,
} from './types';

export const MAX_PDF_PAGES = 120;
export const MAX_RENDER_PAGES = 40;
const MAX_CANVAS_PIXELS = 6_000_000;
const MAX_CANVAS_EDGE = 4096;
const MAX_OUTPUT_BYTES = 100 * 1024 * 1024;
const MAX_TEXT_CHARACTERS = 500_000;

// Build-owned font/CMap assets keep document processing local. A PDF cannot
// supply a resource URL: the factory resolves only names present in this map.
const pdfResources = import.meta.glob<string>(
  [
    '/node_modules/pdfjs-dist/cmaps/*.bcmap',
    '/node_modules/pdfjs-dist/standard_fonts/*.pfb',
    '/node_modules/pdfjs-dist/standard_fonts/*.ttf',
  ],
  { eager: true, query: '?url', import: 'default' },
);

class LocalPdfResources {
  async fetch({ kind, filename }: { kind: string; filename: string }) {
    const directory =
      kind === 'cMapUrl' ? 'cmaps' : kind === 'standardFontDataUrl' ? 'standard_fonts' : null;
    if (!directory || !/^[a-zA-Z0-9_.-]+$/.test(filename)) {
      throw new Error('This PDF requires an unsupported external resource.');
    }
    const url = pdfResources[`/node_modules/pdfjs-dist/${directory}/${filename}`];
    if (!url) throw new Error('A required font or character map is not available locally.');
    const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('A local PDF font could not be loaded. Please try again.');
    return new Uint8Array(await response.arrayBuffer());
  }
}

/** One-based input, zero-based output, preserving the chosen order without duplicates. */
export function parsePdfPages(value: string, pageCount: number): number[] {
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > MAX_PDF_PAGES) {
    throw new Error(`Use a PDF containing 1–${MAX_PDF_PAGES} pages.`);
  }
  if (!value.trim()) return Array.from({ length: pageCount }, (_, index) => index);
  if (value.length > 1000) throw new Error('The page selection is too long.');
  const pages = new Set<number>();
  for (const part of value.split(',')) {
    const match = /^(\d+)\s*(?:-\s*(\d+))?$/.exec(part.trim());
    if (!match) throw new Error('Enter page numbers such as 1–3, 5 using a hyphen for ranges.');
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start < 1 ||
      end < start ||
      end > pageCount
    ) {
      throw new Error(`Choose ascending page ranges between 1 and ${pageCount}.`);
    }
    for (let page = start; page <= end; page += 1) pages.add(page - 1);
  }
  return [...pages];
}

function asBlob(bytes: Uint8Array, type = 'application/pdf') {
  if (bytes.byteLength > MAX_OUTPUT_BYTES)
    throw new Error('The output exceeds the 100 MB browser safety limit. Try fewer pages.');
  return new Blob([Uint8Array.from(bytes).buffer], { type });
}

async function yieldToBrowser(signal: AbortSignal) {
  checkCancelled(signal);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  checkCancelled(signal);
}

async function readPdf(file: File, signal: AbortSignal, maxPages = MAX_PDF_PAGES) {
  checkCancelled(signal);
  const bytes = new Uint8Array(await file.arrayBuffer());
  checkCancelled(signal);
  if (!new TextDecoder('ascii').decode(bytes.subarray(0, 1024)).includes('%PDF-')) {
    throw new Error(`${file.name} is not a valid PDF file.`);
  }
  const { PDFDocument } = await import('pdf-lib');
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(bytes, { updateMetadata: false, throwOnInvalidObject: true });
  } catch (error) {
    if (error instanceof Error && /encrypt|password/i.test(error.message)) {
      throw new Error(
        'Password-protected or encrypted PDFs are not supported. Unlock a copy in your PDF application first.',
      );
    }
    throw new Error(`${file.name} could not be read. Try a valid, undamaged PDF.`);
  }
  if (document.isEncrypted)
    throw new Error('Encrypted PDFs are not supported. Unlock a copy first.');
  const count = document.getPageCount();
  if (count < 1 || count > maxPages)
    throw new Error(`This tool supports PDFs with 1–${maxPages} pages per job.`);
  checkCancelled(signal);
  return { bytes, document };
}

async function withRenderedPdf<T>(
  file: File,
  signal: AbortSignal,
  run: (pdf: PDFDocumentProxy) => Promise<T>,
): Promise<T> {
  // pdf-lib explicitly rejects encryption, including PDFs that allow opening
  // with an empty user password. PDF.js otherwise silently accepts those.
  const { bytes } = await readPdf(file, signal);
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const settings = {
    data: bytes,
    isEvalSupported: false,
    enableXfa: false,
    useWasm: false,
    useWorkerFetch: false,
    BinaryDataFactory: LocalPdfResources,
    disableAutoFetch: true,
    disableStream: true,
    disableRange: true,
    stopAtErrors: true,
    useSystemFonts: true,
    maxImageSize: 40_000_000,
    canvasMaxAreaInBytes: MAX_CANVAS_PIXELS * 4,
    verbosity: 0,
  };
  const task = pdfjs.getDocument(settings);
  let encrypted = false;
  task.onPassword = () => {
    encrypted = true;
    void task.destroy().catch(() => undefined);
  };
  const abort = () => {
    void task.destroy().catch(() => undefined);
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    checkCancelled(signal);
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PDF_PAGES)
      throw new Error(`Use a PDF with no more than ${MAX_PDF_PAGES} pages.`);
    return await run(pdf);
  } catch (error) {
    checkCancelled(signal);
    if (encrypted)
      throw new Error('Password-protected PDFs are not supported. Unlock a copy first.');
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
    await task.destroy().catch(() => undefined);
  }
}

function renderedPages(options: UtilityOptions, total: number) {
  const pages = parsePdfPages(options.pages, total);
  if (pages.length > MAX_RENDER_PAGES)
    throw new Error(`Select up to ${MAX_RENDER_PAGES} pages for this tool.`);
  return pages;
}

function rasterSize(width: number, height: number, scale = 1) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('This document contains an invalid page or image size.');
  }
  const fit = Math.min(
    scale,
    MAX_CANVAS_EDGE / width,
    MAX_CANVAS_EDGE / height,
    Math.sqrt(MAX_CANVAS_PIXELS / width / height),
  );
  return {
    width: Math.max(1, Math.floor(width * fit)),
    height: Math.max(1, Math.floor(height * fit)),
    scale: fit,
  };
}

function canvasBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg', quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('The browser could not encode this page. Try a lower resolution.')),
      type,
      quality,
    ),
  );
}

async function renderPage(
  page: PDFPageProxy,
  options: UtilityOptions,
  type: 'image/png' | 'image/jpeg',
  signal: AbortSignal,
) {
  checkCancelled(signal);
  const base = page.getViewport({ scale: 1 });
  const dimensions = rasterSize(
    base.width,
    base.height,
    Math.min(200, Math.max(72, options.dpi)) / 72,
  );
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  let abort: (() => void) | undefined;
  try {
    const render = page.render({
      canvas,
      viewport: page.getViewport({ scale: dimensions.scale }),
      background: '#ffffff',
    });
    abort = () => render.cancel();
    signal.addEventListener('abort', abort, { once: true });
    await render.promise;
    checkCancelled(signal);
    const blob = await canvasBlob(canvas, type, Math.min(1, Math.max(0.35, options.quality)));
    checkCancelled(signal);
    return { blob, width: base.width, height: base.height };
  } finally {
    if (abort) signal.removeEventListener('abort', abort);
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
  }
}

async function savePdf(document: PDFDocument, signal: AbortSignal) {
  checkCancelled(signal);
  const bytes = await document.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 30,
  });
  checkCancelled(signal);
  return asBlob(bytes);
}

/** Pages to keep after removing a selection, refusing to empty the document. */
export function remainingPages(remove: string, pageCount: number): number[] {
  if (!remove.trim()) throw new Error('Enter the pages to delete, such as 2, 5-7.');
  const dropped = new Set(parsePdfPages(remove, pageCount));
  const kept = Array.from({ length: pageCount }, (_, index) => index).filter(
    (index) => !dropped.has(index),
  );
  if (!kept.length)
    throw new Error('This would delete every page. Keep at least one page in the document.');
  return kept;
}

/**
 * The requested order first, then any unlisted pages in their original order,
 * so a partial list never silently discards the rest of the document.
 */
export function reorderedPages(order: string, pageCount: number): number[] {
  if (!order.trim()) throw new Error('Enter the page order, such as 3, 1, 2.');
  const requested = parsePdfPages(order, pageCount);
  const seen = new Set(requested);
  const remainder = Array.from({ length: pageCount }, (_, index) => index).filter(
    (index) => !seen.has(index),
  );
  return [...requested, ...remainder];
}

/** Contiguous page groups for splitting, each group becoming one output PDF. */
export function splitGroups(
  mode: UtilityOptions['splitMode'],
  value: string,
  pageCount: number,
): number[][] {
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error('Use a valid PDF.');
  if (mode === 'each-page') return Array.from({ length: pageCount }, (_, index) => [index]);
  if (mode === 'every-n') {
    const size = Number(value.trim());
    if (!Number.isSafeInteger(size) || size < 1 || size >= pageCount)
      throw new Error(
        `Enter a group size between 1 and ${pageCount - 1} pages. A larger size would produce one unchanged file.`,
      );
    const groups: number[][] = [];
    for (let start = 0; start < pageCount; start += size)
      groups.push(
        Array.from({ length: Math.min(size, pageCount - start) }, (_, index) => start + index),
      );
    return groups;
  }
  // 'at-pages': each listed page starts a new document.
  if (!value.trim())
    throw new Error('Enter the page numbers where a new document should start, such as 4, 9.');
  if (value.length > 1000) throw new Error('The split selection is too long.');
  const starts = new Set<number>([0]);
  for (const part of value.split(',')) {
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) throw new Error('Enter single page numbers, such as 4, 9.');
    const page = Number(trimmed);
    if (!Number.isSafeInteger(page) || page < 2 || page > pageCount)
      throw new Error(`Choose split points between 2 and ${pageCount}.`);
    starts.add(page - 1);
  }
  const boundaries = [...starts].sort((a, b) => a - b);
  if (boundaries.length < 2)
    throw new Error('Add at least one split point after page 1 to divide the document.');
  return boundaries.map((start, index) =>
    Array.from(
      { length: (boundaries[index + 1] ?? pageCount) - start },
      (_, offset) => start + offset,
    ),
  );
}

async function structuralPdf(
  id: UtilityId,
  files: File[],
  options: UtilityOptions,
  report: ProgressReporter,
  signal: AbortSignal,
): Promise<UtilityResult[]> {
  const { PDFDocument, degrees } = await import('pdf-lib');
  if (id === 'merge-pdf') {
    const output = await PDFDocument.create();
    for (let index = 0; index < files.length; index += 1) {
      report(5 + (index / files.length) * 80, `Adding PDF ${index + 1} of ${files.length}…`);
      const { document: input } = await readPdf(files[index], signal);
      if (output.getPageCount() + input.getPageCount() > MAX_PDF_PAGES)
        throw new Error(`The merged PDF must contain no more than ${MAX_PDF_PAGES} pages.`);
      const pages = await output.copyPages(input, input.getPageIndices());
      for (const page of pages) output.addPage(page);
      await yieldToBrowser(signal);
    }
    return [
      {
        name: 'artificials-merged.pdf',
        blob: await savePdf(output, signal),
        detail: `${output.getPageCount()} pages, in the file order shown. Document-level bookmarks and interactive forms may not carry over; review the result.`,
      },
    ];
  }
  const file = files[0];
  const { document: input } = await readPdf(file, signal);
  report(35, 'Processing PDF pages…');
  if (id === 'compress-pdf') {
    const blob = await savePdf(input, signal);
    const smaller = blob.size < file.size;
    return [
      {
        name: outputName(file.name, smaller ? 'optimized' : 'original', 'pdf'),
        blob: smaller ? blob : file,
        detail: smaller
          ? 'Lossless structural optimization. Text and image pixels are preserved; digital signatures are invalidated by any rewrite.'
          : 'This PDF is already compact. Your original file is returned without increasing its size.',
      },
    ];
  }
  const pages =
    id === 'remove-pdf-pages' || id === 'reorder-pdf' || id === 'split-pdf'
      ? []
      : parsePdfPages(options.pages, input.getPageCount());
  if (id === 'rotate-pdf') {
    if (![90, 180, 270].includes(options.rotation))
      throw new Error('Choose a rotation of 90°, 180° or 270°.');
    for (const index of pages) {
      const page = input.getPage(index);
      page.setRotation(degrees((page.getRotation().angle + options.rotation) % 360));
    }
    return [
      {
        name: outputName(file.name, 'rotated', 'pdf'),
        blob: await savePdf(input, signal),
        detail: `${pages.length} pages rotated clockwise by ${options.rotation}°. Other pages keep their original orientation.`,
      },
    ];
  }
  if (id === 'split-pdf') {
    const groups = splitGroups(options.splitMode, options.splitValue, input.getPageCount());
    if (groups.length < 2)
      throw new Error('These settings produce a single document. Choose a smaller group size.');
    if (groups.length > MAX_FILES * 4)
      throw new Error(`Splitting would create ${groups.length} files. Use larger groups.`);
    const results: UtilityResult[] = [];
    for (const [index, group] of groups.entries()) {
      report(
        35 + (index / groups.length) * 55,
        `Building document ${index + 1} of ${groups.length}…`,
      );
      const part = await PDFDocument.create();
      for (const page of await part.copyPages(input, group)) part.addPage(page);
      const first = group[0] + 1;
      const last = group.at(-1)! + 1;
      results.push({
        name: outputName(
          file.name,
          `part-${String(index + 1).padStart(2, '0')}-pages-${first}${last === first ? '' : `-to-${last}`}`,
          'pdf',
        ),
        blob: await savePdf(part, signal),
        detail: `${group.length} ${group.length === 1 ? 'page' : 'pages'} (source ${last === first ? `page ${first}` : `pages ${first}–${last}`}). Text stays selectable; bookmarks and forms may not carry over.`,
      });
      await yieldToBrowser(signal);
    }
    return results;
  }
  const selection =
    id === 'remove-pdf-pages'
      ? remainingPages(options.pages, input.getPageCount())
      : id === 'reorder-pdf'
        ? reorderedPages(options.pages, input.getPageCount())
        : pages;
  const output = await PDFDocument.create();
  const copies = await output.copyPages(input, selection);
  for (const page of copies) output.addPage(page);
  const suffix =
    id === 'remove-pdf-pages' ? 'pages-removed' : id === 'reorder-pdf' ? 'reordered' : 'extracted';
  const detail =
    id === 'remove-pdf-pages'
      ? `${input.getPageCount() - selection.length} page(s) removed; ${selection.length} kept. Text stays selectable. Bookmarks and interactive forms may not carry over.`
      : id === 'reorder-pdf'
        ? `${selection.length} pages in the order you chose. Pages you did not list keep their original order at the end. Text stays selectable.`
        : `${selection.length} selected pages. Bookmarks and interactive forms may not carry over; review the result.`;
  return [
    {
      name: outputName(file.name, suffix, 'pdf'),
      blob: await savePdf(output, signal),
      detail,
    },
  ];
}

async function rasterPdf(
  id: UtilityId,
  file: File,
  options: UtilityOptions,
  report: ProgressReporter,
  signal: AbortSignal,
): Promise<UtilityResult[]> {
  return withRenderedPdf(file, signal, async (pdf) => {
    // Compression always preserves the full page set; ranges apply to exports.
    const indices = renderedPages(
      id === 'compress-pdf' ? { ...options, pages: '' } : options,
      pdf.numPages,
    );
    const output =
      id === 'compress-pdf' ? await (await import('pdf-lib')).PDFDocument.create() : null;
    const results: UtilityResult[] = [];
    let outputBytes = 0;
    for (let position = 0; position < indices.length; position += 1) {
      await yieldToBrowser(signal);
      const number = indices[position] + 1;
      report(
        10 + (position / indices.length) * 80,
        `Rendering page ${number} (${position + 1} of ${indices.length})…`,
      );
      const type = output || options.imageFormat !== 'image/png' ? 'image/jpeg' : 'image/png';
      const { blob, width, height } = await renderPage(
        await pdf.getPage(number),
        options,
        type,
        signal,
      );
      outputBytes += blob.size;
      if (outputBytes > MAX_OUTPUT_BYTES)
        throw new Error('The images exceed 100 MB. Select fewer pages or a lower resolution.');
      if (output) {
        const image = await output.embedJpg(await blob.arrayBuffer());
        output.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
      } else {
        results.push({
          name: outputName(
            file.name,
            `page-${String(number).padStart(3, '0')}`,
            type === 'image/png' ? 'png' : 'jpg',
          ),
          blob,
          detail: `Page ${number}; rendered locally with a white background. Resolution is capped at 6 megapixels per page.`,
        });
      }
    }
    if (output) {
      const blob = await savePdf(output, signal);
      const smaller = blob.size < file.size;
      return [
        {
          name: outputName(file.name, smaller ? 'compressed' : 'original', 'pdf'),
          blob: smaller ? blob : file,
          detail: smaller
            ? 'Pages are now images. Searchable text, links, forms, bookmarks, accessibility tags and signatures are not preserved. Keep your original PDF.'
            : 'Image compression did not reduce the size. Your original PDF is returned with its original features preserved.',
        },
      ];
    }
    return results;
  });
}

async function imagesToPdf(
  files: File[],
  report: ProgressReporter,
  signal: AbortSignal,
): Promise<UtilityResult[]> {
  const { PDFDocument } = await import('pdf-lib');
  const output = await PDFDocument.create();
  let embeddedBytes = 0;
  for (let index = 0; index < files.length; index += 1) {
    checkCancelled(signal);
    report(5 + (index / files.length) * 80, `Adding image ${index + 1} of ${files.length}…`);
    const info = await inspectImage(files[index], signal);
    const decoded = await decodeImage(files[index], signal);
    const canvas = document.createElement('canvas');
    try {
      const size = rasterSize(decoded.width, decoded.height);
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not allocate an image canvas.');
      const type = info.mime === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      if (type === 'image/jpeg') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, size.width, size.height);
      }
      context.drawImage(decoded.source, 0, 0, size.width, size.height);
      const blob = await canvasBlob(canvas, type, 0.94);
      embeddedBytes += blob.size;
      if (embeddedBytes > MAX_OUTPUT_BYTES)
        throw new Error('The PDF images exceed 100 MB. Use fewer or smaller images.');
      checkCancelled(signal);
      const bytes = await blob.arrayBuffer();
      const image =
        type === 'image/jpeg' ? await output.embedJpg(bytes) : await output.embedPng(bytes);
      // A4 page with a modest margin, matching the image orientation.
      const landscape = size.width > size.height;
      const pageWidth = landscape ? 841.89 : 595.28;
      const pageHeight = landscape ? 595.28 : 841.89;
      const fit = Math.min((pageWidth - 48) / size.width, (pageHeight - 48) / size.height);
      const width = size.width * fit;
      const height = size.height * fit;
      output.addPage([pageWidth, pageHeight]).drawImage(image, {
        x: (pageWidth - width) / 2,
        y: (pageHeight - height) / 2,
        width,
        height,
      });
    } finally {
      decoded.dispose();
      canvas.width = 0;
      canvas.height = 0;
    }
    await yieldToBrowser(signal);
  }
  return [
    {
      name: 'artificials-images.pdf',
      blob: await savePdf(output, signal),
      detail: `${files.length} images on A4 pages in the order shown. Images are fitted without cropping, with a 6 megapixel limit per image.`,
    },
  ];
}

interface StyledSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  size: number;
}

interface ExtractedLine {
  spans: StyledSpan[];
  size: number;
  bold: boolean;
  centered: boolean;
  indent: number;
  gapBefore: number;
}

const BOLD_FONT = /bold|black|heavy|semibold|demibold|extrabold|ultrabold|[-_,]bd\b/i;
const ITALIC_FONT = /italic|oblique|[-_,]it\b/i;
const BULLET_LINE = /^\s*[\u2022\u2023\u25aa\u25cf\u25e6\u2043\u2219*\u00b7-]\s+/;
const NUMBERED_LINE = /^\s*(\d{1,3}|[a-z]|[ivxl]{1,5})\s*[.)]\s+/i;

/** PDF has no semantic styling, so weight and slant come from the embedded font name. */
export function fontStyleFlags(fontName: string, fontFamily?: string) {
  const name = `${fontName} ${fontFamily ?? ''}`;
  return { bold: BOLD_FONT.test(name), italic: ITALIC_FONT.test(name) };
}

/**
 * Headings are inferred from type size relative to the document's dominant body
 * size. Without that comparison a 12pt body would read as a heading in one
 * document and as body text in another.
 */
export function headingLevelForSize(size: number, bodySize: number, bold: boolean) {
  if (bodySize <= 0) return undefined;
  const ratio = size / bodySize;
  if (ratio >= 1.8) return 1 as const;
  if (ratio >= 1.45) return 2 as const;
  if (ratio >= 1.2) return 3 as const;
  if (ratio >= 1.08 && bold) return 4 as const;
  return undefined;
}

/** The most common rounded glyph height, weighted by how much text uses it. */
export function dominantTextSize(sizes: Map<number, number>) {
  let best = 0;
  let bestWeight = 0;
  for (const [size, weight] of sizes) {
    if (weight > bestWeight || (weight === bestWeight && size < best)) {
      best = size;
      bestWeight = weight;
    }
  }
  return best;
}

function appendSpan(spans: StyledSpan[], span: StyledSpan) {
  const last = spans.at(-1);
  if (last && last.bold === span.bold && last.italic === span.italic && last.size === span.size) {
    last.text += span.text;
    return;
  }
  spans.push({ ...span });
}

function lineFromSpans(
  spans: StyledSpan[],
  left: number,
  right: number,
  pageWidth: number,
  gapBefore: number,
): ExtractedLine | null {
  const joined = spans.map((span) => span.text).join('');
  if (!joined.trim()) return null;
  const trimmed: StyledSpan[] = [];
  for (const span of spans) if (span.text) appendSpan(trimmed, span);
  if (trimmed.length) {
    trimmed[0] = { ...trimmed[0], text: trimmed[0].text.replace(/^\s+/, '') };
    const last = trimmed.length - 1;
    trimmed[last] = { ...trimmed[last], text: trimmed[last].text.replace(/\s+$/, '') };
  }
  const visible = trimmed.filter((span) => span.text);
  if (!visible.length) return null;
  let weighted = 0;
  let boldWeight = 0;
  let characters = 0;
  for (const span of visible) {
    const length = span.text.trim().length || span.text.length;
    weighted += span.size * length;
    if (span.bold) boldWeight += length;
    characters += length;
  }
  const size = characters ? Math.round((weighted / characters) * 10) / 10 : 0;
  // A centered line has comparable margins on both sides and does not fill the column.
  const leftMargin = left;
  const rightMargin = Math.max(0, pageWidth - right);
  const centered =
    pageWidth > 0 &&
    leftMargin > pageWidth * 0.12 &&
    rightMargin > pageWidth * 0.12 &&
    Math.abs(leftMargin - rightMargin) < pageWidth * 0.08;
  return {
    spans: visible,
    size,
    bold: characters > 0 && boldWeight / characters > 0.6,
    centered,
    indent: centered ? 0 : leftMargin,
    gapBefore,
  };
}

/** Group text items into visual lines, keeping per-run weight, slant and size. */
async function extractPageLines(
  page: PDFPageProxy,
  onCharacters: (count: number) => void,
): Promise<ExtractedLine[]> {
  const content = await page.getTextContent();
  const pageWidth = page.getViewport({ scale: 1 }).width;
  const lines: ExtractedLine[] = [];
  let spans: StyledSpan[] = [];
  let baseline: number | undefined;
  let previousBaseline: number | undefined;
  let left = Number.POSITIVE_INFINITY;
  let right = 0;
  let lineSize = 0;
  const flush = () => {
    if (spans.length) {
      const gap =
        previousBaseline !== undefined && baseline !== undefined
          ? Math.max(0, previousBaseline - baseline)
          : 0;
      const line = lineFromSpans(spans, left, right, pageWidth, gap);
      if (line) {
        lines.push(line);
        previousBaseline = baseline;
      }
    }
    spans = [];
    baseline = undefined;
    left = Number.POSITIVE_INFINITY;
    right = 0;
    lineSize = 0;
  };
  for (const item of content.items) {
    if (!('str' in item)) continue;
    const text = item.str.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    const y = item.transform[5];
    const x = item.transform[4];
    // Glyph height is the reliable size signal; item.height can be zero for some fonts.
    const size =
      Math.abs(item.transform[3]) || Math.abs(item.height) || Math.abs(item.transform[0]) || 0;
    const threshold = Math.max(2.5, (lineSize || size) * 0.45);
    if (baseline !== undefined && Math.abs(y - baseline) > threshold) flush();
    if (text) {
      const style = content.styles?.[item.fontName];
      const flags = fontStyleFlags(item.fontName ?? '', style?.fontFamily);
      // PDF.js already emits whitespace for real gaps. A text-item boundary can be
      // a font change inside a word, so adding a space here would split "Hello".
      appendSpan(spans, {
        text,
        bold: flags.bold,
        italic: flags.italic,
        size: Math.round(size * 10) / 10,
      });
      left = Math.min(left, x);
      right = Math.max(right, x + (Number.isFinite(item.width) ? item.width : 0));
      lineSize = Math.max(lineSize, size);
      onCharacters(text.length);
    }
    baseline = y;
    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

async function pdfToWord(
  file: File,
  options: UtilityOptions,
  report: ProgressReporter,
  signal: AbortSignal,
): Promise<UtilityResult[]> {
  return withRenderedPdf(file, signal, async (pdf) => {
    const { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } =
      await import('docx');
    const pages = renderedPages(options, pdf.numPages);
    const extracted: { page: number; lines: ExtractedLine[] }[] = [];
    const sizes = new Map<number, number>();
    let characters = 0;
    for (let position = 0; position < pages.length; position += 1) {
      await yieldToBrowser(signal);
      report(
        10 + (position / pages.length) * 60,
        `Extracting text from page ${pages[position] + 1}…`,
      );
      const page = await pdf.getPage(pages[position] + 1);
      try {
        const lines = await extractPageLines(page, (count) => {
          characters += count;
          if (characters > MAX_TEXT_CHARACTERS)
            throw new Error(
              'This PDF contains too much text for one browser export. Select fewer pages.',
            );
        });
        for (const line of lines) {
          const length = line.spans.reduce((sum, span) => sum + span.text.trim().length, 0);
          sizes.set(line.size, (sizes.get(line.size) ?? 0) + length);
        }
        extracted.push({ page: pages[position] + 1, lines });
      } finally {
        page.cleanup();
      }
    }
    if (!characters)
      throw new Error(
        'No extractable text was found. This PDF may be scanned or image-only. OCR is not included; try PDF to images instead.',
      );
    checkCancelled(signal);
    report(75, 'Rebuilding headings and emphasis…');
    const bodySize = dominantTextSize(sizes);
    const headings = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
    } as const;
    const paragraphs: InstanceType<typeof Paragraph>[] = [];
    let emptyPages = 0;
    let headingCount = 0;
    let listCount = 0;
    for (const [position, entry] of extracted.entries()) {
      const pageBreak = position > 0;
      if (!entry.lines.length) {
        emptyPages += 1;
        paragraphs.push(
          new Paragraph({
            text: '[No extractable text on this page]',
            pageBreakBefore: pageBreak,
          }),
        );
        continue;
      }
      for (const [index, line] of entry.lines.entries()) {
        const plain = line.spans.map((span) => span.text).join('');
        const level = headingLevelForSize(line.size, bodySize, line.bold);
        const bullet = BULLET_LINE.test(plain);
        const numbered = !bullet && NUMBERED_LINE.test(plain);
        if (level) headingCount += 1;
        if (bullet || numbered) listCount += 1;
        const text = bullet ? plain.replace(BULLET_LINE, '') : plain;
        const spans = bullet ? [{ ...line.spans[0], text }] : line.spans;
        const runs = spans
          .filter((span) => span.text)
          .map(
            (span) =>
              new TextRun({
                text: span.text,
                bold: level ? undefined : span.bold,
                italics: span.italic,
                font: level ? undefined : 'Arial',
                size: level ? undefined : Math.max(14, Math.min(48, Math.round(span.size * 2))),
              }),
          );
        paragraphs.push(
          new Paragraph({
            children: runs.length ? runs : [new TextRun({ text: plain, font: 'Arial', size: 22 })],
            heading: level ? headings[level] : undefined,
            alignment: line.centered ? AlignmentType.CENTER : undefined,
            bullet: bullet ? { level: 0 } : undefined,
            pageBreakBefore: pageBreak && index === 0,
            // A wide vertical gap in the source reads as paragraph separation.
            spacing: { after: level ? 120 : line.gapBefore > line.size * 1.8 ? 200 : 100 },
            indent:
              !bullet && !line.centered && line.indent > 54
                ? { left: Math.min(1440, Math.round((line.indent - 36) * 20)) }
                : undefined,
          }),
        );
      }
    }
    checkCancelled(signal);
    report(90, 'Creating the editable Word document…');
    const document = new Document({
      title: file.name.replace(/\.pdf$/i, ''),
      creator: 'Artificials Tools',
      description: 'Editable text extracted locally from a PDF. Layout requires review.',
      styles: {
        default: {
          document: { run: { font: 'Arial', size: 22 } },
        },
      },
      sections: [{ children: paragraphs }],
    });
    const blob = await Packer.toBlob(document);
    checkCancelled(signal);
    if (blob.size > MAX_OUTPUT_BYTES)
      throw new Error('The Word output exceeds the browser safety limit. Select fewer pages.');
    const recovered = [
      headingCount ? `${headingCount} heading${headingCount === 1 ? '' : 's'}` : '',
      listCount ? `${listCount} list item${listCount === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    return [
      {
        name: outputName(file.name, 'editable-text', 'docx'),
        blob,
        detail: `Editable text with bold, italic, type sizes and source page breaks.${recovered.length ? ` Detected ${recovered.join(' and ')}.` : ''} Headings are inferred from type size, so review them. Columns, tables, images and equations are not reconstructed.${emptyPages ? ` ${emptyPages} page(s) had no extractable text and are marked in the document.` : ''} OCR is not included.`,
      },
    ];
  });
}

export async function runPdfTool(
  id: UtilityId,
  files: File[],
  options: UtilityOptions,
  report: ProgressReporter,
  signal: AbortSignal,
): Promise<UtilityResult[]> {
  checkCancelled(signal);
  const supported: UtilityId[] = [
    'compress-pdf',
    'merge-pdf',
    'extract-pdf',
    'remove-pdf-pages',
    'reorder-pdf',
    'split-pdf',
    'rotate-pdf',
    'pdf-to-images',
    'images-to-pdf',
    'pdf-to-word',
  ];
  if (!supported.includes(id)) throw new Error('This PDF tool is not supported.');
  if (!files.length || files.length > MAX_FILES)
    throw new Error(`Choose between 1 and ${MAX_FILES} files.`);
  if (files.some((file) => !file.size || file.size > MAX_FILE_BYTES))
    throw new Error('Each file must be non-empty and no larger than 25 MB.');
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES)
    throw new Error('Choose files totalling no more than 60 MB.');
  if (id !== 'merge-pdf' && id !== 'images-to-pdf' && files.length !== 1)
    throw new Error('Choose one PDF for this tool.');
  if (id === 'merge-pdf' && files.length < 2) throw new Error('Choose at least two PDFs to merge.');
  if (!Number.isFinite(options.quality) || !Number.isFinite(options.dpi))
    throw new Error('Choose a valid quality and resolution.');
  report(2, 'Reading your files locally…');
  let results: UtilityResult[];
  if (id === 'images-to-pdf') results = await imagesToPdf(files, report, signal);
  else if (id === 'pdf-to-word') results = await pdfToWord(files[0], options, report, signal);
  else if (id === 'pdf-to-images' || (id === 'compress-pdf' && options.pdfMode === 'raster'))
    results = await rasterPdf(id, files[0], options, report, signal);
  else results = await structuralPdf(id, files, options, report, signal);
  checkCancelled(signal);
  report(100, 'Ready to download.');
  return results;
}
