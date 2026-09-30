import { expect, test } from '@playwright/test';

// Shared shell (DESIGN.md §4.2): responsive navigation and the skip link.
test.describe('shared shell', () => {
  test('phone: the menu button reveals the navigation @smoke', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const toggle = nav.getByRole('button', { name: 'Menu' });
    const sites = nav.getByRole('link', { name: 'Sites', exact: true });

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(sites).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await sites.click();
    await expect(page).toHaveURL('/sites');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vaccination sites');
    await expect(sites).toBeHidden();
  });

  test('desktop: links are visible without a menu button @smoke', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/vaccines/mpox');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('button', { name: 'Menu' })).toBeHidden();
    await expect(nav.getByRole('link', { name: 'Vaccines', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('the first Tab reaches the skip link, which moves focus to main @smoke', async ({ page, browserName }) => {
    // WebKit skips links on Tab unless the OS "Tab highlights each item" setting is on.
    test.skip(browserName === 'webkit', 'WebKit does not tab to links by default');
    await page.goto('/sites');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
  });
});
