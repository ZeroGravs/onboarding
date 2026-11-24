import { expect, test as base } from '@playwright/test';

const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error' && /hydration|mismatch/i.test(message.text())) {
          errors.push(message.text());
        }
      });
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

test('offers frameworks before the live demo and a copyable, complete React quickstart', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Five minutes');
  await expect(page.locator('.VPHomeHero .tagline')).toContainText('In-app product tours');
  const frameworks = await page.locator('.framework-grid').boundingBox();
  const demo = await page.locator('.live-tour').boundingBox();
  expect(frameworks!.y + frameworks!.height).toBeLessThan(demo!.y);
  for (const name of ['React', 'Next.js', 'Vue', 'Angular', 'Vanilla JS']) {
    const link = page.getByRole('link', { name: `${name} quickstart`, exact: true });
    await expect(link).toBeVisible();
    await expect(link.locator('svg path')).toHaveAttribute('d', /.+/);
    await expect(link.locator('.framework-mark')).toHaveAttribute('aria-hidden', 'true');
  }
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true });
  await page.getByRole('link', { name: 'React quickstart', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('React: your first tour');
  await expect(
    page.getByText('pnpm add @zero-lab/onboarding-react @zero-lab/onboarding', { exact: true }),
  ).toBeVisible();
  const example = page.locator('div.language-tsx').first();
  await expect(example).toContainText('<OnboardingProvider options={options}>');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await example.hover();
  await example.locator('button.copy').click();
  const copied = await page.evaluate(() => window.navigator.clipboard.readText());
  expect(copied).toContain("kit.start('welcome')");
  expect(copied).toContain('export default function App()');
});

test('keeps the consumer guide free of maintainer commands in both themes', async ({ page }) => {
  await page.goto('./getting-started/');
  await expect(page.locator('main')).not.toContainText('pnpm docs:dev');
  await expect(page.locator('main')).not.toContainText('pnpm --filter');
  await expect(page.getByRole('link', { name: 'Publishing', exact: true })).toHaveCount(0);
  for (const theme of ['dark', 'light'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle('dark', dark),
      theme === 'dark',
    );
    const icon = page.getByRole('link', { name: 'React quickstart', exact: true }).locator('svg');
    await expect(icon).toBeVisible();
    await expect(icon).toHaveCSS('color', 'rgb(97, 218, 251)');
  }
});

test('finds and opens a guide with local search', async ({ page }) => {
  await page.goto('./getting-started/');
  await page.locator('.VPNavBarSearch button').click();
  const search = page.locator('.VPLocalSearchBox');
  await expect(search).toBeVisible();
  await search.locator('input').first().fill('Resume or replay');
  await search.locator('a').filter({ hasText: 'Resume or replay' }).first().click();
  await expect(page).toHaveURL(/\/recipes#resume-or-replay$/);
  await expect(page.getByRole('heading', { name: /^Resume or replay/ })).toBeVisible();
});

test('animates and controls a three-step preview with the default tour design', async ({
  page,
}, testInfo) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  const preview = page.getByRole('region', { name: 'From code to your first tour' });
  await expect(preview).toBeVisible();
  const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
  const box = await preview.boundingBox();
  expect(box!.x).toBeGreaterThan(heading!.x + heading!.width);
  expect(box!.width).toBeGreaterThan(heading!.width);
  await preview.getByRole('button', { name: 'Replay animation' }).click();
  await page.clock.runFor(2000);
  await preview.getByRole('button', { name: 'Pause animation' }).click();
  const partial = await preview.locator('.hero-code').textContent();
  expect(partial).toContain('import');
  expect(partial).not.toContain("kit.start('welcome')");
  await page.clock.runFor(1000);
  await expect(preview.locator('.hero-code')).toHaveText(partial!);
  await preview.getByRole('button', { name: 'Resume animation' }).click();
  await page.clock.runFor(4000);
  await expect(preview).toHaveAttribute('data-phase', 'preview');
  await expect(preview.locator('.hero-code')).toContainText("kit.start('welcome')");
  expect(
    await preview
      .getByRole('region', { name: 'Example tour code' })
      .evaluate((element) => element.scrollHeight <= element.clientHeight),
  ).toBe(true);
  const tour = preview.getByRole('group', { name: 'Onboarding tour preview' });
  await expect(tour).toHaveClass(/onboarding-popover/);
  await expect(tour).toHaveCSS('opacity', '1');
  await expect(tour).toContainText('Step 1 of 3');
  await page.clock.runFor(2600);
  await expect(tour).toContainText('Step 2 of 3');
  await expect(preview.locator('#project-progress')).toHaveClass(/is-highlighted/);
  await expect(preview.getByRole('button', { name: 'Pause animation' })).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.VPHomeHero').screenshot({ path: testInfo.outputPath('hero-desktop.png') });
  await tour.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(tour).toContainText('Step 1 of 3');
  await tour.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(tour).toContainText('Step 2 of 3');
  await tour.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(tour).toContainText('Step 3 of 3');
  await expect(preview.locator('#project-help')).toHaveClass(/is-highlighted/);
  await expect(tour.getByRole('button', { name: 'Done', exact: true })).toBeFocused();
  await tour.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(preview).toHaveAttribute('data-phase', 'finished');
  await expect(preview.getByRole('button', { name: 'Replay tour' })).toBeFocused();
  await preview.getByRole('button', { name: 'Replay tour' }).click();
  await expect(tour).toContainText('Step 1 of 3');
  await expect(tour.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
  await tour.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(preview).toContainText('Tour skipped. Try it again?');
  await expect(preview.getByRole('button', { name: 'Replay tour' })).toBeFocused();
  await preview.getByRole('button', { name: 'Replay animation' }).click();
  await expect(preview).toHaveAttribute('data-phase', 'typing');
  await page.getByRole('link', { name: 'Pick your framework', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await page.clock.runFor(12000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'A working tour in five minutes',
  );
});

test('keeps the preview usable across screen sizes with reduced motion', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const preview = page.getByRole('region', { name: 'From code to your first tour' });
  await expect(preview).toHaveAttribute('data-phase', 'preview');
  await expect(preview.locator('.hero-code')).toContainText("kit.start('welcome')");
  await expect(preview.getByRole('button', { name: 'Pause animation' })).toBeDisabled();
  const heading = await page.getByRole('heading', { level: 1 }).boundingBox();
  const box = await preview.boundingBox();
  expect(box!.y).toBeGreaterThan(heading!.y + heading!.height);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.locator('.VPHomeHero').screenshot({ path: testInfo.outputPath('hero-mobile.png') });
  const code = preview.getByRole('region', { name: 'Example tour code' });
  await code.focus();
  await page.keyboard.press('End');
  await expect.poll(() => code.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const tour = preview.getByRole('group', { name: 'Onboarding tour preview' });
  await tour.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(tour).toContainText('Step 2 of 3');
  for (const width of [320, 390, 768, 1024, 1200, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await code.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const main = await page.locator('.VPHomeHero .main').boundingBox();
    const previewBox = await preview.boundingBox();
    if (width < 1200) {
      expect(previewBox!.y).toBeGreaterThanOrEqual(main!.y + main!.height);
    } else {
      expect(previewBox!.x).toBeGreaterThanOrEqual(main!.x + main!.width);
      expect(await code.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(
        true,
      );
    }
    const app = await preview.locator('.hero-app').boundingBox();
    const popup = await tour.boundingBox();
    expect(popup!.x).toBeGreaterThanOrEqual(app!.x);
    expect(popup!.x + popup!.width).toBeLessThanOrEqual(app!.x + app!.width);
    expect(popup!.y).toBeGreaterThanOrEqual(app!.y);
    expect(popup!.y + popup!.height).toBeLessThanOrEqual(app!.y + app!.height);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});

test('links the Next.js quickstart to a complete, maintained router example', async ({ page }) => {
  await page.goto('./getting-started/nextjs');
  await page.getByRole('link', { name: 'complete Next.js routing example', exact: true }).click();
  await expect(page.locator('#next-js-app-router')).toBeVisible();
  await expect(page.locator('div.language-tsx').last()).toContainText('export function Providers');
  await expect(page.locator('div.language-tsx').last()).toContainText('currentPath.current = path');
});

test('runs a themed tour and advances on an actual application event', async ({ page }) => {
  await page.goto('./playground');
  await page.getByRole('button', { name: 'Ocean', exact: true }).click();
  await page.getByRole('button', { name: 'Start the demo', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Step 1 of 3');
  await expect(dialog).toHaveCSS('background-color', 'rgb(245, 255, 255)');
  await dialog.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(dialog).toContainText('Step 2 of 3');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(dialog).toContainText('Step 3 of 3');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText('Tour completed. Ready to make it yours?', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay demo', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Replay demo', exact: true }).click();
  await expect(dialog).toContainText('Step 1 of 3');
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('keeps the mobile demo in view and cleans it up on client navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('./playground');
  await page.getByRole('button', { name: 'Midnight', exact: true }).click();
  await page.getByRole('button', { name: 'Start the demo', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(async () => {
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(391);
    expect(box!.y + box!.height).toBeLessThanOrEqual(781);
  }).toPass();
  await page.getByRole('link', { name: 'React quickstart', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('React: your first tour');
  await expect(page.locator('[data-onboarding-kit]')).toHaveCount(0);
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-onboarding-kit]')).toHaveCount(0);
});
