import { test, expect, type Page } from '@playwright/test';

/**
 * Guards the nav highlight across client-side navigation.
 *
 * The header is transition:persist, so Astro keeps the existing header
 * element and discards the one the incoming page rendered. That makes the
 * server-rendered highlight correct only on a full page load — from then on,
 * the header's own script is the only thing that can move it.
 *
 * This caught a real bug: the script held the header in a closure taken at
 * startup, so once that element had been swapped out it was writing to a
 * detached node, and the highlight stuck on whichever page was opened first.
 * From the homepage it looked fine, because the auto-generated persist id
 * happened to differ there and the header was genuinely replaced. Only inner
 * page to inner page showed it.
 *
 * None of that is visible to a test that loads each page directly, which is
 * why the rest of the suite missed it. Every assertion below therefore
 * navigates by CLICKING.
 */

const PRIMARY_NAV = 'header nav[aria-label="Primary navigation"]';

/** The nav links currently styled and announced as the current page. */
async function highlighted(page: Page) {
  return page.evaluate((navSelector) => {
    const links = [...document.querySelectorAll(`${navSelector} a`)];
    return {
      path: window.location.pathname,
      styled: links
        .filter((a) => a.classList.contains('bg-primary/10'))
        .map((a) => a.textContent?.trim()),
      announced: links
        .filter((a) => a.hasAttribute('aria-current'))
        .map((a) => a.textContent?.trim()),
    };
  }, PRIMARY_NAV);
}

/**
 * Exactly one link is marked, it is the expected one, and the styling and the
 * aria-current agree. Checking both matters: they are set in the same pass, so
 * a divergence means something is only half updating.
 */
async function expectOnly(page: Page, label: string) {
  const state = await highlighted(page);
  expect(state.styled, `styled at ${state.path}`).toEqual([label]);
  expect(state.announced, `aria-current at ${state.path}`).toEqual([label]);
}

async function clickNav(page: Page, label: string) {
  await page.click(`${PRIMARY_NAV} a:has-text("${label}")`);
  await page.waitForURL((url) => url.pathname !== '/__never__');
  await page.waitForTimeout(400); // let the view transition settle
}

test.describe('Primary navigation', () => {
  test('highlight follows the page when navigating from the homepage', async ({ page }) => {
    await page.goto('/');
    await expectOnly(page, 'Home');

    for (const label of ['About', 'Products', 'Services', 'Reviews', 'Blog', 'Contact']) {
      await clickNav(page, label);
      await expectOnly(page, label);
    }
  });

  test('the reported case: home, then About, then Services', async ({ page }) => {
    // Kept as its own test because it is the shortest sequence that fails.
    // Both hops matter. The first replaces the header element, which strands
    // any reference the script took at startup; the second then persists that
    // replacement, so a stale reference never points at the live header again.
    await page.goto('/');
    await clickNav(page, 'About');
    await expectOnly(page, 'About');

    await clickNav(page, 'Services');
    await expectOnly(page, 'Services');
  });

  test('highlight follows the page between inner pages', async ({ page }) => {
    // NOTE: entering by direct load does NOT reproduce the original bug - the
    // header the script captured is still the live one, so syncing it works.
    // That is exactly why this was missed. It is kept to guard the entry path,
    // not because it is the interesting one.
    await page.goto('/about');
    await expectOnly(page, 'About');

    await clickNav(page, 'Services');
    await expectOnly(page, 'Services');

    await clickNav(page, 'Reviews');
    await expectOnly(page, 'Reviews');

    await clickNav(page, 'About');
    await expectOnly(page, 'About');
  });

  test('highlight follows browser back and forward', async ({ page }) => {
    // Routed through the homepage first, so the header has been replaced once
    // before any history navigation happens.
    await page.goto('/');
    await clickNav(page, 'About');
    await clickNav(page, 'Services');
    await expectOnly(page, 'Services');

    await page.goBack();
    await page.waitForTimeout(400);
    await expectOnly(page, 'About');

    await page.goForward();
    await page.waitForTimeout(400);
    await expectOnly(page, 'Services');
  });

  test('the header really is persisted across navigation', async ({ page }) => {
    // If this fails the highlight tests above may pass for the wrong reason:
    // a header that is replaced each time gets its highlight from the server.
    await page.goto('/about');
    await page.evaluate(() => {
      document.querySelector('header')?.setAttribute('data-persist-probe', 'original');
    });

    await clickNav(page, 'Services');

    const survived = await page.evaluate(
      () => document.querySelector('header')?.getAttribute('data-persist-probe'),
    );
    expect(survived, 'the header element should survive the swap').toBe('original');
  });

  test('the mobile drawer closes on navigation and updates its own highlight', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/about');

    const drawer = page.locator('#mobile-menu');
    const toggle = page.locator('#menu-toggle');

    await expect(drawer).toBeHidden();

    await toggle.click();
    await expect(drawer).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer.locator('nav a', { hasText: 'About' })).toHaveClass(/bg-primary\/10/);

    await drawer.locator('nav a', { hasText: 'Services' }).click();
    await page.waitForTimeout(500);

    await expect(drawer).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer.locator('nav a', { hasText: 'Services' })).toHaveClass(/bg-primary\/10/);
    await expect(drawer.locator('nav a', { hasText: 'About' })).not.toHaveClass(/bg-primary\/10/);
  });

  test('the drawer toggle is bound once, not once per navigation', async ({ page }) => {
    // The header persists, so re-running the setup could stack a second click
    // handler on the same button and make the drawer flip twice per tap.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/about');

    await page.locator('#mobile-menu nav a', { hasText: 'Services' }).count();
    await page.locator('#menu-toggle').click();
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await page.locator('#mobile-menu nav a', { hasText: 'Reviews' }).click();
    await page.waitForTimeout(500);

    await page.locator('#menu-toggle').click();
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await page.locator('#menu-toggle').click();
    await expect(page.locator('#mobile-menu')).toBeHidden();
  });
});
