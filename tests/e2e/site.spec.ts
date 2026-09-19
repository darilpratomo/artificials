import { test, expect, type Page } from '@playwright/test';
import type { CatalogPage, CatalogSummary, ModelRecord } from '../../shared/catalog';

// Deliberately fictional browser-test fixtures, never bundled into the public catalog.
const fixtureModel = (name: string, overrides: Partial<ModelRecord> = {}): ModelRecord => ({
  id: `openai/fixture-${name.toLowerCase()}`,
  modelId: `fixture-${name.toLowerCase()}`,
  name: `Fixture ${name}`,
  provider: 'OpenAI',
  providerId: 'openai',
  contextWindow: 16000,
  inputPrice: 9,
  outputPrice: 18,
  releaseDate: '2020-01-01',
  modalities: ['text'],
  inputModalities: ['text'],
  outputModalities: ['text'],
  reasoning: false,
  openWeights: false,
  sourceUrl: 'https://example.test/model-source',
  providerUrl: 'https://example.test/provider',
  ...overrides,
});
const fixtureModels: ModelRecord[] = [
  fixtureModel('Atlas', {
    contextWindow: 128000,
    inputPrice: 1.2,
    outputPrice: 4,
    releaseDate: '2026-01-04',
    modalities: ['image', 'text'],
    inputModalities: ['image', 'text'],
    reasoning: true,
  }),
  fixtureModel('Boreal', {
    id: 'google/fixture-boreal',
    provider: 'Google',
    providerId: 'google',
    contextWindow: 200000,
    inputPrice: 0.4,
    outputPrice: 2,
    releaseDate: '2026-01-03',
    modalities: ['image', 'text'],
    inputModalities: ['image', 'text'],
  }),
  fixtureModel('Cipher', {
    id: 'anthropic/fixture-cipher',
    provider: 'Anthropic',
    providerId: 'anthropic',
    contextWindow: 64000,
    inputPrice: null,
    outputPrice: null,
    releaseDate: '2026-01-02',
  }),
  fixtureModel('Delta', {
    contextWindow: 1000000,
    inputPrice: 2,
    outputPrice: 6,
    releaseDate: '2026-01-01',
    openWeights: true,
  }),
  ...Array.from({ length: 25 }, (_, i) =>
    fixtureModel(`Archive ${String(i + 1).padStart(2, '0')}`),
  ),
];
const fixtureSummary: CatalogSummary = {
  updatedAt: '2026-09-17T00:00:00.000Z',
  source: 'Browser test fixture',
  sourceUrl: 'https://example.test/catalog',
  coverage: 'Fictional fixture records for browser tests only.',
  benchmarkStatus: 'unavailable',
  totalModels: fixtureModels.length,
  totalProviders: 3,
  modelCount: fixtureModels.length,
  providerCount: 3,
  featured: fixtureModels.slice(0, 4),
  reasoningModels: 1,
  openWeightModels: 1,
  providers: ['openai', 'google', 'anthropic'].map((id) => ({
    id,
    name: fixtureModels.find((model) => model.providerId === id)!.provider,
    modelCount: fixtureModels.filter((model) => model.providerId === id).length,
    sourceUrl: 'https://example.test/provider',
    logo: `/providers/${id}.svg`,
  })),
};

function fixturePage(url: URL): CatalogPage {
  const q = url.searchParams;
  const query = (q.get('query') || '').toLowerCase();
  const ids = q.get('ids')?.split(',');
  const rows = fixtureModels.filter(
    (model) =>
      (!query ||
        `${model.name} ${model.provider} ${model.modelId}`.toLowerCase().includes(query)) &&
      (!q.get('provider') || model.providerId === q.get('provider')) &&
      (!q.get('modality') || model.modalities.includes(q.get('modality')!)) &&
      (!q.has('reasoning') || model.reasoning === (q.get('reasoning') === 'true')) &&
      (!q.has('openWeights') || model.openWeights === (q.get('openWeights') === 'true')) &&
      (!ids || ids.includes(model.id)),
  );
  const sort = (q.get('sort') || 'newest') as CatalogPage['sort'];
  rows.sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'newest') return (b.releaseDate || '').localeCompare(a.releaseDate || '');
    const key =
      sort === 'context' ? 'contextWindow' : sort === 'input-price' ? 'inputPrice' : 'outputPrice';
    const left = a[key];
    const right = b[key];
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return sort === 'context' ? right - left : left - right;
  });
  const limit = Math.min(40, Math.max(1, Number(q.get('limit') || 24)));
  const pageCount = Math.max(1, Math.ceil(rows.length / limit));
  const page = Math.min(pageCount, Math.max(1, Number(q.get('page') || 1)));
  return {
    ...fixtureSummary,
    models: rows.slice((page - 1) * limit, page * limit),
    total: rows.length,
    page,
    pageCount,
    limit,
    sort,
  };
}

async function expectFitsViewport(page: Page, context = '') {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    context,
  ).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('artificials-analytics-consent-v1', 'denied'),
  );
  await page.route('**/api/config', (route) =>
    route.fulfill({
      json: {
        auth: false,
        google: false,
        billing: false,
        ai: false,
        legalReady: false,
        supportEmail: 'support@artificials.net',
      },
    }),
  );
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  await page.route('**/api/articles', (route) =>
    route.fulfill({ status: 503, json: { error: 'Editorial fixture uses bundled guides' } }),
  );
  await page.route('**/api/catalog**', (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: url.pathname === '/api/catalog/summary' ? fixtureSummary : fixturePage(url),
    });
  });
});

test('home navigation, responsive layout, and private CMS discovery', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Intelligence. In perspective.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fixture Atlas', exact: true })).toBeVisible();
  await expectFitsViewport(page);
  await expect(
    page.locator('header a[href^="/_private"], footer a[href^="/_private"], a[href="/admin"]'),
  ).toHaveCount(0);
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('link', { name: 'Explore AI models', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Find your next model.' })).toBeVisible();
  await expect(page.locator('.model-card')).toHaveCount(24);
  await expectFitsViewport(page);
  expect(errors).toEqual([]);
});

test('model search, provider and modality filters, and pagination', async ({ page }) => {
  await page.goto('/models');
  await expect(page.locator('.model-card')).toHaveCount(24);
  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.locator('.model-card')).toHaveCount(5);
  await page.getByRole('searchbox', { name: 'Search models', exact: true }).fill('Atlas');
  await expect(page.locator('.model-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Fixture Atlas', exact: true })).toBeVisible();
  // Change the next filter immediately: rapid edits must not restore the cleared query.
  await page.getByRole('searchbox', { name: 'Search models', exact: true }).fill('');
  await page.getByRole('combobox', { name: 'Provider', exact: true }).click();
  await page.getByRole('option', { name: /^Google/ }).click();
  await expect(page.locator('.model-card')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Fixture Boreal', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Provider', exact: true }).click();
  await page.getByRole('option', { name: /^All providers/ }).click();
  await page.getByRole('combobox', { name: 'Modality', exact: true }).click();
  await page.getByRole('option', { name: /^Image/ }).click();
  await expect(page.locator('.model-card')).toHaveCount(2);
  await expectFitsViewport(page);
});

test('comparison limit, saved selections, removal, and clearing', async ({ page }) => {
  await page.goto('/models');
  for (const name of ['Fixture Atlas', 'Fixture Boreal', 'Fixture Cipher']) {
    await page.getByRole('button', { name: `Compare ${name}`, exact: true }).click();
  }
  await expect(
    page.getByRole('button', { name: 'Compare Fixture Delta', exact: true }),
  ).toBeDisabled();
  await page.goto('/compare');
  await expect(page.getByRole('heading', { name: 'Side by side. Beyond the hype.' })).toBeVisible();
  await page.reload();
  for (const name of ['Fixture Atlas', 'Fixture Boreal', 'Fixture Cipher']) {
    await expect(page.getByRole('button', { name: `Remove ${name}`, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Not reported', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Remove Fixture Boreal', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Remove Fixture Boreal', exact: true }),
  ).toHaveCount(0);
  await expectFitsViewport(page);
  await page.getByRole('button', { name: 'Clear comparison', exact: true }).click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('artificials-compare') || '[]')),
  ).toEqual([]);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Remove Fixture/ })).toHaveCount(0);
});

test('corrupted saved comparison recovers without crashing', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('artificials-compare', '{broken json'));
  await page.goto('/models');
  await page.getByRole('button', { name: 'Compare Fixture Atlas', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Remove Fixture Atlas', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('artificials-compare') || '[]').length,
    ),
  ).toBe(1);
});

test('rankings distinguish context capacity, price, and missing data', async ({ page }) => {
  await page.goto('/leaderboard?view=specs');
  await expect(page.getByRole('heading', { name: 'A metric. A clear comparison.' })).toBeVisible();
  const rows = page.locator('tbody tr');
  await expect(rows.first()).toContainText('Fixture Delta');
  await page.getByLabel('Ranking metric', { exact: true }).click();
  await page.getByRole('option', { name: /^Lowest input price/ }).click();
  await expect(rows.first()).toContainText('Fixture Boreal');
  await page.getByLabel('Ranking metric', { exact: true }).click();
  await page.getByRole('option', { name: /^Lowest output price/ }).click();
  await expect(rows.first()).toContainText('Fixture Boreal');
  await page.getByRole('combobox', { name: 'Provider', exact: true }).click();
  await page.getByRole('option', { name: /^Anthropic/ }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Fixture Cipher');
  await expect(rows.first().locator('.rank-number')).toHaveText('—');
  await expect(rows.first().getByText('Not reported', { exact: true })).toBeVisible();
  await expectFitsViewport(page);
});

test('studio example, database, static sandbox and complete project download', async ({
  page,
}, testInfo) => {
  await page.goto('/studio');
  await page.getByRole('button', { name: 'Explore an example' }).click();
  await expect(page.getByTitle('Isolated app design preview')).toHaveAttribute('sandbox', '');
  await expect(page.getByTitle('Isolated app design preview')).toHaveAttribute(
    'referrerpolicy',
    'no-referrer',
  );
  await page.getByRole('button', { name: 'Database', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'books', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Code', exact: true }).click();
  await expect(page.locator('.code-preview')).toContainText("api.create('books'");
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Mobile preview', exact: true }).click();
  await expectFitsViewport(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download complete project' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('the-reading-room.zip');
  await download.saveAs(`test-results/demo-${testInfo.project.name}.zip`);
  await page.screenshot({
    path: `test-results/studio-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test('editorial search, primary sources and privacy preferences', async ({ page }) => {
  await page.goto('/news');
  await page.getByRole('textbox', { name: 'Search articles', exact: true }).fill('benchmark');
  await expect(page.locator('.learn-card')).toHaveCount(1);
  await page.locator('.learn-card').click();
  await expect(
    page.getByRole('heading', { name: 'Read beyond the position', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Stanford CRFM/ })).toHaveAttribute(
    'href',
    'https://crfm.stanford.edu/2022/11/17/helm.html',
  );
  await page.evaluate(() => localStorage.setItem('artificials-compare', '[{"id":"old"}]'));
  await page.goto('/privacy');
  await page.getByRole('button', { name: 'Clear saved comparison', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Saved comparison cleared', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('artificials-compare'))).toBeNull();
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: '4. Studio plans and renewals' })).toBeVisible();
  await expect(page.getByText(/Pre-launch draft/)).toBeVisible();
});

test('pricing and account screens reflect unavailable services', async ({ page }) => {
  await page.goto('/pricing');
  await expect(page.getByText('30 AI generations / month', { exact: true })).toBeVisible();
  await expect(page.getByText(/Studio subscriptions are coming soon/)).toBeVisible();
  await page.getByRole('button', { name: 'Choose Pro', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole('button', { name: 'Continue with email', exact: true }),
  ).toBeDisabled();
  await page.goto('/dashboard');
  await expect(
    page.getByRole('link', { name: 'Sign in to your account', exact: true }),
  ).toBeVisible();
  await page.goto('/not-a-page');
  await expect(page.getByRole('heading', { name: 'A little off the beaten path.' })).toBeVisible();
});

test('reduced motion keeps the scroll journey readable without horizontal movement', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const journey = page.getByRole('region', { name: 'From discovery to creation' });
  await journey.scrollIntoViewIfNeeded();
  await expect(page.locator('.journey-track')).toHaveCSS('transform', 'none');
  await expect(page.locator('.journey-sticky')).not.toHaveCSS('position', 'sticky');
  await expect(page.locator('.reveal-ready:not(.revealed)')).toHaveCount(0);
  for (const title of ['Discover.', 'Understand.', 'Create.']) {
    await expect(journey.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  await expectFitsViewport(page);
});

test('main pages are accessible and fit desktop and mobile', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of [
    '/',
    '/models',
    '/leaderboard',
    '/compare',
    '/news',
    '/studio',
    '/pricing',
    '/login',
    '/about',
    '/privacy',
    '/terms',
  ]) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    if (route === '/models') await expect(page.locator('.model-card')).toHaveCount(24);
    if (route === '/leaderboard')
      await expect(page.locator('.benchmark-row').first()).toBeVisible();
    await expectFitsViewport(page, route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect
      .soft(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
        route,
      )
      .toEqual([]);
  }
  await page.goto('/');
  await expect(page.locator('main h1')).toBeVisible();
  await page.screenshot({
    path: `test-results/viewport-${testInfo.project.name}.png`,
    scale: 'css',
  });
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('link', { name: 'Pricing', exact: true })
      .click();
    await expect(page.locator('main h1')).toHaveText('Build more. Stay in control.');
    await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  }
});
