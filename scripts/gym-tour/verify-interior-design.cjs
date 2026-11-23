const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = 'artifacts/gym-tour/interior-design';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-angle=d3d11'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => document.querySelector('#home canvas')?.dataset.interiorSource === 'detailed', null, { timeout: 120000 });
    for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      for (const [name, progress] of [['strength', .94], ['cardio', 1], ['reception', .79]]) {
        await page.evaluate(p => { const el = document.getElementById('home'); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) * p, behavior: 'instant' }); }, progress);
        await page.waitForFunction(p => Math.abs(Number(document.getElementById('home').dataset.tourProgress) - p) < .002, progress, { timeout: 30000 });
        await page.waitForTimeout(1000);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({ path: `${out}/${label}-${name}.png` });
        console.log(`PASS: ${label} ${name}`);
      }
    }
    assert.deepEqual(errors, []);
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(error => { console.error('VERDICT: FAIL --', error); process.exitCode = 1; });
