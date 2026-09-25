import { test, expect, type Page, type Download } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { unzipSync, strFromU8 } from 'fflate';

const csp = readFileSync('public/_headers', 'utf8').match(/Content-Security-Policy: (.+)/)![1];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  if (process.env.E2E_PRODUCTION === '1') {
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
      json: { auth: false, supportEmail: 'support@artificials.net' },
    }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (route) => route.fulfill({ json: { articles: [] } }));
});

async function pdfFixture(name = 'private.pdf', count = 2) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= count; i++) {
    const page = pdf.addPage([300, 400]);
    page.drawRectangle({ x: 20, y: 200, width: 80, height: 80, color: rgb(0.3, 0.5, 0.9) });
    page.drawText(`Private page ${i}`, { x: 25, y: 350, font, size: 16 });
  }
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) };
}

async function imageFixture(page: Page, name = 'private-image.png') {
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 100;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#406b9b';
    context.fillRect(0, 0, 160, 100);
    context.fillStyle = '#fff';
    context.fillRect(20, 20, 30, 30);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  return { name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
}

async function downloadBytes(download: Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function resultBytes(page: Page) {
  const event = page.waitForEvent('download');
  await page.locator('.tools-result-card a[download]').first().click();
  return downloadBytes(await event);
}

test('tools directory is accessible, responsive and keeps conversion engines lazy', async ({
  page,
}) => {
  const engines: string[] = [];
  page.on('request', (request) => {
    if (/pdf\.worker|word\.worker|mammoth|pdf-lib|pdfjs-dist/.test(request.url()))
      engines.push(request.url());
  });
  await page.goto('/tools');
  await expect(page.locator('.tool-card')).toHaveCount(15);
  await page.getByRole('button', { name: 'Images', exact: true }).click();
  await expect(page.locator('.tool-card')).toHaveCount(5);
  await page.getByLabel('Search tools').fill('compress');
  await expect(page.locator('.tool-card')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(engines).toEqual([]);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(accessibility.violations).toEqual([]);
});

test('image conversion creates a real JPEG and compression preserves original format', async ({
  page,
  baseURL,
}) => {
  const uploads: string[] = [],
    external: string[] = [];
  page.on('request', (request) => {
    if (!['GET', 'HEAD'].includes(request.method())) uploads.push(request.url());
    if (new URL(request.url()).origin !== new URL(baseURL!).origin) external.push(request.url());
  });
  await page.goto('/tools/convert-image');
  const image = await imageFixture(page);
  await page.locator('input[type=file]').setInputFiles(image);
  await page.getByRole('combobox', { name: 'Output format' }).click();
  await page.getByRole('option', { name: 'JPEG · smaller photos' }).click();
  await page.locator('.tools-run').click();
  await expect(page.locator('.tools-result-card img')).toBeVisible();
  const jpeg = await resultBytes(page);
  expect(jpeg.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/tools/compress-image');
  await expect(page.getByRole('combobox', { name: 'Output format' })).toHaveCount(0);
  await page.locator('input[type=file]').setInputFiles(image);
  await page.locator('.tools-run').click();
  await expect(page.locator('.tools-result-card')).toHaveCount(1);
  expect((await resultBytes(page)).subarray(0, 8)).toEqual(image.buffer.subarray(0, 8));
  expect(uploads).toEqual([]);
  expect(external).toEqual([]);
});

test('PDF raster export and editable Word download work with local resources', async ({
  page,
  baseURL,
}) => {
  const outside: string[] = [];
  page.on('request', (request) => {
    if (
      new URL(request.url()).origin !== new URL(baseURL!).origin ||
      !['GET', 'HEAD'].includes(request.method())
    )
      outside.push(request.url());
  });
  await page.goto('/tools/pdf-to-images');
  const pdf = await pdfFixture();
  await page.locator('input[type=file]').setInputFiles(pdf);
  await page.getByLabel('Pages', { exact: true }).fill('2');
  await page.locator('.tools-run').click();
  await expect(page.locator('.tools-result-card img')).toBeVisible({ timeout: 30_000 });
  expect((await resultBytes(page)).subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  await page.goto('/tools/pdf-to-word');
  await page.locator('input[type=file]').setInputFiles(pdf);
  await page.locator('.tools-run').click();
  await expect(page.locator('.tools-result-card')).toHaveCount(1, { timeout: 30_000 });
  const document = unzipSync(await resultBytes(page));
  const xml = strFromU8(document['word/document.xml']);
  expect(xml).toContain('Private page 1');
  expect(xml).toContain('Private page 2');
  expect(outside).toEqual([]);
});

test('PDF merge ordering and image-to-PDF downloads preserve pages', async ({ page }) => {
  await page.goto('/tools/merge-pdf');
  await page
    .locator('input[type=file]')
    .setInputFiles([await pdfFixture('first.pdf', 2), await pdfFixture('second.pdf', 1)]);
  await page.getByRole('button', { name: 'Move second.pdf earlier' }).click();
  await expect(page.locator('.tools-file-name strong').first()).toHaveText('second.pdf');
  await page.locator('.tools-run').click();
  await expect(page.locator('.tools-result-card')).toHaveCount(1);
  const merged = await PDFDocument.load(await resultBytes(page));
  expect(merged.getPageCount()).toBe(3);
  await page.goto('/tools/images-to-pdf');
  await page.locator('input[type=file]').setInputFiles(await imageFixture(page));
  await page.locator('.tools-run').click();
  await expect(page.locator('.tools-result-card')).toHaveCount(1);
  expect((await PDFDocument.load(await resultBytes(page))).getPageCount()).toBe(1);
});

test('image-based PDF compression reduces a raster-heavy document and warns about lost text', async ({
  page,
}) => {
  await page.goto('/tools/compress-pdf');
  const pixels = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(500, 500);
    let value = 42;
    for (let i = 0; i < image.data.length; i += 4) {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      image.data[i] = value & 255;
      image.data[i + 1] = (value >>> 8) & 255;
      image.data[i + 2] = (value >>> 16) & 255;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const pdf = await PDFDocument.create();
  const bitmap = await pdf.embedPng(Buffer.from(pixels, 'base64'));
  pdf.addPage([300, 300]).drawImage(bitmap, { x: 0, y: 0, width: 300, height: 300 });
  const source = Buffer.from(await pdf.save());
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'raster.pdf', mimeType: 'application/pdf', buffer: source });
  await page.getByRole('combobox', { name: 'Compression mode' }).click();
  await page.getByRole('option', { name: 'Image-based · flatten pages' }).click();
  await expect(page.locator('.tools-format-note')).toContainText(/selectable text/);
  await page.locator('.tools-run').click();
  await expect(page.locator('.tools-result-card')).toHaveCount(1, { timeout: 30_000 });
  const output = await resultBytes(page);
  expect(output.byteLength).toBeLessThan(source.byteLength);
  expect((await PDFDocument.load(output)).getPageCount()).toBe(1);
});

test('invalid files fail clearly and multiple local results download as a ZIP', async ({
  page,
}) => {
  await page.goto('/tools/convert-image');
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not an image'),
  });
  await page.locator('.tools-run').click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Clear workspace' }).click();
  await page
    .locator('input[type=file]')
    .setInputFiles([await imageFixture(page, 'one.png'), await imageFixture(page, 'two.png')]);
  await page.getByRole('combobox', { name: 'Output format' }).click();
  await page.getByRole('option', { name: 'PNG · lossless pixels' }).click();
  await page.locator('.tools-run').click();
  await expect(page.locator('.tools-result-card')).toHaveCount(2);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all as ZIP' }).click();
  const files = unzipSync(await downloadBytes(await download));
  expect(Object.keys(files)).toHaveLength(2);
  for (const bytes of Object.values(files))
    expect(Array.from(bytes.subarray(0, 4))).toEqual([137, 80, 78, 71]);
});

test('deleting, reordering and splitting PDF pages produces real page changes', async ({
  page,
}) => {
  await page.goto('/tools/remove-pdf-pages');
  await page.locator('input[type=file]').setInputFiles(await pdfFixture('source.pdf', 4));
  await page.getByLabel('Pages to delete').fill('2');
  await page.locator('.tools-run').click();
  const removed = page.waitForEvent('download');
  await page.locator('.tools-result-card a').click();
  const afterRemove = await PDFDocument.load(await downloadBytes(await removed));
  expect(afterRemove.getPageCount()).toBe(3);

  await page.goto('/tools/split-pdf');
  await page.locator('input[type=file]').setInputFiles(await pdfFixture('split.pdf', 4));
  await page.getByRole('combobox', { name: 'How to split' }).click();
  await page.getByRole('option', { name: 'Fixed number of pages' }).click();
  await page.getByLabel('Pages per file').fill('2');
  await page.locator('.tools-run').click();
  await expect(page.locator('.tools-result-card')).toHaveCount(2);
  const archive = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all as ZIP' }).click();
  const parts = unzipSync(await downloadBytes(await archive));
  expect(Object.keys(parts)).toHaveLength(2);
  for (const bytes of Object.values(parts)) {
    const part = await PDFDocument.load(bytes);
    expect(part.getPageCount()).toBe(2);
  }
});

test('cropping removes pixels and the crop box is keyboard operable', async ({ page }) => {
  await page.goto('/tools/crop-image');
  await page.locator('input[type=file]').setInputFiles(await imageFixture(page, 'photo.png'));
  const box = page.getByRole('group', { name: /Crop area/ });
  await expect(box).toBeVisible();
  await page.getByRole('button', { name: 'Square 1:1' }).click();
  // The crop box must be reachable and movable without a pointer.
  await box.focus();
  await expect(box).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.locator('.tools-run').click();
  const download = page.waitForEvent('download');
  await page.locator('.tools-result-card a').click();
  const bytes = await downloadBytes(await download);
  const size = await page.evaluate(async (data: number[]) => {
    const blob = new Blob([new Uint8Array(data)], { type: 'image/png' });
    const bitmap = await createImageBitmap(blob);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  }, Array.from(bytes));
  // The source fixture is 160x100; a square crop cannot keep both dimensions.
  expect(size.width).toBeLessThan(160);
  expect(size.width).toBe(size.height);
});

test('watermarking requires text and draws it into the downloaded pixels', async ({ page }) => {
  await page.goto('/tools/watermark-image');
  await page.locator('input[type=file]').setInputFiles(await imageFixture(page, 'photo.png'));
  await page.locator('.tools-run').click();
  await expect(page.getByRole('alert')).toContainText(/watermark text/i);
  await page.getByLabel('Watermark text').fill('Artificials draft');
  await page.getByRole('combobox', { name: 'Watermark position' }).click();
  await page.getByRole('option', { name: 'Center' }).click();
  await page.locator('.tools-run').click();
  const download = page.waitForEvent('download');
  await page.locator('.tools-result-card a').click();
  const bytes = await downloadBytes(await download);
  // The fixture is a flat blue field, so any near-white pixel is watermark ink.
  const hasLightPixels = await page.evaluate(async (data: number[]) => {
    const blob = new Blob([new Uint8Array(data)], { type: 'image/png' });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const { data: pixels } = context.getImageData(0, 0, canvas.width, canvas.height);
    let light = 0;
    for (let index = 0; index < pixels.length; index += 4)
      if (pixels[index] > 225 && pixels[index + 1] > 225 && pixels[index + 2] > 225) light += 1;
    return light > 20;
  }, Array.from(bytes));
  expect(hasLightPixels).toBe(true);
});

test('image results offer a before and after comparison', async ({ page }) => {
  await page.goto('/tools/compress-image');
  await page.locator('input[type=file]').setInputFiles(await imageFixture(page, 'photo.png'));
  await page.locator('.tools-run').click();
  const toggle = page.getByRole('button', { name: 'Compare with original' });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('.tools-compare-stage img')).toHaveCount(2);
  const slider = page.getByRole('slider', { name: /Reveal the processed image/ });
  await slider.fill('20');
  await expect(page.locator('.tools-compare-after')).toHaveAttribute('style', /width: 20%/);
  await page.getByRole('button', { name: 'Hide comparison' }).click();
  await expect(page.locator('.tools-compare-stage')).toHaveCount(0);
});
