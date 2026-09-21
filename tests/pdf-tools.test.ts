import { describe, expect, it } from 'vitest';
import { degrees, PDFDocument, StandardFonts } from 'pdf-lib';
import { parsePdfPages, runPdfTool } from '../src/lib/tools/pdf';
import type { UtilityOptions } from '../src/lib/tools/types';

const options: UtilityOptions = {
  quality: 0.8,
  maxDimension: 2048,
  imageFormat: 'image/jpeg',
  pdfMode: 'lossless',
  pages: '',
  dpi: 144,
  rotation: 90,
};
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
