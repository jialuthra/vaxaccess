import { expect, test } from '@playwright/test';
import { PAGES } from './pages.ts';

test.describe('routes', () => {
  for (const { path, heading } of PAGES) {
    test(`${path} loads directly and after a refresh @smoke`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);

      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      expect(new URL(page.url()).pathname).toBe(path);
    });
  }

  test('an unknown path redirects to Home, replacing history', async ({ page }) => {
    await page.goto('/sites');
    await page.goto('/no-such-page');
    await expect(page).toHaveURL('/');
    await page.goBack();
    await expect(page).toHaveURL('/sites');
  });

  for (const [kind, singular] of [
    ['sites', 'site'],
    ['vaccines', 'vaccine'],
    ['opportunities', 'opportunity'],
  ] as const) {
    test(`an unknown ${singular} ID redirects to its listing with an explanation`, async ({ page }) => {
      await page.goto(`/${kind}/no-such-id`);
      await expect(page).toHaveURL(`/${kind}`);
      await expect(page.getByRole('status').filter({ hasText: `We couldn't find that ${singular}.` })).toBeVisible();
    });
  }
});
