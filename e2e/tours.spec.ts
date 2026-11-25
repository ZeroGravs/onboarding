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

test('wraps long action labels without making the popover scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 600 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  const buttons = dialog.getByRole('button');
  await expect(buttons).toHaveCount(3);
  await buttons.evaluateAll((elements) => {
    const labels = ['Rondleiding overslaan', 'Vorige stap', 'Rondleiding afronden'];
    elements.forEach((button, index) => {
      button.textContent = labels[index]!;
    });
  });

  await expect(dialog).toHaveCSS('overflow', 'visible');
  await expect(async () => {
    const panel = (await dialog.boundingBox())!;
    const actions = await Promise.all((await buttons.all()).map((button) => button.boundingBox()));
    expect(actions[2]!.y).toBeGreaterThan(actions[0]!.y);
    for (const action of actions) {
      expect(action!.x).toBeGreaterThan(panel.x);
      expect(action!.x + action!.width).toBeLessThan(panel.x + panel.width);
      expect(action!.y + action!.height).toBeLessThan(panel.y + panel.height);
    }
  }).toPass();
});

test('shows hover feedback and respects themed button colors', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start onboarding', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();

  for (const [label, variant] of [
    ['Skip', 'skip'],
    ['Back', 'back'],
    ['Done', 'primary'],
  ] as const) {
    const button = dialog.getByRole('button', { name: label, exact: true });
    await page.mouse.move(0, 0);
    const background = await button.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await button.hover();
    await expect(button).not.toHaveCSS('background-color', background);
    await dialog.evaluate((element, name) => {
      element.style.setProperty(`--onboarding-${name}-hover-background`, '#123456');
      element.style.setProperty(`--onboarding-${name}-hover-text`, '#fff');
    }, variant);
    await expect(button).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
  }
});

test('keeps the arrow on the straight edge with a wide target and wrapped copy', async ({
  page,
}) => {
  await page.setViewportSize({ width: 555, height: 360 });
  await page.goto('/');
  await page.locator('[data-onboarding="welcome"]').evaluate((target) => {
    (target as HTMLElement).style.width = '200vw';
  });
  await page.getByRole('button', { name: 'Start onboarding', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const arrow = dialog.locator('.onboarding-arrow');
  await expect(async () => {
    const panel = (await dialog.boundingBox())!;
    const caret = (await arrow.boundingBox())!;
    const radius = await dialog.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
    );
    expect(caret.x).toBeGreaterThanOrEqual(panel.x + radius);
    expect(caret.x + caret.width).toBeLessThanOrEqual(panel.x + panel.width - radius);
    const caretCenterY = caret.y + caret.height / 2;
    const distanceToEdge = Math.min(
      Math.abs(caretCenterY - panel.y),
      Math.abs(caretCenterY - (panel.y + panel.height)),
    );
    expect(distanceToEdge).toBeLessThan(1);
  }).toPass();
});
