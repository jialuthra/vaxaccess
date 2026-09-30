import { expect, test, type Page } from '@playwright/test';
import { PAGES } from './pages.ts';

/** Number of distinct card columns in the listing grid. */
async function columnCount(page: Page): Promise<number> {
  const lefts = await page
    .getByRole('article')
    .evaluateAll((articles) => articles.map((article) => Math.round(article.getBoundingClientRect().left)));
  return new Set(lefts).size;
}

for (const [label, width, columns] of [
  ['phone', 375, 1],
  ['tablet', 800, 2],
  ['desktop', 1280, 3],
] as const) {
  test(`${label} layout shows ${columns} card column(s)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/vaccines');
    await expect(page.getByRole('article')).toHaveCount(3);
    expect(await columnCount(page)).toBe(columns);
  });
}

test('no page scrolls horizontally on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  for (const { path } of PAGES) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
});
