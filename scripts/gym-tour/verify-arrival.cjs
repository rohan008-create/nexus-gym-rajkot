const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.TOUR_TEST_URL || 'http://localhost:3000';
const out = 'artifacts/gym-tour/arrival';
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], errors: [], stairs: [], limits: ['Headless Chrome with explicit D3D11 ANGLE and touch emulation; no physical-device or FPS guarantee.'] };
function check(label, value) { assert.ok(value, label); report.checks.push(label); console.log('PASS:', label); }
async function run() {
  // Use the same explicit Windows backend as the repository's entrance checks.
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-angle=d3d11'] });
  const watch = page => {
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /THREE|shader|WebGLProgram/.test(message.text())) report.errors.push(message.text()); });
  };
  async function go(page, value) {
    await page.evaluate(value => {
      const e = document.getElementById('home');
      window.scrollTo({ top: e.getBoundingClientRect().top + scrollY + (e.offsetHeight - innerHeight) * value, behavior: 'instant' });
    }, value);
    // Browser scroll positions are rounded to physical pixels.
    await page.waitForFunction(value => Math.abs(Number(document.getElementById('home').dataset.tourProgress) - value) < .001, value, { timeout: 30000 });
    await page.waitForTimeout(600);
  }
  try {
    for (const mobile of [false, true]) {
      const label = mobile ? 'mobile' : 'desktop';
      const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });
      watch(page);
      await page.goto(base + '/hero', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForFunction(() => document.querySelector('#home canvas')?.dataset.guideSource === 'ready', null, { timeout: 90000 });
      await page.waitForFunction(() => document.querySelector('#home canvas')?.dataset.guideState === 'wave', null, { timeout: 10000 });
      check(label + ': Ryan greets with Wave', true);
      await page.waitForFunction(() => document.querySelector('#home canvas')?.dataset.exteriorSource === 'detailed' && document.querySelector('#home canvas')?.dataset.interiorSource === 'detailed', null, { timeout: 90000 });
      check(label + ': navbar and old footer removed', await page.locator('.site-nav,.gym-tour-footer,.gym-tour-copy').count() === 0);
      check(label + ': stage fills viewport', await page.locator('.gym-tour-stage').evaluate(e => Math.abs(e.getBoundingClientRect().height - innerHeight) < 2));
      await page.screenshot({ path: `${out}/${label}-arrival.png` });
      await page.getByRole('button', { name: 'FOLLOW RYAN INSIDE' }).click();
      await page.waitForFunction(() => Math.abs(Number(document.getElementById('home').dataset.tourProgress) - .12) < .001);
      await page.waitForTimeout(400); // let Lenis finish its programmatic movement
      check(label + ': entry hint advances camera', true);
      for (const value of [.2, .26, .32, .41, .5, .52]) {
        await go(page, value);
        const data = await page.locator('#home canvas').evaluate(e => ({ ...e.dataset }));
        check(label + ': feet reach treads at ' + value, Number(data.guideFootError) < .03);
        report.stairs.push({ label, value, footError: data.guideFootError, position: data.guidePosition });
      }
      await go(page, .32);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${out}/${label}-stairs.png` });
      const a = await page.locator('#home canvas').screenshot();
      await page.waitForTimeout(350);
      check(label + ': walking freezes when scrolling stops', a.equals(await page.locator('#home canvas').screenshot()));
      await go(page, .65);
      await page.screenshot({ path: `${out}/${label}-door.png` });
      await go(page, .92);
      await page.screenshot({ path: `${out}/${label}-interior.png` });
      await page.locator('#home [data-tour-trial]').click();
      await page.locator('#trial-enquiry-form').waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      await page.locator('#trial-enquiry-form').waitFor({ state: 'hidden' });
      check(label + ': end-of-tour enquiry and Escape work', true);
      await go(page, 0);
      check(label + ': reverse scroll restores greeter', (await page.locator('#home canvas').getAttribute('data-guide-position')) === '8.050,0.420,8.800');
      check(label + ': no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (!mobile) {
        await page.mouse.wheel(0, 600);
        await page.waitForFunction(() => Number(document.getElementById('home').dataset.tourProgress) > .02);
        check('native wheel drives the tour', true);
      } else {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: 650 }] });
        for (let y = 620; y >= 250; y -= 35) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y }] }); await page.waitForTimeout(25); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForFunction(() => Number(document.getElementById('home').dataset.tourProgress) > .01);
        check('touch swipe drives the tour', true);
      }
      await page.getByRole('button', { name: 'Skip tour' }).click();
      await page.waitForFunction(() => Math.abs(document.getElementById('about').getBoundingClientRect().top) < 5);
      check(label + ': skip reaches existing About', true);
      await page.waitForFunction(() => document.getElementById('home').dataset.tourActive === 'false');
      const before = await page.locator('#home canvas').getAttribute('data-guide-position');
      await page.waitForTimeout(300);
      check(label + ': offscreen guide stops', before === await page.locator('#home canvas').getAttribute('data-guide-position'));
      await page.close();
    }
    const reduced = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
    watch(reduced);
    await reduced.goto(base + '/hero');
    await reduced.locator('.gym-tour-static-copy').waitFor();
    check('reduced motion has a short readable hero with enquiry', await reduced.locator('#home').evaluate(e => e.offsetHeight <= innerHeight * 1.1) && await reduced.locator('#home canvas').count() === 0);
    await reduced.screenshot({ path: `${out}/reduced-motion.png` });
    await reduced.close();

    const home = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    watch(home);
    await home.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await home.locator('.entrance-skip:not(:disabled)').waitFor({ timeout: 90000 });
    await home.locator('.entrance-skip').click();
    await home.locator('[data-entrance="revealed"]').waitFor();
    await home.waitForFunction(() => document.activeElement?.id === 'hero-title' && !document.querySelector('.entrance-landing').inert);
    check('main homepage intro still unlocks landing and hands focus to hero', true);
    await home.waitForFunction(() => document.querySelector('#home canvas')?.dataset.guideSource === 'ready', null, { timeout: 90000 });
    await home.screenshot({ path: `${out}/homepage-revealed.png` });
    await home.evaluate(() => document.querySelector('#home canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await home.waitForFunction(() => document.getElementById('home').dataset.tourStatus === 'error');
    check('context loss leaves a short usable fallback', await home.locator('#home [data-tour-trial]').isVisible());
    await home.locator('#home [data-tour-trial]').click();
    await home.locator('#trial-enquiry-form').waitFor({ state: 'visible' });
    check('fallback enquiry still works', true);
    await home.close();
    check('no uncaught runtime or shader errors', report.errors.length === 0);
    report.passed = true;
    console.log(`${report.checks.length} arrival checks passed.`);
    console.log('VERDICT: PASS');
  } finally {
    fs.writeFileSync(`${out}/browser-checks.json`, JSON.stringify(report, null, 2) + '\n');
    await browser.close();
  }
}
run().catch(error => { console.error('VERDICT: FAIL --', error); process.exitCode = 1; });
