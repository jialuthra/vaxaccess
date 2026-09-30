import { expect, test, type Page } from '@playwright/test';
import { LISTINGS } from './pages.ts';

const SUMMARY = '3 instances · 1 page · Page 1 of 1';

const cards = (page: Page) => page.getByRole('article');
const cardNames = (page: Page) => cards(page).getByRole('heading', { level: 2 }).allTextContents();

for (const { path, noun } of LISTINGS) {
  test.describe(path, () => {
    test(`shows three cards with unique, decoded photos and five attributes @smoke`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(SUMMARY)).toBeVisible();
      await expect(page.getByText(`Showing 3 of 3 ${noun}`)).toBeVisible();
      await expect(cards(page)).toHaveCount(3);

      const sources = new Set<string>();
      for (const card of await cards(page).all()) {
        const image = card.getByRole('img');
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
        sources.add((await image.getAttribute('src')) ?? '');
        await expect(card.locator('dt')).toHaveCount(5);
        await expect(card.getByRole('link', { name: /View details/ })).toBeVisible();
      }
      expect(sources.size).toBe(3);
    });

    test('sorts Z–A and filters without changing the catalog summary', async ({ page }) => {
      await page.goto(path);
      const ascending = await cardNames(page);
      await page.getByLabel('Direction').selectOption({ label: 'Z–A' });
      expect(await cardNames(page)).toEqual([...ascending].reverse());

      const first = ascending[0] ?? '';
      const firstCard = cards(page).filter({ has: page.getByRole('heading', { name: first, exact: true }) });
      const firstValue = (await firstCard.locator('dd').first().textContent()) ?? '';
      const firstLabel = (await firstCard.locator('dt').first().textContent()) ?? '';
      await page.getByLabel(firstLabel, { exact: true }).fill(`  ${firstValue.toUpperCase()}  `);
      await expect(page.getByText(new RegExp(`Showing [12] of 3 ${noun}`))).toBeVisible();
      expect(await cardNames(page)).toContain(first);
      await expect(page.getByText(SUMMARY)).toBeVisible();
    });

    test('shows a zero-match message and clears filters but keeps the sort', async ({ page }) => {
      await page.goto(path);
      await page.getByLabel('Direction').selectOption({ label: 'Z–A' });
      const descending = await cardNames(page);
      const firstFilter = page.getByRole('searchbox').first();
      await firstFilter.fill('no record contains this text');
      await expect(page.getByText(`No ${noun} match these filters.`)).toBeVisible();
      await expect(page.getByText(`Showing 0 of 3 ${noun}`)).toBeVisible();

      await page.getByRole('button', { name: 'Clear filters' }).last().click();
      await expect(firstFilter).toHaveValue('');
      expect(await cardNames(page)).toEqual(descending);
    });
  });
}

test('past opportunities are labeled on their cards', async ({ page }) => {
  await page.goto('/opportunities');
  for (const card of await cards(page).all()) {
    await expect(card.getByText('Past activity')).toBeVisible();
  }
});
