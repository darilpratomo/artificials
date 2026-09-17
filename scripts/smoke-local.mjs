import { chromium, devices } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.SMOKE_URL || 'http://localhost:8787';
const request = (url, options = {}) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
const summary = await request(base + '/api/catalog/summary').then((r) => {
  assert.equal(r.status, 200);
  return r.json();
});
assert.ok(summary.totalModels > 100);
assert.ok(summary.totalProviders > 5);
assert.ok(summary.featured.length > 0);
for (const path of ['/admin', '/admin.md', '/_private/invalid-token']) {
  assert.equal((await request(base + path)).status, 404, path);
}
const rejected = await request(base + '/api/auth/logout', {
  method: 'POST',
  headers: { origin: 'https://example.invalid' },
});
assert.equal(rejected.status, 403);
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch();
for (const [name, options] of [
  ['desktop', { viewport: { width: 1440, height: 1000 } }],
  ['mobile', { ...devices['iPhone 13'] }],
]) {
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Intelligence. In perspective.' }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `test-results/live-home-${name}.png` });
  await page.goto(base + '/models', { waitUntil: 'networkidle' });
  await page.locator('.model-card').first().waitFor();
  await page.getByRole('searchbox', { name: 'Search models' }).fill('gpt-6-astra');
  await page.waitForTimeout(500);
  await page.locator('.model-card').first().waitFor();
  await page.screenshot({ path: `test-results/live-models-${name}.png` });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  await page.close();
}
await browser.close();
console.log(
  `Live-source smoke passed: ${summary.totalModels} offerings / ${summary.totalProviders} providers, private routes blocked, cross-origin writes blocked, desktop/mobile render cleanly.`,
);
