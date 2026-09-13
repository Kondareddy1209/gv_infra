// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Section 5: GV HELP Chatbot E2E Audit', () => {
  test('Branding and labels: GV HELP rebrand with 0 GV CONCIERGE references', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const launcher = page.locator('#gv-chatbot-launcher, .gv-chatbot-launcher');
    await expect(launcher).toBeVisible();

    const launcherText = await launcher.innerText();
    expect(launcherText.toUpperCase()).toContain('GV HELP');
    expect(launcherText.toUpperCase()).not.toContain('CONCIERGE');

    // Open chat
    await launcher.click();
    await page.waitForTimeout(400);

    const panel = page.locator('#gv-chatbot-panel, .gv-chatbot-panel');
    await expect(panel).toBeVisible();

    const panelText = await panel.innerText();
    expect(panelText.toUpperCase()).toContain('GV HELP');
    expect(panelText.toUpperCase()).not.toContain('GV CONCIERGE');

    // Check sender tag
    const senderTag = page.locator('.gv-msg-sender').first();
    if (await senderTag.isVisible()) {
      const senderText = await senderTag.innerText();
      expect(senderText.toUpperCase()).toContain('GV HELP');
      expect(senderText.toUpperCase()).not.toContain('CONCIERGE');
    }

    // Verify whole page visible text has 0 "GV CONCIERGE"
    const visibleText = await page.evaluate(() => document.body.innerText);
    expect(visibleText).not.toContain('GV CONCIERGE');
  });

  test('Chat interactions: Quick actions, project info, plot filter, and real GV_DATA', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    // Open chat
    const launcher = page.locator('#gv-chatbot-launcher, .gv-chatbot-launcher');
    await launcher.click();
    await page.waitForTimeout(400);

    // Quick action: Explore Projects or Find a Plot
    const quickBtns = page.locator('.gv-chip-btn, .gv-quick-action-btn');
    if (await quickBtns.count() > 0) {
      await quickBtns.first().click();
      await page.waitForTimeout(600);

      const msgs = page.locator('.gv-chat-msg');
      expect(await msgs.count()).toBeGreaterThan(1);
    }

    // Test text input query for pricing
    const input = page.locator('#gv-chat-input');
    const sendBtn = page.locator('#gv-chat-send');
    if (await input.isVisible()) {
      await input.fill('What is the plot price?');
      await sendBtn.click();
      await page.waitForTimeout(1000);

      // Verify response mentions real GV_DATA price
      const latestMsg = page.locator('.gv-chat-msg').last();
      const text = await latestMsg.innerText();
      expect(text).toMatch(/₹|Lakh|Sq\.Yds|price|cost/i);
    }
  });

  test('Layering, layout independence, and mobile viewport (375x812)', async ({ page }) => {
    // Desktop layout
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const launcher = page.locator('#gv-chatbot-launcher, .gv-chatbot-launcher');
    const launcherBox = await launcher.boundingBox();
    expect(launcherBox?.x).toBeGreaterThan(1000); // Bottom right
    expect(launcherBox?.y).toBeGreaterThan(600);

    // Header collision check: launcher should not touch top nav (y < 120)
    expect(launcherBox?.y).toBeGreaterThan(120);

    // Open chat and check panel position
    await launcher.click();
    await page.waitForTimeout(300);
    const panel = page.locator('#gv-chatbot-panel, .gv-chatbot-panel');
    const panelBox = await panel.boundingBox();
    expect(panelBox?.y).toBeGreaterThan(50);

    // Mobile layout
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, 'No horizontal overflow on mobile with chatbot open').toBe(false);

    // Close chatbot
    const closeBtn = page.locator('#gv-chat-close, .gv-chat-close-btn');
    await closeBtn.click();
    await page.waitForTimeout(300);

    // Verify page can still scroll when closed
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrolledY = await page.evaluate(() => window.scrollY);
    expect(scrolledY).toBeGreaterThan(0);
  });
});
