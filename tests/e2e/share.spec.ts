import { test, expect } from '@playwright/test';

// Artificials Share (the studio's sharing app): its help page and privacy policy, linked from its store listings.
test('Artificials Share help and privacy pages, in English and Indonesian', async ({ page }) => {
  await page.goto('/share');
  await expect(page.locator('main h1')).toHaveText('Help.');
  await expect(page.locator('.contact-card a')).toHaveAttribute(
    'href',
    'mailto:support@artificials.net',
  );
  await page.getByRole('combobox', { name: 'Language of this page' }).click();
  await page.getByRole('option', { name: 'Bahasa Indonesia' }).click();
  await expect(page).toHaveURL(/\/share\?lang=id$/);
  await expect(page.locator('main h1')).toHaveText('Bantuan.');
  await page.getByRole('link', { name: /Kebijakan privasi/ }).click();
  await expect(page).toHaveURL(/\/share\/privacy\?lang=id$/);
  await expect(page.locator('main h1')).toHaveText('Kebijakan privasi.');
  await expect(page.locator('main .prose h2')).toHaveCount(7);
  await page.goto('/share/privacy?lang=xx'); // an unknown language falls back to English
  await expect(page.locator('main h1')).toHaveText('Privacy policy.');
});
