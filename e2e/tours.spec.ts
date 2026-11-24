import { expect, test as base } from '@playwright/test';

const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

test('navigates across pages, resumes after reload, and completes accessibly', async ({ page }) => {
  await page.goto('/');
  const launcher = page.getByRole('button', { name: 'Start onboarding', exact: true });
  // Safari pointer clicks do not focus buttons. Start from known keyboard focus.
  await launcher.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Step 1 of 2');
  await expect(dialog).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(dialog).toContainText('Step 2 of 2');
  await page.reload();
  await launcher.press('Enter');
  await expect(dialog).toContainText('Step 2 of 2');
  await dialog.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(dialog).toContainText('Step 1 of 2');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(dialog).toContainText('Step 2 of 2');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start onboarding', exact: true })).toBeFocused();
});

test('keeps the popover in the viewport and supports Escape cleanup', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(async () => {
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(701);
  }).toPass();
  await expect(async () => {
    const target = await page.locator('[data-onboarding="welcome"]').boundingBox();
    const spotlight = page.locator('.onboarding-overlay mask rect[fill="black"]');
    const hole = await spotlight.evaluate((element) => ({
      x: Number(element.getAttribute('x')),
      y: Number(element.getAttribute('y')),
      width: Number(element.getAttribute('width')),
      height: Number(element.getAttribute('height')),
    }));
    expect(target).not.toBeNull();
    expect(hole.x).toBeLessThanOrEqual(target!.x);
    expect(hole.y).toBeLessThanOrEqual(target!.y);
    expect(hole.x + hole.width).toBeGreaterThanOrEqual(target!.x + target!.width);
    expect(hole.y + hole.height).toBeGreaterThanOrEqual(target!.y + target!.height);
  }).toPass();
  const lastButton = dialog.getByRole('button', { name: 'Next', exact: true });
  await lastButton.focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Skip', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-onboarding-kit]')).toHaveCount(0);
});
