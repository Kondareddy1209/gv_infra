// @ts-check
const { test, expect } = require('@playwright/test');

const PAGES = [
  'index.html',
  'projects.html',
  'project.html',
  'admin.html',
  'concept-landing.html'
];

const VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '375x812', width: 375, height: 812 }
];

test.describe('Section 2: Page Load, Network, Console, & Overflow Audit', () => {
  for (const pageName of PAGES) {
    test(`Page ${pageName} - Load success, zero JS errors, zero 404s`, async ({ page }) => {
      const jsErrors = [];
      const failedRequests = [];
      const notFoundAssets = [];

      page.on('pageerror', err => {
        jsErrors.push(err.message);
      });

      page.on('requestfailed', req => {
        // Ignore deliberate aborts
        if (req.failure()?.errorText !== 'net::ERR_ABORTED') {
          failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
        }
      });

      page.on('response', resp => {
        if (resp.status() >= 400) {
          // Check if this is an external tile / CDN font optional failure vs local asset
          notFoundAssets.push(`${resp.status()}: ${resp.url()}`);
        }
      });

      const response = await page.goto(`/${pageName}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);

      // Wait a moment for dynamic scripts to run
      await page.waitForTimeout(1000);

      // Verify no critical JavaScript errors occurred during load
      expect(jsErrors, `JavaScript errors on ${pageName}: ${jsErrors.join(' | ')}`).toHaveLength(0);

      // Verify no local asset 404s
      const local404s = notFoundAssets.filter(url => url.includes('localhost:8000'));
      expect(local404s, `Local 404 assets on ${pageName}: ${local404s.join(' | ')}`).toHaveLength(0);
    });

    test(`Page ${pageName} - Responsive Viewports & Horizontal Overflow`, async ({ page }) => {
      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`/${pageName}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        const dimensions = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth
        }));

        expect(
          dimensions.scrollWidth,
          `Horizontal overflow on ${pageName} at ${vp.name}: scrollWidth (${dimensions.scrollWidth}) > innerWidth (${dimensions.innerWidth})`
        ).toBeLessThanOrEqual(dimensions.innerWidth);
      }
    });
  }

  test('Internal links crawl - No broken routes', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .map(a => a.getAttribute('href'))
        .filter(h => h && !h.startsWith('#') && !h.startsWith('http') && !h.startsWith('tel:') && !h.startsWith('mailto:') && !h.startsWith('javascript:'));
    });

    const uniqueLinks = Array.from(new Set(links));
    for (const href of uniqueLinks) {
      const cleanHref = href.split('#')[0].split('?')[0];
      if (!cleanHref) continue;
      const resp = await page.request.get(`/${cleanHref}`);
      expect(resp.status(), `Broken link found: ${href}`).toBe(200);
    }
  });
});
