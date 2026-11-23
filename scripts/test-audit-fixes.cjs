const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.AUDIT_TEST_URL || 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/hero`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('#footer');
    for (const theme of ['dark', 'light']) {
      const toggle = page.getByRole('switch', { name: 'Dark mode' });
      if ((await toggle.getAttribute('aria-checked') === 'true') !== (theme === 'dark')) await toggle.click();
      await page.waitForTimeout(300);
      const surfaces = await page.locator('#armory,#advantage,#products').evaluateAll(es => es.map(e => getComputedStyle(e).backgroundColor));
      assert.ok(surfaces.every(color => color === (theme === 'dark' ? 'rgb(16, 18, 21)' : 'rgb(255, 255, 255)')), `${theme} backgrounds: ${surfaces}`);
      assert.ok((await page.locator('.gym-tour-arrival img').getAttribute('src')).includes(theme === 'dark' ? 'arrival-night' : 'arrival-street'));
    }
    console.log('PASS: dark/light surfaces and reduced-motion posters');
    await page.locator('.bd-cta').click();
    const dialog = page.getByRole('dialog', { name: /Make it/ }); await dialog.waitFor();
    await page.waitForTimeout(300);
    for (let i = 0; i < 12; i++) { assert.ok(await dialog.evaluate(e => e.contains(document.activeElement)), 'focus remains inside dialog'); await page.keyboard.press('Tab'); }
    await page.getByLabel('YOUR NAME', { exact: true }).fill('Audit Test');
    await page.getByRole('button', { name: 'Prepare', exact: true }).click();
    const href = await page.getByRole('link', { name: 'Open WhatsApp', exact: true }).getAttribute('href');
    const link = new URL(href); assert.equal(link.pathname, '/919558752573'); assert.ok(link.searchParams.get('text').includes('Audit Test'));
    // Inspect the prepared link only. Never send a test enquiry.
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    assert.ok(await page.locator('.bd-cta').evaluate(e => e === document.activeElement));
    console.log('PASS: named dialog, keyboard containment/restoration and real enquiry link');
    const html = await (await page.request.get(base, { timeout: 120000 })).text();
    assert.ok(html.includes('<main') && html.includes('<h1'), 'main content is server rendered'); assert.ok(html.includes('property="og:title"'));
    console.log('PASS: server-rendered main content and sharing metadata');
    await page.close();
    const fallback = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    fallback.on('pageerror', e => errors.push(e.message));
    await fallback.route('**/models/nexus-gym/interior.glb', route => route.abort());
    await fallback.route('**/models/nexus-gym/exterior.glb', route => route.abort());
    await fallback.goto(`${base}/hero`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await fallback.waitForFunction(() => document.getElementById('home')?.dataset.tourStatus === 'ready' && document.querySelector('#home canvas')?.dataset.interiorSettled === 'true' && document.querySelector('#home canvas')?.dataset.exteriorSettled === 'true', null, { timeout: 60000 });
    assert.equal(await fallback.locator('#home canvas').getAttribute('data-interior-source'), 'fallback');
    assert.equal(await fallback.locator('#home canvas').getAttribute('data-exterior-source'), 'fallback');
    assert.equal(await fallback.locator('.gym-tour-arrival').count(), 0);
    console.log('PASS: failed optional GLBs retain interactive ready tour');
    const model = fs.statSync('public/models/nexus-gym/priya-reception.glb'); assert.ok(model.size < 5 * 1024 * 1024);
    assert.deepEqual(errors, []);
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(error => { console.error('VERDICT: FAIL --', error); process.exitCode = 1; });
