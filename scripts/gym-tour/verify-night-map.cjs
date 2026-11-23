const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = 'artifacts/gym-tour/night-map';
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(`${out}/policy.json`, JSON.stringify({ planning: 'compact', context_depth: 'dependency', verification_depth: 'impact', delegation: 'none', acceptance: ['pin centred after flight on desktop and mobile', 'marker not covered by location card', 'live day/night lighting', 'theme switch persists'] }, null, 2));
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-angle=d3d11'] });
  const errors = [];
  const failedImagery = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', request => { if (/arcgisonline|openstreetmap|cesium.com/.test(request.url())) failedImagery.push({ url: request.url().split('?')[0], reason: request.failure()?.errorText }); });
    await page.goto('http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => document.querySelector('#home canvas')?.dataset.exteriorSource === 'detailed' && document.querySelector('#home canvas')?.dataset.streetSource === '3d', null, { timeout: 120000 });
    const toggle = page.getByRole('switch', { name: 'Dark mode' });
    for (const theme of ['night', 'day', 'night']) {
      if ((await toggle.getAttribute('aria-checked') === 'true') !== (theme === 'night')) await toggle.click();
      await page.waitForFunction(t => document.querySelector('#home canvas')?.dataset.sceneTime === t, theme);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${out}/desktop-${theme}.png` });
      assert.equal(await page.evaluate(() => localStorage.getItem('nexus-theme') || 'dark'), theme === 'night' ? 'dark' : 'light');
      console.log(`PASS: ${theme} scene and theme persistence`);
    }
    for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      if (label === 'mobile') {
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${out}/mobile-night.png` });
      }
      await page.locator('#location').evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: 'instant' }));
      await page.waitForFunction(() => document.querySelector('.cesium-globe-canvas[data-globe-theme]') && !document.querySelector('.globe-loading-overlay'), null, { timeout: 120000 });
      if (label === 'mobile') {
        await page.getByRole('button', { name: 'Reset to Earth view', exact: true }).click();
        await page.waitForTimeout(3800);
      }
      await page.getByRole('button', { name: 'Explore Nexus Fitness Club in Rajkot, Gujarat', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-destination-state=arrived]'), null, { timeout: 20000 });
      await page.waitForTimeout(700);
      const framing = await page.evaluate(() => {
        const el = document.querySelector('.cesium-globe-canvas'); const rect = el.getBoundingClientRect();
        const [x, y] = el.dataset.markerScreen.split(',').map(Number);
        const card = document.querySelector('.globe-info-card').getBoundingClientRect();
        return { x, y, width: rect.width, height: rect.height, covered: rect.left + x >= card.left && rect.left + x <= card.right && rect.top + y >= card.top && rect.top + y <= card.bottom };
      });
      assert.ok(Math.abs(framing.x - framing.width / 2) < 8, `${label} marker centred horizontally: ${JSON.stringify(framing)}`);
      assert.ok(Math.abs(framing.y - framing.height / 2) < 8, `${label} marker centred vertically`);
      assert.equal(framing.covered, false, `${label} location card must not cover marker`);
      await page.screenshot({ path: `${out}/${label}-destination.png` });
      console.log(`PASS: ${label} destination marker centred and visible`);
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${out}/network.json`, JSON.stringify({ failedImagery }, null, 2));
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(e => { console.error('VERDICT: FAIL --', e); process.exitCode = 1; });
