import { expect, test } from '@playwright/test';

// Each Vaccine detail has two media types: its photo and the APH video (DESIGN.md §4.8).
for (const id of ['influenza', 'covid-19', 'mpox']) {
  test(`/vaccines/${id} shows a decoded photo and the video embed @smoke`, async ({ page }) => {
    await page.goto(`/vaccines/${id}`);
    const photo = page.locator('.media-block img');
    await expect(photo).toHaveAttribute('src', `/images/vaccine-${id}.jpg`);
    await expect.poll(() => photo.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

    const video = page.locator('iframe[src^="https://www.youtube-nocookie.com/embed/-P_lgZFUHTs"]');
    await expect(video).toHaveAttribute('title', /Getting Immunized From A to Z/);
    await expect(page.getByRole('link', { name: /Watch on YouTube/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sites with documented vaccination activity' })).toBeVisible();
  });
}
