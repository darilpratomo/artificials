import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const origin = 'https://artificials.net';
test.beforeEach(async ({ page, request, baseURL }) => {
  // Production hostname with local built assets. Never send test visits to GA.
  await page.route('https://artificials.net/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      const json =
        url.pathname === '/api/session'
          ? { user: null }
          : url.pathname === '/api/articles'
            ? { articles: [] }
            : {};
      await route.fulfill({ json });
      return;
    }
    const response = await request.get(baseURL + url.pathname + url.search);
    await route.fulfill({ response });
  });
  await page.route('https://www.googletagmanager.com/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: '/* Analytics script deliberately stubbed in tests. */',
    }),
  );
  await page.route('https://**.google-analytics.com/**', (route) => route.abort());
});
test.afterEach(async ({ page }) => {
  // A font or image still loading when a test ends must not fail it.
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});
async function views(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    (window as unknown as { dataLayer: unknown[][] }).dataLayer
      .map((item) => Array.from(item))
      .filter((item) => item[0] === 'event' && item[1] === 'page_view'),
  );
}
test('opt-in sends one sanitized view per public page and withdrawal stops tracking', async ({
  page,
}) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Production build test');
  await page.goto(origin + '/?email=private@example.test#secret');
  await expect(page.getByRole('region', { name: 'Analytics preferences' })).toBeVisible();
  expect(await page.locator('#artificials-google-tag').count()).toBe(0);
  expect(await views(page)).toHaveLength(0);
  await page.getByRole('button', { name: 'Allow analytics', exact: true }).click();
  await expect(page.locator('#artificials-google-tag')).toHaveCount(1);
  await expect.poll(async () => (await views(page)).length).toBe(1);
  expect(JSON.stringify(await views(page))).not.toMatch(/private@example|secret/);
  await page.locator('.site-footer a[href="/about"]').click();
  await expect.poll(async () => (await views(page)).length).toBe(2);
  expect((await views(page))[1][2]).toMatchObject({
    page_location: origin + '/about',
    page_referrer: origin + '/',
  });
  await page.evaluate(() => window.artificialsAnalytics?.page(null));
  expect(
    await page.evaluate(
      () => (window as unknown as Record<string, unknown>)['ga-disable-G-YR7B1XDDLM'],
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Analytics preferences', exact: true }).click();
  await page.evaluate(() => {
    document.cookie = '_ga=test; path=/';
  });
  await page.getByRole('button', { name: 'Decline analytics', exact: true }).click();
  expect(await page.evaluate(() => document.cookie)).not.toContain('_ga=');
  const count = (await views(page)).length;
  await page.locator('.site-footer a[href="/news"]').click();
  expect(await views(page)).toHaveLength(count);
  await page.reload();
  await expect(page.locator('#artificials-google-tag')).toHaveCount(0);
  expect(await views(page)).toHaveLength(0);
});
test('consent controls are accessible and private routes never initialize a tag', async ({
  page,
}) => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Production build test');
  await page.goto(origin + '/');
  await expect(page.getByRole('region', { name: 'Analytics preferences' })).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include('.analytics-choice').analyze()).violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Decline analytics', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Analytics preferences' })).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem('artificials-analytics-consent-v1', 'granted'));
  await page.goto(origin + '/login?code=private-code');
  await expect(page.locator('#artificials-google-tag')).toHaveCount(0);
  expect(await views(page)).toHaveLength(0);
});
test('every built page has one bootstrap and CSP allows Analytics without inline scripts', () => {
  test.skip(process.env.E2E_PRODUCTION !== '1', 'Production build test');
  for (const file of [
    'index.html',
    'about.html',
    'login.html',
    'news/read-an-ai-benchmark.html',
    'learn/what-ai-actually-does.html',
  ]) {
    const html = readFileSync('dist/' + file, 'utf8');
    expect(html.match(/src="\/google-tag.js"/g)).toHaveLength(1);
  }
  const policy = readFileSync('public/_headers', 'utf8');
  const scriptPolicy = policy.match(/script-src ([^;]+)/)![1];
  expect(scriptPolicy).toContain('https://www.googletagmanager.com');
  expect(scriptPolicy).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(policy).toContain('https://*.google-analytics.com');
  // Cloudflare Web Analytics: its beacon script and its collection endpoint.
  expect(scriptPolicy).toContain('https://static.cloudflareinsights.com');
  expect(policy.match(/connect-src ([^;]+)/)![1]).toContain('https://cloudflareinsights.com');
});
