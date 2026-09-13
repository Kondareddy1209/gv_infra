// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Section 7: Admin Console Security & Operations E2E Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('gv_infra_auth_v1');
    });
  });

  test('Unauthenticated user cannot access admin console', async ({ page }) => {
    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const gate = page.locator('#admin-auth-gate');
    await expect(gate).toBeVisible();

    const gateText = await gate.innerText();
    expect(gateText.toUpperCase()).toContain('ADMINISTRATIVE AUTHORIZATION REQUIRED');

    // Operational console shell should be hidden
    const shell = page.locator('.admin-shell');
    if (await shell.count() > 0) {
      const isVisible = await shell.first().isVisible();
      expect(isVisible).toBe(false);
    }
  });

  test('Normal user cannot access admin console', async ({ page }) => {
    // Log in as normal user
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.GV_AUTH?.login('demo@investor.com', 'user123');
    });

    // Navigate to admin.html
    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Gate should still block normal user
    const gate = page.locator('#admin-auth-gate');
    await expect(gate).toBeVisible();
    const gateText = await gate.innerText();
    expect(gateText.toUpperCase()).toContain('ADMINISTRATIVE AUTHORIZATION REQUIRED');
  });

  test('Admin authentication unlocks console, navigation tabs, and safe inventory update', async ({ page }) => {
    await page.goto('/admin.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Click demo admin shortcut on gate
    const demoBtn = page.locator('#admin-auth-gate button:has-text("Fill Demo Admin")');
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    } else {
      await page.locator('#admin-gate-email').fill('admin@gvinfra.com');
      await page.locator('#admin-gate-pass').fill('admin123');
    }

    const unlockBtn = page.locator('#admin-auth-gate button:has-text("Unlock"), #admin-auth-gate button[type="submit"]').first();
    await unlockBtn.click();
    await page.waitForTimeout(600);

    // Gate should be hidden, console shell visible
    const gate = page.locator('#admin-auth-gate');
    await expect(gate).not.toBeVisible();

    const shell = page.locator('.admin-shell');
    await expect(shell).toBeVisible();

    // Verify tabs: Overview, Inventory, Leads, Pricing, Diagnostics
    const navItems = page.locator('.nav-btn');
    expect(await navItems.count()).toBeGreaterThanOrEqual(4);

    // Check Inventory tab
    const invTab = page.locator('.nav-btn[data-view="inventory"]');
    if (await invTab.isVisible()) {
      await invTab.click();
      await page.waitForTimeout(300);
      const invPanel = page.locator('#view-inventory');
      await expect(invPanel).toBeVisible();
    }

    // Check Leads tab
    const leadsTab = page.locator('.nav-btn[data-view="leads"]');
    if (await leadsTab.isVisible()) {
      await leadsTab.click();
      await page.waitForTimeout(300);
      const leadsPanel = page.locator('#view-leads');
      await expect(leadsPanel).toBeVisible();
    }

    // Check Pricing tab
    const pricingTab = page.locator('.nav-btn[data-view="pricing"]');
    if (await pricingTab.isVisible()) {
      await pricingTab.click();
      await page.waitForTimeout(300);
      const pricingPanel = page.locator('#view-pricing');
      await expect(pricingPanel).toBeVisible();
    }

    // Test safe inventory modification: Change plot status and restore
    const originalStatus = await page.evaluate(() => {
      const plots = JSON.parse(localStorage.getItem('gv_infra_plots_v1') || '[]');
      if (plots.length > 0) {
        return { id: plots[0].id, status: plots[0].status };
      }
      return null;
    });

    if (originalStatus) {
      const origStatusLower = (originalStatus.status || '').toLowerCase();
      const newStatus = origStatusLower === 'available' ? 'reserved' : 'available';
      await page.evaluate(({ id, newStatus }) => {
        window.GV_ADMIN?.updatePlotStatus(id, newStatus);
      }, { id: originalStatus.id, newStatus });

      await page.waitForTimeout(300);

      const updatedStatus = await page.evaluate((id) => {
        const plots = JSON.parse(localStorage.getItem('gv_infra_plots_v1') || '[]');
        return plots.find(x => x.id === id)?.status;
      }, originalStatus.id);

      expect((updatedStatus || '').toLowerCase()).toBe(newStatus);

      // Restore original value immediately
      await page.evaluate(({ id, status }) => {
        window.GV_ADMIN?.updatePlotStatus(id, status);
      }, { id: originalStatus.id, status: originalStatus.status });

      const restored = await page.evaluate((id) => {
        const plots = JSON.parse(localStorage.getItem('gv_infra_plots_v1') || '[]');
        return plots.find(x => x.id === id)?.status;
      }, originalStatus.id);

      expect(restored).toBe(originalStatus.status);
    }

    // Topbar Sign Out
    const topbarSignOut = page.locator('#admin-logout-btn, button:has-text("Sign Out")').first();
    await topbarSignOut.click();
    await page.waitForTimeout(500);

    // Gate should reappear
    await expect(gate).toBeVisible();
  });
});
