const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sharp = require('sharp');
const base = process.env.ARMORY_TEST_URL || 'http://127.0.0.1:3000';
const output = 'artifacts/advantage-redesign';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const errors = [], checks = [];
  const open = async (width = 1440, theme = 'light', reduce = false) => {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 600, hasTouch: width < 600, reducedMotion: reduce ? 'reduce' : 'no-preference' });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.addInitScript(theme => localStorage.setItem('nexus-theme', theme), theme);
    await page.goto(`${base}/hero`, { timeout: 90000 });
    await page.locator('#advantage').waitFor({ timeout: 90000 });
    await page.locator('#advantage').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY));
    await page.waitForFunction(() => document.querySelector('#advantage')?.dataset.visible === 'true');
    await page.waitForTimeout(1000);
    return page;
  };
  try {
    for (const name of ['athlete', 'coaching', 'community']) {
      const { data, info } = await sharp('public/assets/advantage/' + name + '-transparent.webp').raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.channels, 4);
      let transparent = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
      assert.ok(transparent / (info.width * info.height) > .1, name + ' genuine alpha transparency');
    }
    checks.push('three genuine transparent athlete assets');
    const page = await open();
    assert.equal(await page.locator('#advantage svg, .ns-heading-star, .ns-feature-icon').count(), 0);
    checks.push('star and decorative icons removed');
    assert.equal(await page.locator('#advantage').evaluate(el => el.previousElementSibling.id), 'armory');
    assert.equal(await page.locator('#trainers').evaluate(el => el.previousElementSibling.id), 'advantage');
    const buttons = page.locator('.ns-feature-button');
    assert.equal(await buttons.count(), 4);
    assert.equal(await buttons.nth(0).getAttribute('aria-expanded'), 'true');
    await page.locator('.ns-photo').evaluate(img => img.decode());
    await page.locator('#advantage').screenshot({ path: `${output}/desktop-light.png` });
    checks.push('section order and four features');
    await buttons.nth(1).hover();
    assert.equal(await page.locator('#advantage').getAttribute('data-active-feature'), 'environment');
    await page.locator('.ns-photo').evaluate(img => img.decode());
    assert.ok((await page.locator('.ns-photo').getAttribute('src')).includes('coaching-transparent'));
    await page.mouse.move(5, 5);
    assert.equal(await buttons.nth(0).getAttribute('aria-expanded'), 'true');
    checks.push('hover changes photo and restores selected feature');
    await buttons.nth(2).click();
    await page.mouse.move(5, 5);
    assert.equal(await buttons.nth(2).getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.ns-feature-panel[aria-hidden=false]').count(), 1);
    await page.waitForTimeout(350);
    const activePanel = page.locator('.ns-feature-panel[aria-hidden=false]');
    assert.equal(await activePanel.evaluate(el => document.getElementById(el.getAttribute('aria-labelledby'))?.getAttribute('aria-controls') === el.id), true);
    checks.push('persistent click selection and accessible panel links');
    await buttons.nth(3).focus();
    await page.keyboard.press('Enter');
    assert.equal(await buttons.nth(3).getAttribute('aria-expanded'), 'true');
    await page.locator('.ns-photo').evaluate(img => img.decode());
    await page.waitForTimeout(550);
    await page.locator('#advantage').screenshot({ path: `${output}/desktop-community.png` });
    checks.push('keyboard activation');
    await page.locator('#armory').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY));
    await page.getByRole('tab', { name: /02 Endurance/ }).click();
    assert.equal(await page.locator('#armory').getAttribute('data-armory-stage'), 'endurance');
    checks.push('adjacent equipment gallery selection preserved');
    await page.close();
    for (const config of [{ width: 390 }, { width: 768 }, { width: 1920, theme: 'dark' }, { width: 390, reduce: true }]) {
      const p = await open(config.width, config.theme || 'light', config.reduce || false);
      await p.locator('.ns-photo').evaluate(img => img.decode());
      assert.ok(await p.locator('.ns-photo').evaluate(img => img.currentSrc.includes('-transparent.webp')));
      const button = p.locator('.ns-feature-button').nth(3);
      if (config.width === 390) await button.tap(); else await button.click();
      assert.equal(await button.getAttribute('aria-expanded'), 'true');
      await p.locator('.ns-photo').evaluate(img => img.decode());
      await p.waitForTimeout(550);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no ${config.width}px document overflow`);
      assert.equal(await p.locator('#advantage').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `no ${config.width}px section overflow`);
      if (config.reduce) assert.equal(await p.locator('.ns-photo-picture').evaluate(el => getComputedStyle(el).animationName), 'none');
      await p.locator('#advantage').screenshot({ path: `${output}/${config.reduce ? 'reduced-motion' : `responsive-${config.width}`}.png` });
      await p.close();
    }
    checks.push('390px touch and transparent image containment', '768px tablet layout', '1920px dark theme compatibility', 'reduced motion', 'no horizontal overflow');
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${output}/result.json`, JSON.stringify({ passed: true, checks, errors }, null, 2));
    console.log(`Passed ${checks.length} Advantage browser checks.\nVERDICT: PASS`);
  } catch (error) {
    console.error('Runtime errors:', errors);
    for (const page of browser.contexts().flatMap(context => context.pages())) await page.screenshot({ path: `${output}/failure.png`, timeout: 10000 }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error('VERDICT: FAIL --', error); process.exitCode = 1; });
