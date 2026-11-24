const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const base = process.env.ENTRANCE_TEST_URL || 'http://127.0.0.1:3000';
const executablePath = process.env.BROWSER_EXECUTABLE;
const screenshotDir = process.env.ENTRANCE_SCREENSHOT_DIR;

(async () => {
  // The 2D intro and its handoff must work even when WebGL is unavailable.
  const browser = await chromium.launch({ executablePath, args: ['--disable-3d-apis'] });
  const errors = [];
  const desktop = { viewport: { width: 1440, height: 900 } };
  const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

  async function open(layout, reducedMotion = 'no-preference', path = '/') {
    const page = await browser.newPage({ ...layout, reducedMotion });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' });
    await page.locator('#home').waitFor();
    await page.waitForFunction(() => document.documentElement.classList.contains('lenis'));
    return page;
  }

  try {
    for (const [name, layout] of Object.entries({ desktop, mobile })) {
      const page = await open(layout);
      const opening = page.locator('.nexus-opening');
      await page.locator('.nexus-opening[data-active]').waitFor();
      assert.equal(await opening.locator('.nexus-opening-blade').count(), 5);
      assert.equal(await opening.locator('canvas').count(), 1);
      await page.waitForFunction(() => {
        const value = Number(document.querySelector('.nexus-opening-counter')?.textContent);
        const canvas = document.querySelector('.nexus-opening canvas');
        if (!canvas || value < 15 || value >= 100) return false;
        const pixel = canvas.getContext('2d').getImageData(Math.round(canvas.width * .12), Math.round(canvas.height * .5), 1, 1).data;
        return pixel[0] > pixel[1] * 2 && pixel[3] > 0;
      }, null, { timeout: 3000 });
      if (screenshotDir) await page.screenshot({ path: `${screenshotDir}/nexus-opening-${name}.png` });

      if (name === 'mobile') {
        await page.touchscreen.tap(190, 350);
      } else {
        const skip = page.getByRole('button', { name: 'Skip intro' });
        await page.keyboard.press('Tab');
        assert.equal(await skip.evaluate(button => button === document.activeElement), true);
        await page.keyboard.press('Enter');
      }
      await opening.waitFor({ state: 'detached' });
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      console.log(`${name}: the ECG, five shutters and early dismissal verified.`);
      await page.close();
    }

    const automatic = await open(desktop);
    await automatic.waitForFunction(() => {
      const fill = document.querySelectorAll('.nexus-opening-fill')[2];
      return fill && getComputedStyle(fill).clipPath === 'inset(0%)' && getComputedStyle(fill).color === 'rgb(255, 30, 60)';
    }, null, { timeout: 6000 });
    if (screenshotDir) await automatic.screenshot({ path: `${screenshotDir}/nexus-opening-wordmark.png` });
    await automatic.waitForFunction(() => {
      const [up, down] = document.querySelectorAll('.nexus-opening-blade');
      return up && down && new DOMMatrix(getComputedStyle(up).transform).m42 < -30 &&
        new DOMMatrix(getComputedStyle(down).transform).m42 > 30;
    }, null, { timeout: 4000 });
    await automatic.locator('.nexus-opening').waitFor({ state: 'detached' });
    assert.ok(await automatic.getByRole('heading', { level: 1, name: /Nexus Fitness Club/ }).isVisible());
    await automatic.close();

    const navigation = await open(desktop, 'no-preference', '/hero');
    const opening = navigation.locator('.nexus-opening[data-active]');
    await opening.waitFor();
    await navigation.mouse.move(640, 410);
    await navigation.mouse.wheel(0, 140);
    await opening.waitFor({ state: 'detached' });
    await navigation.waitForFunction(() => scrollY > 0);
    await navigation.waitForFunction(() => !document.documentElement.classList.contains('lenis-scrolling'));
    await navigation.evaluate(() => scrollTo({ top: 1400, behavior: 'instant' }));
    await navigation.waitForFunction(() => scrollY >= 900);
    await navigation.reload({ waitUntil: 'load' });
    await opening.waitFor();
    await navigation.waitForFunction(() => scrollY === 0);
    await navigation.close();

    const reduced = await open(mobile, 'reduce');
    assert.equal(await reduced.locator('.nexus-opening').isVisible(), false);
    assert.ok(await reduced.getByRole('button', { name: 'Book a trial' }).first().isVisible());
    await reduced.close();

    const linked = await open(desktop, 'no-preference', '/#about');
    assert.equal(await linked.locator('.nexus-opening').isVisible(), false);
    await linked.close();

    assert.deepEqual(errors, []);
    console.log('Wordmark fill, shutter motion, automatic reveal, /hero, reload, wheel, reduced motion and direct section links verified.');
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(error => { console.error('VERDICT: FAIL', error); process.exitCode = 1; });
