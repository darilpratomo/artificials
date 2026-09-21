import { describe, expect, it } from 'vitest';
import { degrees, PDFDocument, StandardFonts } from 'pdf-lib';
import {
  dominantTextSize,
  fontStyleFlags,
  headingLevelForSize,
  parsePdfPages,
  remainingPages,
  reorderedPages,
  runPdfTool,
  splitGroups,
} from '../src/lib/tools/pdf';
import { DEFAULT_OPTIONS, type UtilityOptions } from '../src/lib/tools/types';

const options: UtilityOptions = { ...DEFAULT_OPTIONS, imageFormat: 'image/jpeg', quality: 0.8 };
const signal = () => new AbortController().signal;

async function fixture(name = 'source.pdf', widths = [300, 400, 500]) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const width of widths) {
    const page = pdf.addPage([width, 600]);
    page.drawText(`Page width ${width}`, { font, size: 16, x: 20, y: 500 });
  }
  const bytes = await pdf.save({ useObjectStreams: false });
  return new File([Uint8Array.from(bytes).buffer], name, { type: 'application/pdf' });
}

describe('PDF tools', () => {
  it('parses ordered page ranges, deduplicates, and rejects invalid selections', () => {
    expect(parsePdfPages('3, 1-2, 2', 4)).toEqual([2, 0, 1]);
    expect(parsePdfPages('', 3)).toEqual([0, 1, 2]);
    for (const value of ['0', '5', '3-1', '1,,2', '1.5', '1-', '-1', '1e2', '1–3', '1,']) {
      expect(() => parsePdfPages(value, 4)).toThrow();
    }
    expect(() => parsePdfPages('', 121)).toThrow(/120/);
  });

  it('extracts selected pages in the requested order into a readable PDF', async () => {
    const [result] = await runPdfTool(
      'extract-pdf',
      [await fixture()],
      { ...options, pages: '3,1' },
      () => undefined,
      signal(),
    );
    const pdf = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(pdf.getPages().map((page) => page.getWidth())).toEqual([500, 300]);
    expect(result.name).toBe('source-extracted.pdf');
  });

  it('merges files in input order and retains page dimensions', async () => {
    const files = [await fixture('first.pdf', [220]), await fixture('second.pdf', [440, 660])];
    const [result] = await runPdfTool('merge-pdf', files, options, () => undefined, signal());
    const pdf = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(pdf.getPages().map((page) => page.getWidth())).toEqual([220, 440, 660]);
  });

  it('rotates only selected pages relative to their existing orientation', async () => {
    const source = await fixture();
    const original = await PDFDocument.load(await source.arrayBuffer());
    original.getPage(1).setRotation(degrees(270));
    const file = new File([Uint8Array.from(await original.save()).buffer], 'rotated.pdf', {
      type: 'application/pdf',
    });
    const [result] = await runPdfTool(
      'rotate-pdf',
      [file],
      { ...options, pages: '2', rotation: 180 },
      () => undefined,
      signal(),
    );
    const pdf = await PDFDocument.load(await result.blob.arrayBuffer());
    expect(pdf.getPages().map((page) => page.getRotation().angle)).toEqual([0, 90, 0]);
  });

  it('never returns a larger file for lossless compression', async () => {
    const source = await fixture();
    const progress: number[] = [];
    const [result] = await runPdfTool(
      'compress-pdf',
      [source],
      options,
      (value) => progress.push(value),
      signal(),
    );
    expect(result.blob.size).toBeLessThanOrEqual(source.size);
    expect((await PDFDocument.load(await result.blob.arrayBuffer())).getPageCount()).toBe(3);
    expect(progress.at(-1)).toBe(100);
    const [again] = await runPdfTool(
      'compress-pdf',
      [new File([result.blob], 'already.pdf')],
      options,
      () => undefined,
      signal(),
    );
    expect(again.blob.size).toBeLessThanOrEqual(result.blob.size);
  });

  it('reads weight and slant from embedded font names', () => {
    expect(fontStyleFlags('ABCDEF+Arial-BoldMT')).toEqual({ bold: true, italic: false });
    expect(fontStyleFlags('Helvetica-Oblique')).toEqual({ bold: false, italic: true });
    expect(fontStyleFlags('XYZ+TimesNewRoman-BoldItalicMT')).toEqual({
      bold: true,
      italic: true,
    });
    expect(fontStyleFlags('g_d0_f1', 'Liberation Serif Bold')).toEqual({
      bold: true,
      italic: false,
    });
    // "Semibolder" style names must not make ordinary body text bold.
    expect(fontStyleFlags('Arial-Regular')).toEqual({ bold: false, italic: false });
  });

  it('infers heading levels from size relative to the dominant body size', () => {
    expect(headingLevelForSize(24, 11, false)).toBe(1);
    expect(headingLevelForSize(17, 11, false)).toBe(2);
    expect(headingLevelForSize(13.5, 11, false)).toBe(3);
    expect(headingLevelForSize(12, 11, true)).toBe(4);
    expect(headingLevelForSize(12, 11, false)).toBeUndefined();
    expect(headingLevelForSize(11, 11, true)).toBeUndefined();
    // The same 12pt line is body text in a large-print document.
    expect(headingLevelForSize(12, 14, true)).toBeUndefined();
    expect(headingLevelForSize(20, 0, true)).toBeUndefined();
  });

  it('picks the most-used size as the body size, preferring the smaller on a tie', () => {
    expect(
      dominantTextSize(
        new Map([
          [24, 12],
          [11, 800],
          [14, 60],
        ]),
      ),
    ).toBe(11);
    expect(
      dominantTextSize(
        new Map([
          [18, 40],
          [11, 40],
        ]),
      ),
    ).toBe(11);
    expect(dominantTextSize(new Map())).toBe(0);
  });

  it('converts a PDF to DOCX with headings, bold runs and preserved words', async () => {
    const pdf = await PDFDocument.create();
    const body = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([400, 600]);
    page.drawText('Quarterly Report', { font: bold, size: 24, x: 40, y: 540 });
    for (let line = 0; line < 8; line += 1) {
      page.drawText('Ordinary body text that sets the dominant size.', {
        font: body,
        size: 11,
        x: 40,
        y: 480 - line * 18,
      });
    }
    page.drawText('Emphasised summary line', { font: bold, size: 11, x: 40, y: 300 });
    const file = new File([Uint8Array.from(await pdf.save()).buffer], 'report.pdf', {
      type: 'application/pdf',
    });
    const [result] = await runPdfTool('pdf-to-word', [file], options, () => undefined, signal());
    expect(result.name).toBe('report-editable-text.docx');
    const { strFromU8, unzipSync } = await import('fflate');
    const entries = unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
    const xml = strFromU8(entries['word/document.xml']);
    expect(xml).toContain('Quarterly Report');
    // Text must survive intact: no space injected inside words.
    expect(xml).toContain('Ordinary body text that sets the dominant size.');
    expect(xml).toMatch(/w:pStyle w:val="Heading1"/);
    expect(xml).toMatch(/<w:b\b/);
    expect(result.detail).toMatch(/heading/i);
  });

  it('rejects a PDF with no extractable text instead of emitting an empty document', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([200, 200]);
    const file = new File([Uint8Array.from(await pdf.save()).buffer], 'blank.pdf', {
      type: 'application/pdf',
    });
    await expect(
      runPdfTool('pdf-to-word', [file], options, () => undefined, signal()),
    ).rejects.toThrow(/No extractable text/);
  });

  it('keeps the unlisted pages when deleting, and refuses to empty a document', () => {
    expect(remainingPages('2', 4)).toEqual([0, 2, 3]);
    expect(remainingPages('1-2, 4', 5)).toEqual([2, 4]);
    expect(() => remainingPages('1-3', 3)).toThrow(/every page/);
    expect(() => remainingPages('', 3)).toThrow(/pages to delete/);
    expect(() => remainingPages('9', 3)).toThrow();
  });

  it('appends unlisted pages after a partial reorder so no page is lost', () => {
    expect(reorderedPages('3,1', 4)).toEqual([2, 0, 1, 3]);
    expect(reorderedPages('4,3,2,1', 4)).toEqual([3, 2, 1, 0]);
    expect(reorderedPages('2', 3)).toEqual([1, 0, 2]);
    expect(() => reorderedPages('', 3)).toThrow(/page order/);
  });

  it('builds contiguous split groups covering every page exactly once', () => {
    expect(splitGroups('each-page', '', 3)).toEqual([[0], [1], [2]]);
    expect(splitGroups('every-n', '2', 5)).toEqual([[0, 1], [2, 3], [4]]);
    expect(splitGroups('at-pages', '3', 5)).toEqual([
      [0, 1],
      [2, 3, 4],
    ]);
    expect(splitGroups('at-pages', '2,4', 5)).toEqual([[0], [1, 2], [3, 4]]);
    // Duplicated and unsorted split points collapse into the same grouping.
    expect(splitGroups('at-pages', '4,2,4', 5)).toEqual([[0], [1, 2], [3, 4]]);
    const groups = splitGroups('every-n', '3', 10);
    expect(groups.flat()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const bad of ['0', '6', '', 'x', '-1']) {
      expect(() => splitGroups('every-n', bad, 6)).toThrow();
    }
    // Page 1 is always a start, so it is not a valid split point.
    expect(() => splitGroups('at-pages', '1', 4)).toThrow(/between 2 and 4/);
    expect(() => splitGroups('at-pages', '5', 4)).toThrow(/between 2 and 4/);
    expect(() => splitGroups('at-pages', '', 4)).toThrow(/new document should start/);
  });

  it('deletes and reorders real pages without rasterizing them', async () => {
    const [removed] = await runPdfTool(
      'remove-pdf-pages',
      [await fixture()],
      { ...options, pages: '2' },
      () => undefined,
      signal(),
    );
    const afterRemove = await PDFDocument.load(await removed.blob.arrayBuffer());
    expect(afterRemove.getPages().map((page) => page.getWidth())).toEqual([300, 500]);
    expect(removed.name).toBe('source-pages-removed.pdf');

    const [reordered] = await runPdfTool(
      'reorder-pdf',
      [await fixture()],
      { ...options, pages: '3,1' },
      () => undefined,
      signal(),
    );
    const afterReorder = await PDFDocument.load(await reordered.blob.arrayBuffer());
    expect(afterReorder.getPages().map((page) => page.getWidth())).toEqual([500, 300, 400]);
  });

  it('splits a document into downloadable parts that together cover the source', async () => {
    const results = await runPdfTool(
      'split-pdf',
      [await fixture('report.pdf', [300, 400, 500, 600])],
      { ...options, splitMode: 'every-n', splitValue: '2' },
      () => undefined,
      signal(),
    );
    expect(results).toHaveLength(2);
    const widths: number[] = [];
    for (const result of results) {
      const part = await PDFDocument.load(await result.blob.arrayBuffer());
      widths.push(...part.getPages().map((page) => page.getWidth()));
    }
    expect(widths).toEqual([300, 400, 500, 600]);
    expect(results[0].name).toBe('report-part-01-pages-1-to-2.pdf');
    expect(results[1].name).toBe('report-part-02-pages-3-to-4.pdf');

    const single = await runPdfTool(
      'split-pdf',
      [await fixture('doc.pdf', [210, 220, 230])],
      { ...options, splitMode: 'each-page' },
      () => undefined,
      signal(),
    );
    expect(single).toHaveLength(3);
    expect(single[0].name).toBe('doc-part-01-pages-1.pdf');
  });

  it('rejects invalid, encrypted, over-limit and cancelled inputs', async () => {
    const encrypted = await PDFDocument.create();
    encrypted.addPage();
    encrypted.context.trailerInfo.Encrypt = encrypted.context.register(
      encrypted.context.obj({ Filter: 'Standard', V: 1 }),
    );
    const encryptedFile = new File([Uint8Array.from(await encrypted.save()).buffer], 'locked.pdf');
    await expect(
      runPdfTool('compress-pdf', [encryptedFile], options, () => undefined, signal()),
    ).rejects.toThrow(/encrypted|Password-protected/);
    await expect(
      runPdfTool(
        'compress-pdf',
        [new File(['not pdf'], 'invalid.pdf')],
        options,
        () => undefined,
        signal(),
      ),
    ).rejects.toThrow(/valid PDF/);
    await expect(
      runPdfTool(
        'compress-pdf',
        [new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'large.pdf')],
        options,
        () => undefined,
        signal(),
      ),
    ).rejects.toThrow(/25 MB/);
    await expect(
      runPdfTool('merge-pdf', [await fixture()], options, () => undefined, signal()),
    ).rejects.toThrow(/at least two/);
    const controller = new AbortController();
    controller.abort();
    await expect(
      runPdfTool('compress-pdf', [await fixture()], options, () => undefined, controller.signal),
    ).rejects.toThrow(/cancelled/);
  });
});
