import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from 'docx';

async function fixture(title = 'Private local document') {
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [new TextRun({ text: 'Selectable text stays on this device.', bold: true })],
          }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('One table cell')] }),
                  new TableCell({ children: [new Paragraph('Another cell')] }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new ImageRun({
                type: 'png',
                data: Buffer.from(
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEfgAAAAASUVORK5CYII=',
                  'base64',
                ),
                transformation: { width: 24, height: 24 },
              }),
            ],
          }),
          new Paragraph({
            children: [
              new ExternalHyperlink({
                link: 'https://document-resource.invalid/private-link',
                children: [new TextRun('External link text is preserved.')],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new ExternalHyperlink({
                link: 'javascript:window.parent.__documentScriptRan=true',
                children: [new TextRun('Untrusted link text is preserved.')],
              }),
            ],
          }),
        ],
      },
    ],
  });
  return {
    name: 'private-document.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: await Packer.toBuffer(document),
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  if (process.env.E2E_PRODUCTION === '1') {
    const csp = readFileSync('public/_headers', 'utf8').match(/Content-Security-Policy: (.+)/)![1];
    await page.route('**/*', async (route) => {
      if (!route.request().isNavigationRequest()) return route.continue();
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), 'content-security-policy': csp },
      });
    });
  }
  await page.route('**/api/catalog/summary', (route) =>
    route.fulfill({ json: JSON.parse(readFileSync('public/data/catalog-summary.json', 'utf8')) }),
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: { auth: false, ai: false, billing: false, supportEmail: 'support@artificials.net' },
    }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (route) => route.fulfill({ json: { articles: [] } }));
});

test('DOCX preview preserves selectable content, blocks document links, and prints only after ready', async ({
  page,
  baseURL,
}) => {
  const outsideRequests: string[] = [];
  const uploads: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL!).origin)
      outsideRequests.push(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) uploads.push(request.url());
  });
  await page.goto('/tools/word-to-pdf');
  await page.locator('input[type="file"]').setInputFiles(await fixture());
  const print = page.getByRole('button', { name: 'Print preview', exact: true });
  await expect(print).toBeEnabled({ timeout: 30_000 });
  const preview = page.frameLocator('iframe[title="Converted DOCX preview"]');
  await expect(preview.getByRole('heading', { name: 'Private local document' })).toBeVisible();
  await expect(preview.locator('strong')).toContainText('Selectable text stays on this device.');
  await expect(preview.getByRole('cell')).toHaveCount(2);
  await expect(preview.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(preview.locator('body')).toContainText('External link text is preserved.');
  await expect(preview.locator('a, script, iframe, form, style[onload]')).toHaveCount(0);
  await expect(page.locator('iframe[title="Converted DOCX preview"]')).toHaveAttribute(
    'sandbox',
    'allow-same-origin allow-modals',
  );
  await page.locator('iframe[title="Converted DOCX preview"]').evaluate((element) => {
    const frame = element as HTMLIFrameElement;
    const target = window as unknown as { __printCalls: number };
    target.__printCalls = 0;
    frame.contentWindow!.print = () => {
      target.__printCalls++;
    };
  });
  await print.click();
  expect(
    await page.evaluate(() => (window as unknown as { __printCalls: number }).__printCalls),
  ).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(outsideRequests).toEqual([]);
  expect(uploads).toEqual([]);
});

test('damaged DOCX produces a useful error and a replacement document can recover', async ({
  page,
}) => {
  await page.goto('/tools/word-to-pdf');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'broken.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: Buffer.from('not a ZIP archive'),
  });
  await expect(page.locator('.word-pdf [role="alert"]')).toContainText(/damaged|unsupported|read/i);
  await expect(page.getByRole('button', { name: 'Print preview', exact: true })).toHaveCount(0);
  await page.locator('input[type="file"]').setInputFiles(await fixture('Replacement document'));
  await expect(page.getByRole('button', { name: 'Print preview', exact: true })).toBeEnabled({
    timeout: 30_000,
  });
  await expect(
    page
      .frameLocator('iframe[title="Converted DOCX preview"]')
      .getByRole('heading', { name: 'Replacement document' }),
  ).toBeVisible();
  await expect(page.locator('.word-pdf [role="alert"]')).toHaveCount(0);
});

test('leaving a running conversion terminates its worker and removes the preview', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    const state = { created: 0, terminated: 0 };
    (window as unknown as { __wordWorkers: typeof state }).__wordWorkers = state;
    window.Worker = class extends NativeWorker {
      private word: boolean;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.word = String(url).includes('word.worker');
        if (this.word) state.created++;
      }
      override postMessage(
        message: unknown,
        transferOrOptions?: Transferable[] | StructuredSerializeOptions,
      ) {
        // Hold only the DOCX job, so navigation tests an in-flight worker reliably.
        if (!this.word) super.postMessage(message, transferOrOptions as Transferable[]);
      }
      override terminate() {
        if (this.word) state.terminated++;
        super.terminate();
      }
    };
  });
  await page.goto('/tools/word-to-pdf');
  await page.locator('input[type="file"]').setInputFiles(await fixture());
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __wordWorkers: { created: number } }).__wordWorkers.created,
      ),
    )
    .toBe(1);
  await page.locator('.site-footer a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __wordWorkers: { terminated: number } }).__wordWorkers.terminated,
      ),
    )
    .toBe(1);
  await expect(page.locator('iframe[title="Converted DOCX preview"]')).toHaveCount(0);
});

test('DOCX converts to a downloadable PDF with selectable text and no uploads', async ({
  page,
  baseURL,
}) => {
  const uploads: string[] = [];
  const outsideRequests: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method())) uploads.push(request.url());
    if (new URL(request.url()).origin !== new URL(baseURL!).origin)
      outsideRequests.push(request.url());
  });
  await page.goto('/tools/word-to-pdf');
  await page.locator('input[type="file"]').setInputFiles(await fixture());
  const download = page.getByRole('link', { name: 'Download PDF' });
  await expect(download).toBeVisible({ timeout: 30_000 });
  // The panel must report real page and size figures, not a placeholder.
  await expect(page.locator('.word-pdf-download small')).toContainText(/\d+ page/);
  const started = page.waitForEvent('download');
  await download.click();
  const file = await started;
  expect(file.suggestedFilename()).toMatch(/\.pdf$/);
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const bytes = Buffer.concat(chunks);
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  // Drawn text requires an embedded font dictionary; a rasterized page would
  // instead carry only an image XObject. Object streams hide this from a plain
  // byte scan, so inspect the parsed objects.
  const objects = pdf.context.enumerateIndirectObjects().map(([, object]) => String(object));
  expect(objects.some((object) => object.includes('/Font'))).toBe(true);
  expect(objects.some((object) => object.includes('Helvetica'))).toBe(true);
  // The fixture embeds a PNG, so the image must be carried into the PDF too.
  expect(objects.some((object) => object.includes('/Image'))).toBe(true);
  expect(uploads).toEqual([]);
  expect(outsideRequests).toEqual([]);
});
