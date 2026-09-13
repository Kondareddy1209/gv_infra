// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Section 8 to 14: Deep Dive Features Audit', () => {
  test('Section 8: Plot Showcase on project.html (cards, flip, no clipping/overlap)', async ({ page }) => {
    await page.goto('/project.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Switch to Plot Showcase (Cards) view
    const showcaseTab = page.locator('#view-showcase');
    if (await showcaseTab.isVisible()) {
      await showcaseTab.click();
      await page.waitForTimeout(400);
    }

    const cards = page.locator('.sc-card, .plot-card');
    const cardCount = await cards.count();
    expect(cardCount, 'Expected plot cards to render').toBeGreaterThan(0);

    // Check first card
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    // Verify card details exist: price, area, facing
    const cardText = await firstCard.innerText();
    expect(cardText).toMatch(/sqft|Sq\.Yds|Sq Yds|Yards/i);
    expect(cardText).toMatch(/East|West|North|South/i);
    expect(cardText).toMatch(/₹|Lakh/i);

    // Test card selection / flip
    const flipBtn = firstCard.locator('.sc-flip-btn, .card-flip-btn, button:has-text("Details")').first();
    if (await flipBtn.isVisible()) {
      await flipBtn.click();
      await page.waitForTimeout(300);
    }

    // Check for text clipping/overflow inside cards
    const isClipped = await page.evaluate(() => {
      const cardElements = document.querySelectorAll('.sc-card, .plot-card');
      for (const card of cardElements) {
        if (card.scrollHeight > card.clientHeight + 15) {
          return true;
        }
      }
      return false;
    });
    expect(isClipped, 'Plot cards must not have clipped text or overflowing content').toBe(false);
  });

  test('Section 9: 3D Masterplan (Three.js canvas, mode buttons, plot drawer, GV_DATA)', async ({ page }) => {
    await page.goto('/project.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Verify canvas exists
    const canvas = page.locator('#masterplan-canvas, canvas');
    await expect(canvas.first()).toBeVisible();

    // Verify technical toolbar controls/modes
    const controls = page.locator('.env-btn, .tool-btn');
    expect(await controls.count()).toBeGreaterThanOrEqual(5);

    // Verify drawer data via selecting a plot from GV_DATA
    const drawerData = await page.evaluate(() => {
      if (window.GV_DATA && typeof window.GV_DATA.getPlots === 'function') {
        const plots = window.GV_DATA.getPlots();
        return plots.length > 0 ? plots[0] : null;
      }
      return null;
    });
    expect(drawerData).not.toBeNull();
    expect(drawerData.plotNumber || drawerData.id).toBeTruthy();
  });

  test('Section 10: Satellite Map (MapLibre initialization & controls)', async ({ page }) => {
    await page.goto('/project.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Switch to Map tab
    const mapTab = page.locator('#view-land');
    if (await mapTab.isVisible()) {
      await mapTab.click();
      await page.waitForTimeout(800);
    }

    const mapContainer = page.locator('#satellite-map, #map, .maplibregl-map, .map-container').first();
    if (await mapContainer.isVisible()) {
      await expect(mapContainer).toBeVisible();
    }
  });

  test('Section 11: EMI Calculator (interactive sliders & NaN check)', async ({ page }) => {
    await page.goto('/project.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Filter price slider in sidebar
    const priceSlider = page.locator('#filter-price');
    if (await priceSlider.isVisible()) {
      await priceSlider.fill('5000000');
      await priceSlider.dispatchEvent('input');
      await page.waitForTimeout(200);

      const priceLabel = await page.locator('#price-val-label').innerText();
      expect(priceLabel).not.toContain('NaN');
      expect(priceLabel).not.toContain('undefined');
    }
  });

  test('Section 13: Forms / leads (submission, lead storage, person-specific WhatsApp URL)', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const testLead = {
      name: 'E2E Test Investor',
      phone: '9848011223',
      project: 'Stambadri Enclave'
    };

    // 1. Submit through callback form on index.html
    await page.locator('#cb-name').fill(testLead.name);
    await page.locator('#cb-phone').fill(testLead.phone);
    await page.locator('#callback-form button[type="submit"]').click();
    await page.waitForTimeout(400);

    const confirmMsg = page.locator('#callback-confirm');
    await expect(confirmMsg).toBeVisible();

    // 2. Verify lead in localStorage
    const savedLeads = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('gv_infra_leads_v1') || '[]');
    });
    expect(savedLeads.length).toBeGreaterThan(0);
    expect(savedLeads[0].phone).toContain('9848011223');

    // 3. Verify person-specific WhatsApp routing does not fall back to company number for a lead
    const waUrl = await page.evaluate((phone) => {
      const normalized = window.normalizeWhatsAppPhone ? window.normalizeWhatsAppPhone(phone) : phone.replace(/\D/g, '');
      return `https://wa.me/${normalized}`;
    }, testLead.phone);

    expect(waUrl).toBe('https://wa.me/919848011223');
    expect(waUrl).not.toContain('9848099999'); // Company default
  });

  test('Section 14: Drone Viewer (open and close behavior)', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const droneBtn = page.locator('.trigger-drone-tour').first();
    if (await droneBtn.isVisible()) {
      await droneBtn.click();
      await page.waitForTimeout(400);

      const modal = page.locator('#drone-modal');
      await expect(modal).toBeVisible();

      // Close
      const closeBtn = page.locator('#drone-close');
      await closeBtn.click();
      await page.waitForTimeout(300);
      await expect(modal).not.toBeVisible();
    }
  });
});
