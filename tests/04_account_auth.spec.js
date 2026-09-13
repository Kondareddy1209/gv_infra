// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Section 6: Account & Authentication Lifecycle E2E Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('gv_infra_auth_v1');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
  });

  test('Logged out state: Modal displays tabs (Sign In, Create Account, Admin Access)', async ({ page }) => {
    const accountBtn = page.locator('#site-nav .nav-account-btn').first();
    await expect(accountBtn).toBeVisible();
    await expect(accountBtn).toHaveText(/ACCOUNT/i);

    await accountBtn.click();
    await page.waitForTimeout(300);

    const modal = page.locator('#gv-account-modal');
    await expect(modal).toBeVisible();

    const tabs = page.locator('.gv-account-tab');
    expect(await tabs.count()).toBeGreaterThanOrEqual(3);

    const loginTab = page.locator('.gv-account-tab[data-tab="login"]');
    const registerTab = page.locator('.gv-account-tab[data-tab="register"]');
    const adminTab = page.locator('.gv-account-tab[data-tab="admin"]');

    await expect(loginTab).toBeVisible();
    await expect(registerTab).toBeVisible();
    await expect(adminTab).toBeVisible();
  });

  test('Normal User authentication flow & In-Modal SIGN OUT', async ({ page }) => {
    // 1. Open modal and click demo user fill
    const accountBtn = page.locator('#site-nav .nav-account-btn').first();
    await accountBtn.click();
    await page.waitForTimeout(300);

    // Click demo fill or fill credentials
    const demoFillBtn = page.locator('#gv-btn-quick-user, button:has-text("Fill Demo User"), button:has-text("Fill Demo Investor")');
    if (await demoFillBtn.isVisible()) {
      await demoFillBtn.click();
    } else {
      await page.locator('#gv-login-email').fill('demo@investor.com');
      await page.locator('#gv-login-password').fill('user123');
    }

    // Submit login
    await page.locator('#gv-login-form .gv-auth-submit-btn, button:has-text("Sign In to Account"), button:has-text("Sign In to Portfolio")').click();
    await page.waitForTimeout(600);

    // 2. Verify header updated to MY ACCOUNT
    await expect(accountBtn).toHaveText(/MY ACCOUNT/i);

    // 3. Re-open account panel and verify profile details
    await accountBtn.click();
    await page.waitForTimeout(300);

    const modal = page.locator('#gv-account-modal');
    await expect(modal).toBeVisible();

    const profileText = await modal.innerText();
    expect(profileText).toContain('K. Venkateshwar Rao');
    expect(profileText).toContain('demo@investor.com');
    expect(profileText).toMatch(/INVESTOR ACCOUNT|MY ACCOUNT/i);
    expect(profileText).toMatch(/Saved Plots|Shortlist/i);

    // 4. Verify prominent in-modal SIGN OUT button exists
    const signOutBtn = page.locator('#gv-account-logout-btn, .gv-account-signout-btn');
    await expect(signOutBtn).toBeVisible();
    expect(await signOutBtn.innerText()).toMatch(/SIGN OUT|LOG OUT/i);

    // 5. Click SIGN OUT
    await signOutBtn.click();
    await page.waitForTimeout(500);

    // Modal should close and header should revert immediately to ACCOUNT
    await expect(modal).not.toBeVisible();
    await expect(accountBtn).toHaveText(/^ACCOUNT$/i);

    const isAuth = await page.evaluate(() => window.GV_AUTH?.isAuthenticated());
    expect(isAuth).toBe(false);

    // 6. Reopen ACCOUNT - should show unauthenticated login form
    await accountBtn.click();
    await page.waitForTimeout(300);
    await expect(page.locator('#gv-login-email')).toBeVisible();
  });

  test('Admin authentication flow & Console Access', async ({ page }) => {
    const accountBtn = page.locator('#site-nav .nav-account-btn').first();
    await accountBtn.click();
    await page.waitForTimeout(300);

    // Switch to Admin tab
    await page.locator('.gv-account-tab[data-tab="admin"]').click();
    await page.waitForTimeout(200);

    // Use demo fill or type admin credentials
    const demoAdminBtn = page.locator('#gv-btn-quick-admin, button:has-text("Fill Demo Admin"), button:has-text("Fill Admin Credentials")');
    if (await demoAdminBtn.isVisible()) {
      await demoAdminBtn.click();
    } else {
      await page.locator('#gv-admin-email').fill('admin@gvinfra.com');
      await page.locator('#gv-admin-password').fill('admin123');
    }

    await page.locator('#gv-admin-form .gv-auth-submit-btn, button:has-text("Authenticate Admin"), button:has-text("Authenticate as Admin")').click();
    await page.waitForTimeout(600);

    // Header updates to ADMIN
    await expect(accountBtn).toHaveText(/ADMIN/i);

    // Reopen modal - verify Admin details and Open Operations Console button
    await accountBtn.click();
    await page.waitForTimeout(300);

    const modal = page.locator('#gv-account-modal');
    const profileText = await modal.innerText();
    expect(profileText).toContain('ADMINISTRATOR');

    const consoleLink = page.locator('a:has-text("Open Operations Console")');
    await expect(consoleLink).toBeVisible();

    // In-modal Sign Out
    const signOutBtn = page.locator('#gv-account-logout-btn, .gv-account-signout-btn');
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();
    await page.waitForTimeout(500);

    await expect(accountBtn).toHaveText(/^ACCOUNT$/i);
  });
});
