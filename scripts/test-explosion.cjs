const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: process.env.WEBGL_SOFTWARE === '1' ? ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--enable-webgl', '--use-angle=d3d11'] });
  const errors = [];
  fs.mkdirSync('qa', { recursive: true });
  const phase = page => page.locator('main.intro').getAttribute('data-phase');
  const open = async (mobile = false) => {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 960, height: 720 }, hasTouch: mobile, isMobile: mobile });
    page.setDefaultTimeout(60000);
    await page.clock.install();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto((process.env.EXPLOSION_TEST_URL || 'http://127.0.0.1:3000') + '/intro', { timeout: 90000 });
    await page.waitForSelector('canvas', { timeout: 90000 });
    await page.locator('main.intro[data-ready="true"]').waitFor({ timeout: 60000 });
    await page.waitForTimeout(2000);
    return page;
  };
  try {
    const page = await open();
    await page.screenshot({ path: 'qa/phase2-idle.png' });
    await page.mouse.click(80, 150); assert.equal(await phase(page), 'IDLE', 'background click');
    await page.mouse.move(480, 345); await page.mouse.down(); await page.mouse.move(540, 350, { steps: 8 }); await page.mouse.up();
    assert.equal(await phase(page), 'IDLE', 'orbit drag must not explode');
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
    await page.mouse.click(480, 350); assert.equal(await phase(page), 'EXPLODING', 'bag click');
    await page.mouse.click(480, 350); assert.equal(await phase(page), 'EXPLODING', 'duplicate click');
    await page.clock.runFor(280); await page.screenshot({ path: 'qa/phase2-burst.png' });
    await page.clock.runFor(450); assert.equal(await phase(page), 'FALLING'); await page.screenshot({ path: 'qa/phase2-falling.png' });
    await page.clock.fastForward(2900); assert.equal(await phase(page), 'COMPLETE'); await page.clock.resume();
    await page.screenshot({ path: 'qa/phase2-complete.png' });
    assert.equal(await page.locator('.hint').count(), 0); assert.equal(await page.locator('.sound-control').count(), 0);
    await page.getByRole('button', { name: 'Replay', exact: true }).click(); await page.waitForTimeout(2200);
    assert.equal(await phase(page), 'IDLE'); await page.screenshot({ path: 'qa/phase2-replay.png' });
    await page.close();
    const mobile = await open(true);
    await mobile.getByRole('button', { name: 'Mute explosion sound' }).click();
    await mobile.touchscreen.tap(25, 170); assert.equal(await phase(mobile), 'IDLE');
    await mobile.touchscreen.tap(195, 410); assert.equal(await phase(mobile), 'EXPLODING', 'mobile bag tap');
    await mobile.locator('main[data-phase="COMPLETE"]').waitFor({ timeout: 15000 });
    await mobile.getByRole('button', { name: 'Replay', exact: true }).click(); await mobile.waitForTimeout(2000);
    await mobile.locator('main.intro[data-ready="true"]').waitFor({ timeout: 60000 });
    await mobile.emulateMedia({ reducedMotion: 'reduce' });
    await mobile.touchscreen.tap(195, 410); await mobile.locator('main[data-phase="COMPLETE"]').waitFor({ timeout: 15000 });
    assert.deepEqual(errors, []);
    fs.writeFileSync('qa/phase2-result.json', JSON.stringify({ passed: true, checks: ['background', 'drag rejection', 'click', 'duplicate rejection', 'burst', 'falling', 'complete', 'replay', 'touch', 'mute', 'reduced motion'], errors }, null, 2));
    console.log('Phase 2 browser checks passed.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
