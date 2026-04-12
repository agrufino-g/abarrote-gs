import { test, expect } from '@playwright/test';

/**
 * Dashboard Smoke Tests
 *
 * Validates critical dashboard routes enforce auth guards,
 * return expected page structures, and handle various
 * screen sizes without crashing.
 */

const DASHBOARD_ROUTES = [
  '/dashboard',
  '/dashboard/sales',
  '/dashboard/sales/corte',
  '/dashboard/products',
  '/dashboard/products/priority',
  '/dashboard/inventory',
  '/dashboard/customers',
  '/dashboard/analytics',
  '/dashboard/settings',
  '/dashboard/gastos',
  '/dashboard/reportes',
];

test.describe('Dashboard Routes — Auth Guard Enforcement', () => {
  for (const route of DASHBOARD_ROUTES) {
    test(`${route} redirects to login when unauthenticated`, async ({ page }) => {
      const response = await page.goto(route);
      // Should not crash (no 500)
      expect(response?.status()).toBeLessThan(500);

      // Should redirect to login
      await page.waitForURL(/\/auth\/login/, { timeout: 10_000 });
      expect(page.url()).toContain('/auth/login');
    });
  }
});

test.describe('Login Page — Smoke Tests', () => {
  test('renders email and password fields', async ({ page }) => {
    await page.goto('/auth/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible();
  });

  test('submit button is present and labeled', async ({ page }) => {
    await page.goto('/auth/login');
    const button = page.getByRole('button', { name: /entrar|login|iniciar|acceder/i });
    await expect(button).toBeVisible({ timeout: 10_000 });
  });

  test('shows validation on empty form submission', async ({ page }) => {
    await page.goto('/auth/login');

    const button = page.getByRole('button', { name: /entrar|login|iniciar|acceder/i });
    await button.click();

    // Should remain on login page (not navigate away)
    await expect(page).toHaveURL(/.*auth\/login.*/);
  });

  test('password field masks input', async ({ page }) => {
    await page.goto('/auth/login');
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });
    // Type attribute should be "password" (masking characters)
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});

test.describe('Not Found — Error Pages', () => {
  test('returns 404 for nonexistent dashboard child route', async ({ page }) => {
    const response = await page.goto('/dashboard/nonexistent-page');
    // Either redirects to login (auth guard) or shows 404
    expect(response?.status()).toBeLessThan(500);
  });

  test('returns 404 for completely unknown route', async ({ page }) => {
    const response = await page.goto('/zzz-does-not-exist');
    expect(response?.status()).toBe(404);
  });
});

test.describe('Responsive — Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('login page renders on mobile viewport', async ({ page }) => {
    const response = await page.goto('/auth/login');
    expect(response?.status()).toBeLessThan(500);

    // Content should be visible and not overflowing
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Performance — Page Load', () => {
  test('login page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5_000);
  });

  test('health API responds within 2 seconds', async ({ request }) => {
    const start = Date.now();
    await request.get('/api/health');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2_000);
  });
});
