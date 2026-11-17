const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--enable-webgl', '--use-angle=d3d11'] });
  const errors = [], checks = [];
  fs.mkdirSync('qa', { recursive: true });
  const base = process.env.IRON_WORLD_TEST_URL || 'http://localhost:3000';
  try {
    for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['small-mobile', 320, 740], ['tablet', 820, 1180]]) {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 760, hasTouch: width < 760 });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${base}/hero`, { timeout: 120000 });
      await page.waitForSelector('[data-rope-status="ready"]', { timeout: 90000 });
      await page.waitForTimeout(3200);
      assert.match((await page.locator('h1').innerText()).replace(/\s/g, ''), /BEYONDLIMITS\./);
      assert.equal(await page.locator('.iron-world-scene canvas').count(), 1);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: no horizontal overflow`);
      const heading = await page.locator('h1').boundingBox();
      assert.ok(heading.x >= 0 && heading.x + heading.width <= width + 1, 'headline fits screen');
      const scene = await page.locator('.iron-world-scene').boundingBox();
      assert.equal(Math.round(scene.width), width, '3D scene spans the hero');
      await page.screenshot({ path: `qa/iron-world-${name}.png` });
      if (width < 760) {
        await page.evaluate(() => scrollTo(0, 150));
        await page.waitForTimeout(600);
        await page.screenshot({ path: `qa/iron-world-${name}-scene.png` });
        await page.evaluate(() => scrollTo(0, 0));
      }
      await page.locator('.hero-actions').getByRole('button', { name: 'Book a Trial' }).click();
      assert.equal(await page.locator('.trial-dialog').evaluate(dialog => dialog.open), true);
      await page.keyboard.press('Escape');
      await page.locator('.hero-actions').getByRole('button', { name: 'Explore Programs' }).click();
      await page.waitForTimeout(1600);
      assert.ok(await page.locator('#programs').evaluate(el => Math.abs(el.getBoundingClientRect().top) < 150), 'Programs navigation');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(500);
      assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).visibility), 'visible');
      assert.equal(await page.locator('.iron-world-scene').evaluate(el => getComputedStyle(el).opacity), '1');
      if (name === 'desktop') {
        await page.locator('.iron-world-scene canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
        await page.waitForSelector('.iron-world-scene.is-fallback');
        assert.equal(await page.locator('.hero-actions button').count(), 2);
        await page.screenshot({ path: 'qa/iron-world-fallback.png' });
      }
      checks.push(`${name}: rendered, no overflow, trial, Programs, reduced motion`);
      console.log(checks[checks.length - 1]);
      await page.close();
    }
    const entrance = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    entrance.on('pageerror', error => errors.push(error.message));
    await entrance.goto(base, { timeout: 120000 });
    await entrance.getByRole('button', { name: /ENTER NEXUS/ }).click({ timeout: 90000 });
    await entrance.waitForSelector('[data-entrance="revealed"]');
    await entrance.waitForSelector('[data-rope-status="ready"]');
    await entrance.waitForTimeout(1600);
    assert.equal(await entrance.locator('.entrance-overlay').count(), 0);
    assert.equal(await entrance.locator('.entrance-landing').evaluate(el => el.inert), false);
    await entrance.screenshot({ path: 'qa/iron-world-entrance.png' });
    await entrance.close();
    checks.push('homepage entrance reveals interactive gym hero');
    assert.deepEqual(errors, []);
    fs.writeFileSync('qa/iron-world-result.json', JSON.stringify({ passed: true, checks, errors }, null, 2));
    console.log(checks.join('\n'));
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(error => { console.error('VERDICT: FAIL --', error); process.exitCode = 1; });
