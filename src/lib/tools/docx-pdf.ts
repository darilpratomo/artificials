import type { PDFDocument, PDFFont, PDFImage, PDFPage } from 'pdf-lib';
import { checkCancelled, type ProgressReporter } from './types';

/**
 * Renders the sanitized DOCX preview HTML into a real PDF with selectable text,
 * so a visitor gets a downloadable file instead of depending on a browser's
 * Print → Save as PDF dialog, which many mobile browsers do not offer.
 *
 * This is a flowed-text renderer, not a Word layout engine. It reproduces
 * headings, emphasis, lists, block quotes, tables, images and horizontal rules
 * in reading order. It does not reproduce columns, floats, text boxes, original
 * fonts, headers and footers, or the source pagination.
 */

const PAGE_WIDTH = 595.28; // A4 portrait, in PDF points.
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const MAX_PAGES = 200;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 16_000_000;

const HEADING_SIZES: Record<string, number> = { h1: 22, h2: 18, h3: 15, h4: 13, h5: 12, h6: 11 };
const BODY_SIZE = 11;
const LINE_RATIO = 1.42;

export interface DocxPdfOptions {
  title?: string;
}

export interface DocxPdfOutcome {
  blob: Blob;
  pages: number;
  omittedImages: number;
}

interface Span {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  monospace: boolean;
}

interface TextBlock {
  kind: 'text';
  spans: Span[];
  size: number;
  indent: number;
  marker?: string;
  spaceBefore: number;
  spaceAfter: number;
  quote: boolean;
  heading: boolean;
}

interface ImageBlock {
  kind: 'image';
  data: Uint8Array;
  mime: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
}

interface TableBlock {
  kind: 'table';
  rows: { cells: Span[][][]; header: boolean }[];
}

interface RuleBlock {
  kind: 'rule';
}

type Block = TextBlock | ImageBlock | TableBlock | RuleBlock;

const BASE_STYLE: Span = {
  text: '',
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  monospace: false,
};

/** WinAnsi cannot encode every character; map the common ones and drop the rest. */
const SUBSTITUTIONS: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '‚': ',',
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
  '−': '-',
  '•': '•',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
  '​': '',
  '…': '...',
  '≤': '<=',
  '≥': '>=',
  '×': 'x',
  '\t': '    ',
};

export function encodableText(value: string) {
  let output = '';
  for (const character of value.replace(/\r/g, '')) {
    const mapped = SUBSTITUTIONS[character] ?? character;
    const code = mapped.codePointAt(0) ?? 0;
    // Keep Latin-1 and the few punctuation marks WinAnsi covers; replace others
    // so the text stays readable instead of failing to encode.
    if (mapped === '\n' || (code >= 32 && code <= 255) || mapped === '•') output += mapped;
    else if (code > 255) output += '?';
  }
  return output;
}

function collapse(value: string) {
  return value.replace(/[ \t ]*\n[ \t ]*/g, ' ').replace(/[ \t ]{2,}/g, ' ');
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/**
 * Walks the sanitized preview DOM into an ordered block list. The HTML comes
 * from DOMPurify with a narrow allowlist, so only known tags appear here.
 */
export function blocksFromPreviewHtml(html: string): { blocks: Block[]; omittedImages: number } {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const blocks: Block[] = [];
  let omittedImages = 0;

  const spansOf = (node: Node, style: Span, into: Span[]) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = collapse(child.textContent ?? '');
        if (text) into.push({ ...style, text });
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const element = child as Element;
      const tag = element.tagName.toLowerCase();
      if (tag === 'br') {
        into.push({ ...style, text: '\n' });
        continue;
      }
      spansOf(
        element,
        {
          ...style,
          bold: style.bold || tag === 'strong' || tag === 'b',
          italic: style.italic || tag === 'em' || tag === 'i',
          underline: style.underline || tag === 'u',
          strike: style.strike || tag === 's',
          monospace: style.monospace || tag === 'code' || tag === 'pre',
        },
        into,
      );
    }
  };

  const textBlock = (
    node: Element,
    size: number,
    options: Partial<TextBlock> = {},
  ): TextBlock | null => {
    const spans: Span[] = [];
    spansOf(node, BASE_STYLE, spans);
    const joined = spans
      .map((span) => span.text)
      .join('')
      .trim();
    if (!joined && !options.marker) return null;
    return {
      kind: 'text',
      spans,
      size,
      indent: 0,
      spaceBefore: 0,
      spaceAfter: size * 0.55,
      quote: false,
      heading: false,
      ...options,
    };
  };

  const push = (block: Block | null) => {
    if (block) blocks.push(block);
  };

  const imageBlock = (element: HTMLImageElement): ImageBlock | null => {
    const source = element.getAttribute('src') ?? '';
    const match = /^data:image\/(png|jpeg);base64,([a-z0-9+/=]+)$/i.exec(source);
    if (!match) return null;
    let data: Uint8Array;
    try {
      data = decodeBase64(match[2]);
    } catch {
      return null;
    }
    if (!data.byteLength || data.byteLength > MAX_IMAGE_BYTES) return null;
    return {
      kind: 'image',
      data,
      mime: match[1].toLowerCase() === 'png' ? 'image/png' : 'image/jpeg',
      width: 0,
      height: 0,
    };
  };

  const listItems = (list: Element, ordered: boolean, depth: number) => {
    const start = Number(list.getAttribute('start') ?? '1');
    let counter = Number.isSafeInteger(start) && start > 0 ? start : 1;
    for (const item of Array.from(list.children)) {
      if (item.tagName.toLowerCase() !== 'li') continue;
      const nested = Array.from(item.children).filter((child) =>
        ['ul', 'ol'].includes(child.tagName.toLowerCase()),
      );
      const clone = item.cloneNode(true) as Element;
      for (const child of Array.from(clone.children))
        if (['ul', 'ol'].includes(child.tagName.toLowerCase())) child.remove();
      push(
        textBlock(clone, BODY_SIZE, {
          marker: ordered ? `${counter}.` : '•',
          indent: 18 + depth * 18,
          spaceAfter: BODY_SIZE * 0.3,
        }),
      );
      counter += 1;
      for (const child of nested) listItems(child, child.tagName.toLowerCase() === 'ol', depth + 1);
    }
  };

  const cellSpans = (cell: Element): Span[][] => {
    const lines: Span[][] = [];
    const paragraphs = Array.from(cell.children).filter(
      (child) => child.tagName.toLowerCase() === 'p',
    );
    const sources = paragraphs.length ? paragraphs : [cell];
    for (const source of sources) {
      const spans: Span[] = [];
      spansOf(source, BASE_STYLE, spans);
      if (spans.some((span) => span.text.trim())) lines.push(spans);
    }
    return lines;
  };

  const walk = (parent: Element) => {
    for (const node of Array.from(parent.children)) {
      const tag = node.tagName.toLowerCase();
      if (tag in HEADING_SIZES) {
        push(
          textBlock(node, HEADING_SIZES[tag], {
            heading: true,
            spaceBefore: HEADING_SIZES[tag] * 0.7,
            spaceAfter: HEADING_SIZES[tag] * 0.35,
          }),
        );
      } else if (tag === 'p') {
        const image = node.querySelector('img');
        const hasText = (node.textContent ?? '').trim().length > 0;
        if (image && !hasText) {
          const block = imageBlock(image as HTMLImageElement);
          if (block) push(block);
          else omittedImages += 1;
          continue;
        }
        push(textBlock(node, BODY_SIZE));
      } else if (tag === 'img') {
        const block = imageBlock(node as HTMLImageElement);
        if (block) push(block);
        else omittedImages += 1;
      } else if (tag === 'ul' || tag === 'ol') {
        listItems(node, tag === 'ol', 0);
      } else if (tag === 'blockquote') {
        for (const child of Array.from(node.children).length ? Array.from(node.children) : [node])
          push(textBlock(child, BODY_SIZE, { quote: true, indent: 20 }));
      } else if (tag === 'pre') {
        push(textBlock(node, BODY_SIZE - 1));
      } else if (tag === 'hr') {
        push({ kind: 'rule' });
      } else if (tag === 'table') {
        const rows: TableBlock['rows'] = [];
        for (const row of Array.from(node.querySelectorAll('tr'))) {
          const cells = Array.from(row.children).filter((cell) =>
            ['td', 'th'].includes(cell.tagName.toLowerCase()),
          );
          if (!cells.length) continue;
          rows.push({
            cells: cells.map((cell) => cellSpans(cell)),
            header: cells.every((cell) => cell.tagName.toLowerCase() === 'th'),
          });
        }
        if (rows.length) push({ kind: 'table', rows });
      } else if (node.children.length) {
        walk(node);
      } else {
        push(textBlock(node, BODY_SIZE));
      }
    }
  };

  walk(parsed.body);
  return { blocks, omittedImages };
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
  mono: PDFFont;
  monoBold: PDFFont;
}

function fontFor(fonts: Fonts, span: Span) {
  if (span.monospace) return span.bold ? fonts.monoBold : fonts.mono;
  if (span.bold && span.italic) return fonts.boldItalic;
  if (span.bold) return fonts.bold;
  if (span.italic) return fonts.italic;
  return fonts.regular;
}

interface Piece {
  text: string;
  span: Span;
  font: PDFFont;
  width: number;
}

/** Break styled spans into lines that fit the available width. */
export function layoutSpans(spans: Span[], fonts: Fonts, size: number, width: number): Piece[][] {
  const lines: Piece[][] = [];
  let line: Piece[] = [];
  let used = 0;
  const flush = () => {
    lines.push(line);
    line = [];
    used = 0;
  };
  for (const span of spans) {
    const text = encodableText(span.text);
    if (!text) continue;
    const font = fontFor(fonts, span);
    const segments = text.split('\n');
    for (const [segmentIndex, segment] of segments.entries()) {
      // A <br> arrives as a newline and ends the current line even when it is
      // not yet full.
      if (segmentIndex > 0) flush();
      const words = segment.match(/\S+\s*/g) ?? [];
      for (const word of words) {
        const trimmed = word.replace(/\s+$/, '');
        const measured = font.widthOfTextAtSize(word, size);
        if (used > 0 && used + font.widthOfTextAtSize(trimmed, size) > width) flush();
        if (measured > width && used === 0) {
          // A single unbreakable token longer than the line: split by character.
          let chunk = '';
          for (const character of word) {
            if (font.widthOfTextAtSize(chunk + character, size) > width && chunk) {
              line.push({ text: chunk, span, font, width: font.widthOfTextAtSize(chunk, size) });
              flush();
              chunk = character;
            } else chunk += character;
          }
          if (chunk) {
            line.push({ text: chunk, span, font, width: font.widthOfTextAtSize(chunk, size) });
            used = font.widthOfTextAtSize(chunk, size);
          }
          continue;
        }
        line.push({ text: word, span, font, width: measured });
        used += measured;
      }
    }
  }
  if (line.length) flush();
  return lines.length ? lines : [[]];
}

class PdfWriter {
  private page: PDFPage;
  private cursor = PAGE_HEIGHT - MARGIN;
  public pages = 1;

  constructor(
    private readonly document: PDFDocument,
    private readonly fonts: Fonts,
  ) {
    this.page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  }

  private newPage() {
    if (this.pages >= MAX_PAGES)
      throw new Error(
        'This document needs more than 200 PDF pages. Split it into smaller documents.',
      );
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages += 1;
    this.cursor = PAGE_HEIGHT - MARGIN;
  }

  private ensure(height: number) {
    if (this.cursor - height < MARGIN) this.newPage();
  }

  space(amount: number) {
    if (this.cursor < PAGE_HEIGHT - MARGIN) this.cursor -= amount;
  }

  async text(block: TextBlock, rgb: typeof import('pdf-lib').rgb) {
    const indent = Math.min(block.indent, CONTENT_WIDTH - 72);
    const width = CONTENT_WIDTH - indent - (block.quote ? 12 : 0);
    const lines = layoutSpans(block.spans, this.fonts, block.size, width);
    const lineHeight = block.size * LINE_RATIO;
    this.space(block.spaceBefore);
    for (const [index, line] of lines.entries()) {
      // Keep a heading with the line that follows it rather than stranding it.
      this.ensure(block.heading && index === 0 ? lineHeight * 2 : lineHeight);
      const top = this.cursor;
      const baseline = top - block.size;
      let x = MARGIN + indent + (block.quote ? 12 : 0);
      if (block.marker && index === 0) {
        this.page.drawText(encodableText(block.marker), {
          x: MARGIN + Math.max(0, indent - 16),
          y: baseline,
          size: block.size,
          font: this.fonts.regular,
          color: rgb(0.1, 0.1, 0.12),
        });
      }
      if (block.quote) {
        this.page.drawRectangle({
          x: MARGIN + indent - 8,
          y: baseline - block.size * 0.25,
          width: 2,
          height: lineHeight,
          color: rgb(0.68, 0.7, 0.73),
        });
      }
      for (const piece of line) {
        const text = piece.text.replace(/\s+$/, '');
        if (text) {
          this.page.drawText(text, {
            x,
            y: baseline,
            size: block.size,
            font: piece.font,
            color: rgb(0.06, 0.07, 0.09),
          });
          const drawn = piece.font.widthOfTextAtSize(text, block.size);
          if (piece.span.underline)
            this.page.drawLine({
              start: { x, y: baseline - block.size * 0.14 },
              end: { x: x + drawn, y: baseline - block.size * 0.14 },
              thickness: Math.max(0.5, block.size * 0.05),
              color: rgb(0.06, 0.07, 0.09),
            });
          if (piece.span.strike)
            this.page.drawLine({
              start: { x, y: baseline + block.size * 0.28 },
              end: { x: x + drawn, y: baseline + block.size * 0.28 },
              thickness: Math.max(0.5, block.size * 0.05),
              color: rgb(0.06, 0.07, 0.09),
            });
        }
        x += piece.width;
      }
      this.cursor -= lineHeight;
    }
    this.cursor -= block.spaceAfter;
  }

  rule(rgb: typeof import('pdf-lib').rgb) {
    this.ensure(18);
    this.cursor -= 8;
    this.page.drawLine({
      start: { x: MARGIN, y: this.cursor },
      end: { x: PAGE_WIDTH - MARGIN, y: this.cursor },
      thickness: 0.75,
      color: rgb(0.72, 0.74, 0.77),
    });
    this.cursor -= 10;
  }

  image(embedded: PDFImage) {
    const scale = Math.min(
      1,
      CONTENT_WIDTH / embedded.width,
      (PAGE_HEIGHT - MARGIN * 2) / embedded.height,
    );
    const width = embedded.width * scale;
    const height = embedded.height * scale;
    this.ensure(height + 8);
    this.cursor -= height;
    this.page.drawImage(embedded, {
      x: MARGIN + (CONTENT_WIDTH - width) / 2,
      y: this.cursor,
      width,
      height,
    });
    this.cursor -= 12;
  }

  async table(block: TableBlock, rgb: typeof import('pdf-lib').rgb) {
    const columns = Math.max(...block.rows.map((row) => row.cells.length));
    if (!Number.isFinite(columns) || columns < 1) return;
    const columnWidth = CONTENT_WIDTH / columns;
    const size = Math.max(8, Math.min(BODY_SIZE, BODY_SIZE - Math.max(0, columns - 3)));
    const lineHeight = size * 1.3;
    const padding = 5;
    for (const row of block.rows) {
      const cellLines = Array.from({ length: columns }, (_, index) => {
        const cell = row.cells[index] ?? [];
        return cell.flatMap((line) =>
          layoutSpans(line, this.fonts, size, columnWidth - padding * 2),
        );
      });
      const rowHeight =
        Math.max(1, ...cellLines.map((lines) => lines.length)) * lineHeight + padding * 2;
      if (this.cursor - rowHeight < MARGIN) this.newPage();
      const top = this.cursor;
      for (let column = 0; column < columns; column += 1) {
        const x = MARGIN + column * columnWidth;
        this.page.drawRectangle({
          x,
          y: top - rowHeight,
          width: columnWidth,
          height: rowHeight,
          borderColor: rgb(0.76, 0.78, 0.81),
          borderWidth: 0.6,
          color: row.header ? rgb(0.95, 0.955, 0.96) : undefined,
        });
        let baseline = top - padding - size;
        for (const line of cellLines[column]) {
          let x2 = x + padding;
          for (const piece of line) {
            const text = piece.text.replace(/\s+$/, '');
            if (text)
              this.page.drawText(text, {
                x: x2,
                y: baseline,
                size,
                font: row.header && !piece.span.bold ? this.fonts.bold : piece.font,
                color: rgb(0.06, 0.07, 0.09),
              });
            x2 += piece.width;
          }
          baseline -= lineHeight;
        }
      }
      this.cursor = top - rowHeight;
    }
    this.cursor -= 10;
  }
}

export async function renderDocxPdf(
  html: string,
  options: DocxPdfOptions,
  report: ProgressReporter,
  signal: AbortSignal,
): Promise<DocxPdfOutcome> {
  checkCancelled(signal);
  report(72, 'Laying out pages…');
  const { blocks, omittedImages } = blocksFromPreviewHtml(html);
  if (!blocks.length) throw new Error('This document has no content to place in a PDF.');
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const document = await PDFDocument.create();
  document.setTitle(options.title?.slice(0, 200) || 'Document');
  document.setProducer('Artificials Tools');
  document.setCreator('Artificials Tools');
  const fonts: Fonts = {
    regular: await document.embedFont(StandardFonts.Helvetica),
    bold: await document.embedFont(StandardFonts.HelveticaBold),
    italic: await document.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await document.embedFont(StandardFonts.HelveticaBoldOblique),
    mono: await document.embedFont(StandardFonts.Courier),
    monoBold: await document.embedFont(StandardFonts.CourierBold),
  };
  const writer = new PdfWriter(document, fonts);
  let skipped = omittedImages;
  for (const [index, block] of blocks.entries()) {
    if (index % 12 === 0) {
      checkCancelled(signal);
      report(72 + (index / blocks.length) * 20, 'Drawing document content…');
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (block.kind === 'text') await writer.text(block, rgb);
    else if (block.kind === 'rule') writer.rule(rgb);
    else if (block.kind === 'table') await writer.table(block, rgb);
    else {
      try {
        const embedded =
          block.mime === 'image/png'
            ? await document.embedPng(block.data)
            : await document.embedJpg(block.data);
        if (embedded.width * embedded.height > MAX_IMAGE_PIXELS) skipped += 1;
        else writer.image(embedded);
      } catch {
        skipped += 1;
      }
    }
  }
  checkCancelled(signal);
  report(95, 'Saving your PDF…');
  const bytes = await document.save({ useObjectStreams: true, addDefaultPage: false });
  checkCancelled(signal);
  return {
    blob: new Blob([Uint8Array.from(bytes).buffer], { type: 'application/pdf' }),
    pages: writer.pages,
    omittedImages: skipped,
  };
}
