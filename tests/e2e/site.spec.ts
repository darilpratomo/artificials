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
  await expect(page.getByRole('heading', { name: 'Leaders right now', exact: true })).toBeVisible();
  await expectFitsViewport(page);
  await expect(
    page.locator('header a[href^="/_private"], footer a[href^="/_private"], a[href="/admin"]'),
  ).toHaveCount(0);
  await page.screenshot({ path: `test-results/home-${testInfo.project.name}.png`, fullPage: true });
  await page.locator('footer').getByRole('link', { name: 'Model directory', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compare AI models.' })).toBeVisible();
  // Provider listings keep one card per host; the comparison is the default view.
  await page.getByRole('button', { name: 'Provider listings' }).click();
  await expect(page).toHaveURL(/view=listings/);
  // The arrow opens the model's own page; the listing source has its own GitHub button.
  const card = page.locator('.model-card').first();
  await expect(card.getByRole('link', { name: /details$/ })).toHaveAttribute(
    'href',
    /^\/models\/[a-z0-9-]+$/,
  );
  await expect(card.getByRole('link', { name: /listing source on GitHub$/ })).toHaveAttribute(
    'target',
    '_blank',
  );
  await expect(page.locator('.model-card')).toHaveCount(24);
  await expectFitsViewport(page);
  expect(errors).toEqual([]);
});

test('model search, provider and modality filters, and pagination', async ({ page }) => {
  await page.goto('/models?view=listings');
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

test('older filtered links open the provider listings and stay there', async ({ page }) => {
  await page.goto('/models?query=Atlas');
  await expect(page.locator('.model-card')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search models', exact: true }).fill('');
  await expect(page.locator('.model-card')).toHaveCount(24);
  await expect(page).toHaveURL(/view=listings/);
  await expect(page.getByRole('button', { name: 'Provider listings' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('comparison limit, saved selections, removal, and clearing', async ({ page }) => {
  await page.goto('/models?view=listings');
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
  await page.goto('/models?view=listings');
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
  await expect(page.getByRole('heading', { name: '3. Lessons and free tools' })).toBeVisible();
  await expect(page.getByText(/free, non-commercial website/)).toBeVisible();
  await expect(page.getByText(/Studio|subscription|refund/i)).toHaveCount(0);
});

test('sign-in is only for editors and stays closed until it is set up', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Editor');
  await expect(page.getByText(/Everything else on Artificials is open to everyone/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue with email', exact: true }),
  ).toBeDisabled();
  await page.goto('/dashboard');
  await expect(page.getByRole('link', { name: 'Editor sign-in', exact: true })).toBeVisible();
  await page.goto('/not-a-page');
  await expect(page.getByRole('heading', { name: 'A little off the beaten path.' })).toBeVisible();
});

test('reduced motion keeps the home dashboard readable and inside the screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const name of ['Rankings', 'New releases', 'Every model']) {
    const heading = page.getByRole('heading', { level: 2, name, exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
  }
  await expectFitsViewport(page);
});

test('main pages are accessible and fit desktop and mobile', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of [
    '/',
    '/models?view=listings',
    '/leaderboard',
    '/compare',
    '/news',
    '/coding-agents',
    '/login',
    '/about',
    '/privacy',
    '/terms',
  ]) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    if (route === '/models?view=listings')
      await expect(page.locator('.model-card')).toHaveCount(24);
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
    // Each page in the phone menu has an icon, not a number.
    const menu = page.getByRole('navigation', { name: 'Mobile navigation' });
    const links = menu.locator('.mobile-menu-links a');
    await expect(menu.locator('.mobile-menu-links a svg.menu-link-icon')).toHaveCount(
      await links.count(),
    );
    expect(await links.allInnerTexts()).not.toContainEqual(expect.stringMatching(/^\d{2}/));
    await menu.getByRole('link', { name: 'Compare models', exact: true }).click();
    await expect(page).toHaveURL(/\/compare$/);
    await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  }
});

test('header menus group the analysis and resource pages', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The header menus show on wide screens');
  await page.goto('/');
  const header = page.locator('header.site-header');
  const analysis = header.getByRole('button', { name: 'Analysis', exact: true });
  await expect(analysis).toHaveAttribute('aria-expanded', 'false');
  await analysis.click();
  await expect(analysis).toHaveAttribute('aria-expanded', 'true');
  const rankings = header.getByRole('link', { name: /^Model rankings/ });
  await expect(rankings).toBeVisible();
  // The menu grows across in sections, not down in one long column.
  const sections = header.locator('.nav-group.is-open .nav-group-panel [role="group"]');
  await expect(sections).toHaveCount(3);
  const [first, second] = [
    (await sections.nth(0).boundingBox())!,
    (await sections.nth(1).boundingBox())!,
  ];
  expect(second.x).toBeGreaterThan(first.x + first.width - 1);
  expect(Math.abs(second.y - first.y)).toBeLessThan(2);
  // Escape closes the menu and returns focus to its button.
  await page.keyboard.press('Escape');
  await expect(analysis).toHaveAttribute('aria-expanded', 'false');
  await expect(analysis).toBeFocused();
  // The keyboard opens it and moves into the list.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(rankings).toBeFocused();
  await header.getByRole('button', { name: 'Resources', exact: true }).click();
  await expect(analysis).toHaveAttribute('aria-expanded', 'false');
  await header.getByRole('link', { name: /^Learn AI/ }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(header.getByRole('button', { name: 'Resources', exact: true })).toHaveClass(
    /active/,
  );
});
