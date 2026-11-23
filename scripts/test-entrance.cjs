const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.ENTRANCE_TEST_URL || 'http://127.0.0.1:3001';

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--enable-webgl', '--use-angle=d3d11'] });
  const errors = [];
  fs.mkdirSync('qa', { recursive: true });
  async function open(mobile = false, reduced = false) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install();
    await page.goto(base, { timeout: 90000 });
    await page.locator('.entrance-skip:not(:disabled)').waitFor({ timeout: 60000 });
    await page.locator('.intro[data-ready="true"]').waitFor({ timeout: 60000 });
    await page.waitForTimeout(2500);
    return page;
  }
  async function trigger(page, mobile) {
    const canvas = page.locator('.intro canvas');
    const box = await canvas.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height * .51;
    if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await page.locator('[data-entrance="breaking"]').waitFor();
  }
  try {
    const page = await open();
    assert.equal(await page.locator('.entrance-landing').evaluate(el => el.inert), true);
    await page.mouse.wheel(0, 500); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => scrollY), 0, 'intro scroll is locked');
    await page.mouse.click(50, 200);
    assert.equal(await page.locator('.nexus-entrance').getAttribute('data-entrance'), 'waiting', 'background does not trigger');
    await page.mouse.move(720, 450); await page.mouse.down(); await page.mouse.move(765, 455, { steps: 6 }); await page.mouse.up();
    assert.equal(await page.locator('.nexus-entrance').getAttribute('data-entrance'), 'waiting', 'drag does not trigger');
    await page.screenshot({ path: 'qa/entrance-idle.png' });
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10000));
    await trigger(page, false);
    await page.clock.runFor(420);
    await page.screenshot({ path: 'qa/entrance-impact.png' });
    await page.clock.runFor(500);
    await page.screenshot({ path: 'qa/entrance-fracture.png' });
    await page.clock.runFor(420);
    await page.screenshot({ path: 'qa/entrance-curl.png' });
    assert.equal(await page.locator('.intro').count(), 1, 'intro stays mounted during reveal');
    await page.clock.runFor(1800); await page.clock.resume();
    await page.locator('[data-entrance="revealed"]').waitFor();
    assert.equal(await page.locator('.intro').count(), 0, 'intro canvas removed');
    assert.equal(await page.locator('.entrance-landing').evaluate(el => el.inert), false);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'qa/entrance-revealed.png' });
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'hero-title', 'focus moves to the revealed landing');
    await page.locator('#about .bd-cta').click();
    await page.getByRole('dialog', { name: /Make it/ }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.close();
    const skipped = await browser.newPage();
    skipped.on('pageerror', e => errors.push(e.message));
    const tourModels = [];
    await skipped.route('**/models/nexus-gym/*.glb', route => {
      tourModels.push(route.request().url());
      return route.abort();
    });
    await skipped.goto(base, { waitUntil: 'domcontentloaded' });
    await skipped.locator('.intro[data-ready="true"]').waitFor({ timeout: 60000 });
    assert.deepEqual(tourModels, [], 'tour models do not load during the intro');
    await skipped.getByRole('button', { name: 'ENTER NEXUS' }).click();
    await skipped.locator('[data-entrance="revealed"]').waitFor();
    assert.equal(await skipped.locator('.entrance-landing').evaluate(el => el.inert), false, 'entry works without the detailed tour models');
    assert.equal(tourModels.some(url => /\/(interior|priya-reception)\.glb$/.test(url)), false, 'interior assets wait for tour progress');
    await skipped.close();
    for (const reduced of [false, true]) {
      const mobile = await open(true, reduced);
      if (!reduced) {
        await mobile.screenshot({ path: 'qa/entrance-mobile-idle.png' });
        await mobile.clock.pauseAt(await mobile.evaluate(() => Date.now() + 10000));
      }
      await trigger(mobile, true);
      if (!reduced) {
        await mobile.clock.runFor(950);
        await mobile.screenshot({ path: 'qa/entrance-mobile-rift.png' });
        await mobile.clock.runFor(1800); await mobile.clock.resume();
      }
      await mobile.locator('[data-entrance="revealed"]').waitFor({ timeout: 15000 });
      await mobile.waitForTimeout(700);
      await mobile.screenshot({ path: `qa/entrance-mobile${reduced ? '-reduced' : ''}.png` });
      assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
      await mobile.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync('qa/entrance-result.json', JSON.stringify({ passed: true, checks: ['background and drag rejection', 'scroll lock', 'continuous full-page tear and curl', 'intro disposal', 'landing focus and interactivity', 'skip', 'mobile tap', 'reduced motion', 'no horizontal overflow'], errors }, null, 2));
    console.log('Entrance checks passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
