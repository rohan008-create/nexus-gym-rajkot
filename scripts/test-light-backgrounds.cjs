const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = 'artifacts/themes/unified-backgrounds';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForSelector('#footer');
    const surfaces = () => page.locator('main section[id], main footer[id]').evaluateAll(es => es.map(e => ({ id: e.id, color: getComputedStyle(e).backgroundColor, image: getComputedStyle(e).backgroundImage })));
    const darkBefore = await surfaces();
    if (await page.locator('.gym-theme-switch').getAttribute('aria-checked') === 'true') await page.locator('.gym-theme-switch').click();
    for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      const sections = await surfaces();
      assert.equal(sections.length, 13, 'all 13 page sections scanned');
      for (const section of sections) { assert.equal(section.color, 'rgb(255, 255, 255)', `${name}: ${section.id} uses white`); assert.equal(section.image, 'none', `${section.id} has no tinted page gradient`); }
      assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 255, 255)');
      report.push({ viewport: name, sections });
      console.log(`PASS: ${name}, 13 section backgrounds and body are white`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#advantage').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${out}/light-advantage.png` });
    await page.locator('#location').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-globe-theme]') || document.querySelector('.globe-fallback-view'), null, { timeout: 90000 });
    const globe = page.locator('[data-globe-theme]');
    if (await globe.count()) {
      assert.equal(await globe.getAttribute('data-globe-theme'), 'light');
      await page.locator('.gym-theme-switch').click();
      await page.waitForFunction(() => document.querySelector('[data-globe-theme]')?.getAttribute('data-globe-theme') === 'dark');
      assert.deepEqual(await surfaces(), darkBefore, 'switching back restores every dark background');
      await page.locator('.gym-theme-switch').click();
      await page.waitForFunction(() => document.querySelector('[data-globe-theme]')?.getAttribute('data-globe-theme') === 'light');
      console.log('PASS: globe canvas follows live light/dark switches');
    } else {
      assert.equal(await page.locator('.globe-fallback-view').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 255, 255)');
      console.log('PASS: globe fallback stays white; canvas unavailable in this browser run');
      await page.locator('.gym-theme-switch').click();
      assert.deepEqual(await surfaces(), darkBefore);
      await page.locator('.gym-theme-switch').click();
    }
    await page.screenshot({ path: `${out}/light-location.png` });
    fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(e => { console.error('VERDICT: FAIL --', e); process.exitCode = 1; });
