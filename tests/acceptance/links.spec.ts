import { expect, test } from '@playwright/test';
import { PAGE_PATHS, PAGES } from './pages.ts';

// Redirects hide broken links, so every internal link on every page must land on one of the
// 14 pages without redirecting (DESIGN.md §4.1, §4.13).
test('no internal link on any page redirects', async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? '').origin;
  // Target path → the pages that link to it.
  const targets = new Map<string, Set<string>>();

  for (const { path } of PAGES) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((a) => (a as HTMLAnchorElement).href));
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== origin) continue;
      targets.set(url.pathname, (targets.get(url.pathname) ?? new Set()).add(path));
    }
  }

  expect(targets.size).toBeGreaterThan(0);
  for (const [target, linkedFrom] of targets) {
    const from = [...linkedFrom].join(', ');
    expect(PAGE_PATHS.has(target), `${target} (linked from ${from}) is not one of the 14 pages`).toBe(true);
    await page.goto(target);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(new URL(page.url()).pathname, `${target} (linked from ${from}) redirected`).toBe(target);
  }
});

test('card and related-card links navigate in the app', async ({ page }) => {
  await page.goto('/vaccines');
  await page.getByRole('link', { name: 'Mpox', exact: true }).click();
  await expect(page).toHaveURL('/vaccines/mpox');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mpox');
  await page.goBack();
  await expect(page).toHaveURL('/vaccines');
});
