import { defineConfig, devices } from '@playwright/test';
const production = process.env.E2E_PRODUCTION === '1';
const port = production ? 4173 : 5173;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
    {
      name: 'mobile-safari',
      testMatch: [
        'responsive.spec.ts',
        'academy.spec.ts',
        'analytics.spec.ts',
        'tools.spec.ts',
        'word-tools.spec.ts',
        'pdf-text.spec.ts',
        'home.spec.ts',
        'releases.spec.ts',
        'models.spec.ts',
        'coding-agents.spec.ts',
        'trends.spec.ts',
        'image-models.spec.ts',
        'video-models.spec.ts',
        'model-finder.spec.ts',
        'model-profile.spec.ts',
        'compare.spec.ts',
        'changes.spec.ts',
        'search.spec.ts',
        'makers.spec.ts',
      ],
      use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' },
    },
  ],
  webServer: {
    command: `npm run ${production ? 'preview' : 'dev'} -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
  reporter: 'list',
});
