import { expect, test, type Page } from '@playwright/test';

const terminal = (page: Page) => page.locator('#terminal');
const output = (page: Page) => page.locator('[data-output]');

async function command(page: Page, line: string) {
  await page.keyboard.press(':');
  await page.locator('[data-input]').fill(line);
  await page.keyboard.press('Enter');
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the site is complete and the terminal stays out of the way', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Vedant Thapar' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Apex/ })).toBeVisible();
    await expect(page.locator('[data-theme-cycle]')).toBeHidden();
    await expect(page.locator('[data-hint]').first()).toBeHidden();
    await expect(page.locator('[data-open]')).toBeDisabled();
  });
});

test.describe('command line', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-theme-cycle]')).toBeVisible(); // hydrated
  });

  test(': opens it, ls lists, Esc closes and restores focus', async ({ page }) => {
    await page.keyboard.press(':');
    await expect(page.locator('[data-input]')).toBeFocused();
    await expect(page.locator('[data-mode]')).toHaveText('COMMAND');
    await page.locator('[data-input]').fill('ls projects');
    await page.keyboard.press('Enter');
    await expect(output(page)).toContainText('apex.md');
    await expect(output(page)).toContainText('archive/');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-panel]')).toBeHidden();
    await expect(page.locator('[data-mode]')).toHaveText('NORMAL');
  });

  test('cat navigates, and history survives the navigation', async ({ page }) => {
    await command(page, 'cat projects/apex.md');
    await expect(page).toHaveURL(/\/projects\/apex$/);
    await expect(terminal(page).locator('[data-file]')).toHaveText('~/projects/apex.md');
    await page.keyboard.press(':');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('[data-input]')).toHaveValue('cat projects/apex.md');
    // cwd follows the page
    await page.locator('[data-input]').fill('pwd');
    await page.keyboard.press('Enter');
    await expect(output(page)).toContainText('~/projects');
  });

  test('tab completes paths', async ({ page }) => {
    await page.keyboard.press(':');
    await page.locator('[data-input]').fill('cat proj');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-input]')).toHaveValue('cat projects/');
  });

  test('theme switches and the status line follows', async ({ page }) => {
    await command(page, 'theme mocha');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'mocha');
    await expect(page.locator('[data-theme-label]')).toHaveText('mocha');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'mocha');
  });

  test('unknown commands suggest the nearest one, which is clickable', async ({ page }) => {
    await command(page, 'sl projects');
    await expect(output(page)).toContainText('did you mean ls?');
    await output(page).getByRole('button', { name: 'ls' }).click();
    await expect(output(page)).toContainText('apex.md');
  });

  test('cd to a section scrolls the page', async ({ page }) => {
    await command(page, 'cd projects');
    await expect(page).toHaveURL(/#projects$/);
  });
});

test.describe('vim keys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-theme-cycle]')).toBeVisible();
  });

  test('j / k move between links', async ({ page }) => {
    await page.keyboard.press('j');
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
    expect(first).toBeTruthy();
    await page.keyboard.press('j');
    await page.keyboard.press('k');
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe(first);
  });

  test('G / gg scroll to the ends without highlighting anything', async ({ page }) => {
    await page.keyboard.press('j');
    await page.keyboard.press('G');
    await expect.poll(() => page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 2)).toBe(true);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
    await page.keyboard.press('g');
    await page.keyboard.press('g');
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  });

  test('/ searches and focuses the match', async ({ page }) => {
    await page.keyboard.press('/');
    await expect(page.locator('[data-mode]')).toHaveText('SEARCH');
    await page.locator('[data-input]').fill('R-Lox');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement?.textContent)).toContain('R-Lox');
  });

  test('backspace on an empty prompt returns to normal mode', async ({ page }) => {
    for (const key of ['/', ':']) {
      await page.keyboard.press(key);
      await page.keyboard.type('ab');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await expect(page.locator('[data-mode]')).not.toHaveText('NORMAL'); // still typing: prompt is empty, not gone
      await page.keyboard.press('Backspace');
      await expect(page.locator('[data-mode]')).toHaveText('NORMAL');
      await expect(page.locator('[data-input]')).toBeHidden();
    }
  });

  test('? opens help', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(output(page)).toContainText('commands');
    await expect(output(page)).toContainText('gg / G');
  });
});

test('@mobile tapping the status line opens the chip sheet', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-theme-cycle]')).toBeVisible();
  await terminal(page).locator('[data-open]').tap();
  await expect(page.locator('[data-chips]')).toBeVisible();
  await page.locator('[data-chip="ls projects"]').tap();
  await expect(output(page)).toContainText('apex.md');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
});
