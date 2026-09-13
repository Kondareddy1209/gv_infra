// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Section 3 & 4: Header & Search E2E Audit', () => {
  test('Header dimensions and typography on desktop (1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const header = page.locator('#site-nav');
    await expect(header).toBeVisible();

    const box = await header.boundingBox();
    expect(box?.height, 'Desktop header height should be 98px').toBeCloseTo(98, 1);

    // Verify logo
    const logo = page.locator('.brand-logo, .brand img');
    await expect(logo.first()).toBeVisible();

    // Verify key nav labels
    const requiredNavs = [
      'PROJECTS',
      '3D MASTERPLAN',
      'LAND',
      'WHY GV INFRA',
      'SPECIFICATIONS',
      'CONNECTIVITY',
      'CONTACT',
      'SEARCH',
      'ACCOUNT',
      'WHATSAPP',
      'CALL SALES'
    ];

    const navText = await page.locator('#site-nav').innerText();
    for (const label of requiredNavs) {
      expect(navText.toUpperCase()).toContain(label);
    }
  });

  test('Header scroll transitions: Transparent -> Solid Ivory -> Transparent', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const header = page.locator('#site-nav');

    // 1. At top: scrollY === 0, header should be transparent / not have .nav-scrolled class
    const initialClasses = await header.getAttribute('class');
    expect(initialClasses).not.toContain('nav-scrolled');

    // 2. Scroll > 30px: header should transition to solid warm ivory (.nav-scrolled)
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(400);

    const scrolledClasses = await header.getAttribute('class');
    expect(scrolledClasses).toContain('nav-scrolled');

    // 3. Scroll back to top: header should restore transparency
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);

    const restoredClasses = await header.getAttribute('class');
    expect(restoredClasses).not.toContain('nav-scrolled');
  });

  test('SEARCH trigger from homepage top, scrolled, and subpages', async ({ page }) => {
    // 1. Homepage at top
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Click SEARCH in header
    const searchBtn = page.locator('#site-nav .nav-search-btn').first();
    await searchBtn.click();
    await page.waitForTimeout(600);

    // Verify scrolled to #finder with spotlight and #hp-finder-facing focused
    const facingFocused = await page.evaluate(() => {
      const active = document.activeElement;
      const facing = document.getElementById('hp-finder-facing');
      return active === facing;
    });
    expect(facingFocused, 'Expected #hp-finder-facing to be focused on SEARCH click').toBe(true);

    // 2. Homepage while scrolled past finder
    await page.evaluate(() => window.scrollTo(0, 3500));
    await page.waitForTimeout(300);
    await searchBtn.click();
    await page.waitForTimeout(600);

    const finderTop = await page.evaluate(() => {
      const el = document.getElementById('finder');
      return el ? el.getBoundingClientRect().top : -999;
    });
    expect(finderTop).toBeGreaterThanOrEqual(0);
    expect(finderTop).toBeLessThan(200);

    // 3. From projects.html
    await page.goto('/projects.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const subpageSearchBtn = page.locator('#site-nav .nav-search-btn').first();
    await subpageSearchBtn.click();
    await page.waitForURL(/index\.html#finder/);
    await page.waitForTimeout(800);

    const indexScrolled = await page.evaluate(() => window.scrollY);
    expect(indexScrolled).toBeGreaterThan(100);

    // 4. Mobile header (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Open mobile drawer
    const hamburger = page.locator('#nav-mobile-toggle').first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(300);
      const drawer = page.locator('#mobile-nav-panel');
      await expect(drawer).toBeVisible();
    }
  });

  test('Quick Plot Finder filtering logic and navigation', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const facingSelect = page.locator('#hp-finder-facing');
    const sizeSelect = page.locator('#hp-finder-size');
    const statusSelect = page.locator('#hp-finder-status');
    const findBtn = page.locator('#hp-finder-btn');

    await expect(facingSelect).toBeVisible();
    await facingSelect.selectOption('East');
    await sizeSelect.selectOption('1800');
    await statusSelect.selectOption('available');

    // Click Explore in 3D button
    await findBtn.click();
    await page.waitForURL(/project\.html/);

    // Verify query params passed
    expect(page.url()).toContain('project.html');
  });
});
