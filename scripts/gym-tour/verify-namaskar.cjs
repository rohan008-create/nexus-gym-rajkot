const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = 'artifacts/gym-tour/namaskar';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-angle=d3d11'] });
  const errors = [];
  try {
    for (const mobile of [false, true]) {
      const label = mobile ? 'mobile' : 'desktop';
      const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForFunction(() => document.querySelector('#home .gym-tour-world canvas')?.dataset.guideSource === 'ready', null, { timeout: 90000 });
      for (const progress of [.74, .79, .82, .85, .79]) {
        await page.evaluate(p => { const e = document.getElementById('home'); window.scrollTo({ top: e.getBoundingClientRect().top + scrollY + (e.offsetHeight - innerHeight) * p, behavior: 'instant' }); }, progress);
        await page.waitForFunction(p => Math.abs(Number(document.getElementById('home').dataset.tourProgress) - p) < .001, progress, { timeout: 30000 });
        await page.waitForTimeout(500);
        await page.waitForFunction(() => document.querySelector('#home .gym-tour-world canvas')?.dataset.receptionHost === 'priya', null, { timeout: 90000 });
        const data = await page.locator('#home .gym-tour-world canvas').evaluate(e => ({ ...e.dataset }));
        assert.equal(data.receptionHeight, '4.51', 'host stands on the reception floor');
        assert.equal(data.receptionHost, 'priya', 'reception uses the supplied female host');
        assert.ok(Number(data.receptionHandError) < .01, `hands reach greeting targets: ${data.receptionHandError}`);
        if (progress >= .79) assert.equal(data.receptionPose, 'namaskar');
        await page.screenshot({ path: `${out}/${label}-${progress}.png` });
        console.log(`PASS: ${label} ${progress}: standing, greeting targets within ${data.receptionHandError}m`);
      }
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(e => { console.error('VERDICT: FAIL --', e); process.exitCode = 1; });
