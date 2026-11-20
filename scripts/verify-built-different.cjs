const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = 'artifacts/built-different';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11'] });
  const errors = [], checks = [];
  try {
    for (const mobile of [false, true]) {
      const label = mobile ? 'mobile' : 'desktop';
      const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: 'reduce', isMobile: mobile, hasTouch: mobile });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.locator('.built-different').waitFor();
      for (const theme of ['dark', 'light']) {
        await page.getByRole('button', { name: `${theme === 'dark' ? 'Dark' : 'Light'} mode`, exact: true }).click();
        await page.locator('.bd-header').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        assert.ok(await page.locator('.bd-heading').isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
        await page.screenshot({ path: `${out}/${label}-${theme}-header.png` });
        await page.locator('.bd-studio').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('.bd-sculpture canvas')?.dataset.aboutFrame !== undefined, null, { timeout: 30000 });
        await page.screenshot({ path: `${out}/${label}-${theme}-studio.png` });
        for (const pillar of ['Endurance', 'Confidence', 'Strength']) {
          await page.getByRole('button', { name: `Explore ${pillar}`, exact: true }).click();
          assert.equal(await page.locator('.built-different').getAttribute('data-selected-pillar'), pillar.toLowerCase());
          await page.waitForFunction(i => document.querySelector('.bd-sculpture canvas')?.dataset.aboutSelected === String(i), ['Strength','Endurance','Confidence'].indexOf(pillar));
          assert.equal(await page.getByRole('button', { name: `Explore ${pillar}`, exact: true }).getAttribute('aria-pressed'), 'true');
        }
        await page.screenshot({ path: `${out}/${label}-${theme}-cards.png` });
        await page.locator('.bd-cta').click();
        await page.locator('#trial-enquiry-form').waitFor({ state: 'visible' });
        await page.keyboard.press('Escape');
        await page.locator('#trial-enquiry-form').waitFor({ state: 'hidden' });
        assert.equal(await page.locator('.built-different').getAttribute('data-about-motion'), 'reduced');
        checks.push(`${label} ${theme}: responsive layout, three pillars, 3D selection, enquiry and reduced motion`);
        console.log('PASS:', checks.at(-1));
      }
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('.bd-studio').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => Number(document.querySelector('.bd-sculpture canvas')?.dataset.aboutFrame) > .2, null, { timeout: 60000 });
    const canvas = page.locator('.bd-sculpture canvas');
    const before = await canvas.getAttribute('data-about-frame');
    await page.waitForTimeout(400);
    assert.notEqual(await canvas.getAttribute('data-about-frame'), before, 'sculpture animates at rest');
    await page.screenshot({ path: `${out}/animated-studio.png` });
    await page.locator('.nexus-simple-footer').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const stopped = await canvas.getAttribute('data-about-frame');
    await page.waitForTimeout(400);
    assert.equal(await canvas.getAttribute('data-about-frame'), stopped, 'offscreen sculpture pauses');
    checks.push('ambient 3D motion and offscreen pause');
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${out}/checks.json`, JSON.stringify({ checks, errors }, null, 2));
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(e => { console.error('VERDICT: FAIL --', e); process.exitCode = 1; });
