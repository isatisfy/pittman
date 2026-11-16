import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('renders heading and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /contact us now/i })).toBeVisible();
  });

  test('has correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Pittman Industrial Marketing/i);
  });

  test('has meta description', async ({ page }) => {
    await page.goto('/');
    const meta = page.locator('meta[name="description"]');
    await expect(meta).toHaveAttribute('content', /.+/);
  });

  // Regression: astro.config.mjs shipped with site: 'https://www.example.com',
  // which put example.com into every canonical, OG URL and the sitemap.
  test('canonical URL uses the production domain', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /^https:\/\/www\.pittmanindustrial\.com\//,
    );
  });

  // Regression: the template fell back to Unsplash stock photography whenever
  // a local image was not registered in src/config/images.ts.
  test('ships no stock placeholder imagery', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('img[src*="unsplash.com"]')).toHaveCount(0);
  });

  // Regression: BaseLayout defaulted og:image to /og-image.png, which does not
  // exist in public/, so every share card requested a 404.
  test('does not advertise a missing social image', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  });
});
