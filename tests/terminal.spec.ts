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
    await page.locator('[data-input]').fill('Engram');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement?.textContent)).toContain('Engram');
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

test.describe('full-buffer mode', () => {
  const buf = (page: Page) => page.locator('[data-buffer]');
  const bufOut = (page: Page) => page.locator('[data-buf-output]');
  async function bufRun(page: Page, line: string) {
    await page.locator('[data-buf-input]').fill(line);
    await page.keyboard.press('Enter');
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-theme-cycle]')).toBeVisible();
    await command(page, 'term');
    await expect(buf(page)).toBeVisible();
  });

  test('term opens the buffer with a splash and a focused prompt', async ({ page }) => {
    await expect(page.locator('[data-mode]')).toHaveText('TERM');
    await expect(bufOut(page)).toContainText('type help for commands');
    await expect(page.locator('[data-buf-input]')).toBeFocused();
    await expect(page.locator('[data-panel]')).toBeHidden();
  });

  test('cat prints files instead of navigating, cd stays put', async ({ page }) => {
    await bufRun(page, 'cd projects');
    await expect(page.locator('[data-buf-prompt]')).toHaveText('~/projects $');
    await bufRun(page, 'cat apex');
    await expect(bufOut(page)).toContainText('# Apex');
    await expect(bufOut(page)).toContainText('## Key decisions');
    await expect(bufOut(page).getByRole('link', { name: 'github.com/RazerBlade6/apex' })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('ls entries are clickable and cat themselves', async ({ page }) => {
    await bufRun(page, 'ls');
    await bufOut(page).getByRole('button', { name: 'experience.log' }).click();
    await expect(bufOut(page)).toContainText('R&D Intern · 1Kosmos');
  });

  test('Esc twice leaves, and the scrollback is still there next time', async ({ page }) => {
    await bufRun(page, 'pwd');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(buf(page)).toBeHidden();
    await expect(page.locator('[data-mode]')).toHaveText('NORMAL');
    await command(page, 'term');
    await expect(bufOut(page)).toContainText('~ $ pwd');
  });

  test('open leaves the buffer and goes to the page; the buffer survives navigation', async ({ page }) => {
    await bufRun(page, 'open engram');
    await expect(page).toHaveURL(/\/projects\/engram$/);
    await expect(buf(page)).toBeHidden();
    await command(page, 'term');
    await expect(bufOut(page)).toContainText('open engram');
  });

  test('exit leaves', async ({ page }) => {
    await bufRun(page, 'exit');
    await expect(buf(page)).toBeHidden();
  });
});

test.describe('M4 polish', () => {
  test('portrait, resume and social previews are in place', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.getByRole('img', { name: 'Dithered portrait of Vedant Thapar' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Resume/ }).first()).toHaveAttribute('href', '/resume.pdf');
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toBe('https://vedantthapar.com/og/index.png');
    for (const path of ['/og/index.png', '/og/projects/apex.png', '/resume.pdf', '/favicon.svg', '/robots.txt']) {
      expect((await request.get(path)).status(), path).toBe(200);
    }
    expect(await page.locator('script[type="application/ld+json"]').count()).toBe(1);
  });

  test('project pages point at their own preview image', async ({ page }) => {
    await page.goto('/projects/engram');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://vedantthapar.com/og/projects/engram.png');
  });

  test('cat about.txt in the buffer shows the ASCII portrait for the current scheme only', async ({ page }) => {
    await page.goto('/?theme=paper');
    await expect(page.locator('[data-theme-cycle]')).toBeVisible();
    await command(page, 'term');
    await page.locator('[data-buf-input]').fill('cat about.txt');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-buf-output] .scheme-light')).toBeVisible();
    await expect(page.locator('[data-buf-output] .scheme-dark')).toBeHidden();
  });
});

test('canonical URLs are the clean ones the site serves', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://vedantthapar.com/');
  await page.goto('/projects/apex');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://vedantthapar.com/projects/apex');
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', 'https://vedantthapar.com/projects/apex');
});

test.describe('CRT effects', () => {
  test('on by default on every theme, toggled from the status line and remembered', async ({ page }) => {
    await page.goto('/?theme=paper');
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'on');
    const fx = page.locator('[data-fx]');
    await expect(fx).toHaveAttribute('aria-pressed', 'true');
    await fx.click();
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');
    await expect(fx).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');
    // and it survives client-side navigation
    await page.getByRole('link', { name: /Apex/ }).first().click();
    await expect(page).toHaveURL(/\/projects\/apex$/);
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');
  });

  test('effects on|off is the master switch', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-fx]')).toBeVisible();
    await command(page, 'effects off');
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');
    await expect(page.locator('[data-fx-label]')).toHaveText('off');
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('starts with effects off', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-effects', 'off');
    });
  });
});

test.describe('CRT effect parts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-fx]')).toBeVisible();
  });

  test('effects lists the parts; a part switches independently and is remembered', async ({ page }) => {
    await command(page, 'effects');
    for (const part of ['glow', 'scanlines', 'roll', 'glitch']) await expect(output(page)).toContainText(part);
    await page.locator('[data-input]').fill('effects roll off');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-fx-off', 'roll');
    expect(await page.evaluate(() => getComputedStyle(document.body, '::before').animationName)).toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.body, '::after').content)).not.toBe('none'); // scanlines stay
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-fx-off', 'roll');
    await expect(page.locator('html')).toHaveAttribute('data-effects', 'on');
  });

  test('roll animates the scanlines and the refresh band', async ({ page }) => {
    expect(await page.evaluate(() => getComputedStyle(document.body, '::after').animationName)).toBe('crt-crawl');
    expect(await page.evaluate(() => getComputedStyle(document.body, '::before').animationName)).toBe('crt-band');
  });

  test('glitch tears the content for a moment, and not when switched off', async ({ page }) => {
    await command(page, 'glitch');
    await expect(page.locator('main')).toHaveCSS('filter', /crt-glitch/);
    await expect(page.locator('main')).not.toHaveCSS('filter', /crt-glitch/, { timeout: 2000 });
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('roll and glitch never move, even when switched on', async ({ page }) => {
      await command(page, 'effects on');
      expect(await page.evaluate(() => getComputedStyle(document.body, '::before').animationName)).toBe('none');
      await page.locator('[data-input]').fill('glitch');
      await page.keyboard.press('Enter');
      await expect(page.locator('main')).not.toHaveCSS('filter', /crt-glitch/);
    });
  });
});

test.describe('external links', () => {
  test('open in a new tab and say so; email and in-site links do not', async ({ page }) => {
    await page.goto('/');
    for (const name of ['RazerBlade6', 'linkedin']) {
      const link = page.locator('#main').getByRole('link', { name: new RegExp(`^${name}`) });
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(link).toContainText('opens in a new tab'); // screen-reader text
    }
    await expect(page.locator('#main a[href^="mailto:"]').first()).not.toHaveAttribute('target', '_blank');
    await expect(page.locator('#main a[href="/projects/apex"]')).not.toHaveAttribute('target', '_blank');
  });

  test('links inside write-ups do too', async ({ page }) => {
    await page.goto('/projects/engram');
    await expect(page.locator('article a[href="https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm"]')).toHaveAttribute('target', '_blank');
  });

  test('links printed by the terminal do too', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-fx]')).toBeVisible();
    await command(page, 'contact');
    await expect(output(page).locator('a[href="https://github.com/RazerBlade6"]')).toHaveAttribute('target', '_blank');
    await expect(output(page).locator('a[href^="mailto:"]')).not.toHaveAttribute('target', '_blank');
  });
});
