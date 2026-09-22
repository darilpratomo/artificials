import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { strFromU8, unzipSync } from 'fflate';

test('PDF to Word preserves adjacent font runs and real word gaps', async ({ page }) => {
  const source = await PDFDocument.create();
  const regular = await source.embedFont(StandardFonts.Helvetica);
  const bold = await source.embedFont(StandardFonts.HelveticaBold);
  const sheet = source.addPage([400, 300]);
  // PDF drawing operations split words at style changes. The genuine word gap
  // is encoded geometrically, with no explicit space in any of these strings.
  let x = 24;
  for (const [text, font, gap] of [
    ['H', bold, 0],
    ['ello', regular, regular.widthOfTextAtSize(' ', 12)],
    ['world', bold, 0],
    ['!', regular, 0],
  ] as const) {
    sheet.drawText(text, { font, size: 12, x, y: 250 });
    x += font.widthOfTextAtSize(text, 12) + gap;
  }
  // Number fragments must not gain spaces either.
  sheet.drawText('12', { font: bold, size: 12, x: 24, y: 220 });
  sheet.drawText('.50', {
    font: regular,
    size: 12,
    x: 24 + bold.widthOfTextAtSize('12', 12),
    y: 220,
  });

  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  // Suppress the one-per-session logo intro so it never covers the page under
  // test. The intro has its own suite.
  await page.addInitScript(() => sessionStorage.setItem('artificialsIntroPlayed', 'true'));
  await page.route('**/api/catalog/summary', (route) =>
    route.fulfill({
      json: JSON.parse(readFileSync('public/data/catalog-summary.json', 'utf8')),
    }),
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: { auth: false, ai: false, billing: false, supportEmail: 'support@artificials.net' },
    }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (route) => route.fulfill({ json: { articles: [] } }));
  await page.goto('/tools/pdf-to-word');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'mixed-fonts.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await source.save()),
  });
  await page.getByRole('button', { name: 'Create Word document' }).click();
  const link = page.getByRole('link', { name: 'Download', exact: true });
  await expect(link).toBeVisible({ timeout: 30_000 });
  const downloadPromise = page.waitForEvent('download');
  await link.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('mixed-fonts-editable-text.docx');
  const document = strFromU8(
    unzipSync(readFileSync((await download.path())!))['word/document.xml'],
  );
  expect(document).toContain('Hello world!');
  expect(document).toContain('12.50');
  expect(document).not.toContain('H ello');
  expect(document).not.toContain('Hello world !');
  expect(document).not.toContain('12 .50');
});
