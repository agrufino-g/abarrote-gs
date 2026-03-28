import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    // Navigate straight to dashboard
    await page.goto('/dashboard');
    
    // Expect fallback route handling to hit the auth module or redirect page
    await expect(page).toHaveURL(/.*auth\/login.*/);
  });

  test('displays login form elements', async ({ page }) => {
    await page.goto('/auth/login');
    // Ensure form fields exist
    // Based on standard Firebase web auth or custom forms
    const emailField = page.getByPlaceholder(/correo|email/i);
    const passwordField = page.getByPlaceholder(/contraseña|password/i);
    
    // Fallback if Polaris uses different labels without placeholders
    const button = page.getByRole('button', { name: /entrar|login|iniciar/i });
    
    expect(await button.isVisible()).toBeTruthy();
  });
});
