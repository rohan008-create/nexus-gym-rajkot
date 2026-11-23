const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sharp = require('sharp');
const baseUrl = process.env.ARMORY_TEST_URL || 'http://127.0.0.1:3000';
const output = 'artifacts/armory-redesign';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const errors = [], failures = [], checks = [];
  const open = async ({ width = 1440, height = 1000, reduce = false, noGL = false, theme = 'light' } = {}) => {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: width < 600, hasTouch: width < 600, reducedMotion: reduce ? 'reduce' : 'no-preference' });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
    await page.addInitScript(({ noGL, theme }) => {
      localStorage.setItem('nexus-theme', theme);
      if (noGL) {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl2' && this.closest('.armory-peel') ? null : original.call(this, type, ...args); };
      }
    }, { noGL, theme });
    await page.goto(`${baseUrl}/hero`, { timeout: 90000 });
    await page.locator('#armory').waitFor({ timeout: 90000 });
    return page;
  };
  const enter = async page => {
    await page.evaluate(() => {
      const el = document.querySelector('#armory');
      window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 84);
    });
    await page.waitForFunction(() => document.querySelector('#armory').dataset.revealed === 'true', null, { timeout: 20000 });
    await page.waitForTimeout(750);
  };
  try {
    for (const name of ['barbell', 'treadmill', 'cable']) {
      const file = `public/assets/armory/${name}-transparent.webp`;
      const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.channels, 4, `${name} has alpha`);
      let transparent = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
      assert.ok(transparent / (info.width * info.height) > .2, `${name} has actual transparent background`);
    }
    checks.push('three genuine alpha-channel equipment assets');
    const page = await open();
    assert.equal(await page.locator('.armory-peel').getAttribute('data-peel-started'), 'false', 'does not animate before viewport entry');
    assert.equal(await page.locator('#advantage').evaluate(el => el.previousElementSibling.id), 'armory');
    assert.equal(await page.locator('#armory').evaluate(el => !!(document.querySelector('#programs').compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
    await enter(page);
    checks.push('viewport-triggered one-shot cloth reveal', 'section order preserved');
    const tabs = page.getByRole('tablist', { name: 'Equipment collection' }).getByRole('tab');
    assert.equal(await tabs.count(), 3);
    const sources = [];
    for (const [index, id] of ['power', 'endurance', 'precision'].entries()) {
      await tabs.nth(index).click();
      await page.locator('.ag-equipment').evaluate(img => img.decode());
      await page.waitForTimeout(750);
      assert.equal(await page.locator('#armory').getAttribute('data-armory-stage'), id);
      assert.equal(await tabs.nth(index).getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('[role=tabpanel]').getAttribute('aria-labelledby'), `armory-tab-${id}`);
      sources.push(await page.locator('.ag-equipment').getAttribute('src'));
      await page.locator('#armory').screenshot({ path: `${output}/desktop-${id}.png` });
    }
    assert.equal(new Set(sources).size, 3);
    checks.push('all three equipment tabs and decoded images');
    await tabs.nth(2).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await tabs.nth(0).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await tabs.nth(2).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await tabs.nth(0).getAttribute('aria-selected'), 'true');
    assert.ok(await tabs.nth(0).evaluate(el => el === document.activeElement));
    checks.push('arrow-key wrap, Home, End and focus');
    await page.locator('.ag-cta').click();
    await page.waitForTimeout(1600);
    assert.ok(await page.locator('#programs').evaluate(el => Math.abs(el.getBoundingClientRect().top - 80) < 30), 'CTA scrolls to Programs');
    checks.push('Programs CTA');
    await enter(page);
    assert.equal(await page.locator('.armory-peel').getAttribute('data-peel-started'), 'true');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.close();
    for (const width of [390, 768, 1920]) {
      const responsive = await open({ width, height: width === 390 ? 844 : 1080 });
      await enter(responsive);
      await responsive.getByRole('tab', { name: /02 Endurance/ }).click();
      await responsive.locator('.ag-equipment').evaluate(img => img.decode());
      assert.equal(await responsive.locator('#armory').getAttribute('data-armory-stage'), 'endurance');
      assert.equal(await responsive.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width} no overflow`);
      const layout = await responsive.locator('.ag-content').evaluate(el => ({ inner: el.scrollHeight, outer: el.clientHeight }));
      assert.ok(layout.inner <= layout.outer + 2, `${width} content fits gallery: ${JSON.stringify(layout)}`);
      await responsive.waitForTimeout(750);
      await responsive.locator('#armory').screenshot({ path: `${output}/responsive-${width}.png` });
      await responsive.close();
    }
    checks.push('390, 768, 1920 responsive layouts and touch selection');
    for (const config of [{ reduce: true }, { noGL: true }, { theme: 'dark' }]) {
      const fallback = await open(config);
      await enter(fallback);
      if (config.reduce || config.noGL) {
        assert.equal(await fallback.locator('.cpr-sheet').getAttribute('data-gone'), 'true');
        assert.equal(await fallback.locator('.cpr-sheet').evaluate(el => +getComputedStyle(el).opacity), 0);
      }
      await fallback.getByRole('tab', { name: /03 Precision/ }).click();
      assert.equal(await fallback.locator('#armory').getAttribute('data-armory-stage'), 'precision');
      await fallback.locator('#armory').screenshot({ path: `${output}/${config.reduce ? 'reduced-motion' : config.noGL ? 'webgl-fallback' : 'dark-theme'}.png` });
      await fallback.close();
    }
    checks.push('reduced-motion uncover', 'WebGL2 unavailable uncover', 'dark theme legibility');
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    fs.writeFileSync(`${output}/result.json`, JSON.stringify({ passed: true, checks, errors, failures }, null, 2));
    console.log(`VERDICT: PASS — ${checks.length} Armory checks`);
  } catch (error) {
    console.error('Runtime diagnostics:', JSON.stringify({ errors, failures }));
    for (const page of browser.contexts().flatMap(context => context.pages())) {
      console.error('Page state:', await page.evaluate(() => ({ url: location.href, armory: !!document.querySelector('#armory'), text: document.body.innerText.slice(0, 1600) })).catch(() => null));
      await page.screenshot({ path: `${output}/failure.png`, timeout: 10000 }).catch(() => {});
    }
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error('VERDICT: FAIL —', error); process.exitCode = 1; });
