import { test, expect } from '@playwright/test';

// Cozy Mood (the studio's game): its help page and privacy policy, linked from its store listings.
test('Cozy Mood help and privacy pages, with a choice of language', async ({ page }) => {
  await page.goto('/cozymood');
  await expect(page.locator('main h1')).toHaveText('Help.');
  await expect(page.locator('.contact-card a')).toHaveAttribute(
    'href',
    'mailto:support@artificials.net',
  );
  await page.getByRole('combobox', { name: 'Language of this page' }).click();
  await page.getByRole('option', { name: 'Bahasa Indonesia' }).click();
  await expect(page).toHaveURL(/\/cozymood\?lang=id$/);
  await expect(page.locator('main h1')).toHaveText('Bantuan.');
  await page.getByRole('link', { name: /Kebijakan privasi/ }).click();
  await expect(page).toHaveURL(/\/cozymood\/privacy\?lang=id$/);
  await expect(page.locator('main h1')).toHaveText('Kebijakan privasi.');
  await expect(page.locator('main .prose h2')).toHaveCount(6);
  await page.goto('/cozymood/privacy?lang=ja');
  await expect(page.locator('main h1')).toHaveText('プライバシーポリシー');
  await expect(page.locator('.cozy-page')).toHaveAttribute('lang', 'ja');
  await page.goto('/cozymood/privacy?lang=xx'); // an unknown language falls back to English
  await expect(page.locator('main h1')).toHaveText('Privacy policy.');
});
