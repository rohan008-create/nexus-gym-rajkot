const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sharp = require('sharp');
const base = process.env.FOOTER_TEST_URL || 'http://127.0.0.1:3000';
const output = 'artifacts/footer-redesign';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const errors = [], checks = [];
  const open = async (width, theme, reduce = false, route = '/footer-preview') => {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width <= 600, hasTouch: width <= 600, reducedMotion: reduce ? 'reduce' : 'no-preference' });
    page.on('pageerror', error => errors.push(error.stack));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.addInitScript(theme => localStorage.setItem('nexus-theme', theme), theme);
    await page.goto(`${base}${route}`, { timeout: 90000 });
    await page.locator('#footer').waitFor({ timeout: 90000 });
    await page.locator('#footer').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY));
    await page.waitForFunction(() => document.querySelector('#footer')?.dataset.revealed === 'true');
    await page.waitForTimeout(reduce ? 100 : 900);
    return page;
  };
  try {
    const { data, info } = await sharp('public/assets/nexus-logo-light.webp').raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 4);
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
    assert.ok(transparent / (info.width * info.height) > .2);
    assert.equal(data[3], 0, 'logo corner has no backing panel');
    checks.push('genuinely transparent light-mode logo');
    for (const config of [{ width: 1440, theme: 'light' }, { width: 1440, theme: 'dark' }, { width: 390, theme: 'light' }, { width: 320, theme: 'light' }, { width: 768, theme: 'light' }, { width: 390, theme: 'dark', reduce: true }]) {
      const page = await open(config.width, config.theme, config.reduce || false);
      const footer = page.locator('#footer');
      const logo = footer.locator(config.theme === 'light' ? '.nf-logo-light' : '.nf-logo-dark');
      assert.ok(await logo.isVisible());
      assert.ok(await logo.evaluate(async image => { await image.decode(); return image.naturalWidth > 0; }));
      const style = await logo.evaluate(el => { const s = getComputedStyle(el); return { background: s.backgroundColor, padding: s.padding, radius: s.borderRadius }; });
      assert.deepEqual(style, { background: 'rgba(0, 0, 0, 0)', padding: '0px', radius: '0px' });
      const background = await footer.evaluate(el => getComputedStyle(el).backgroundColor);
      assert.equal(background, config.theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(16, 17, 19)');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${config.width}px no page overflow`);
      assert.equal(await footer.evaluate(el => el.scrollWidth <= el.clientWidth), true, `${config.width}px no footer overflow`);
      assert.equal(await footer.locator('.nf-nav a').count(), 7);
      for (const href of ['/hero#about', '/hero#programs', '/hero#trainers', '/hero#products', '/hero#membership', '/hero#booking', '/hero#location']) assert.equal(await footer.locator(`.nf-nav a[href="${href}"]`).count(), 1);
      assert.equal(await footer.locator('.nf-visit').getAttribute('href'), '/hero#booking');
      assert.equal(await footer.locator('.nf-phone').getAttribute('href'), 'tel:+919558752573');
      const directions = new URL(await footer.locator('.nf-directions').getAttribute('href'));
      assert.equal(directions.hostname, 'www.google.com');
      assert.ok(directions.searchParams.get('destination').includes('NEXUS FITNESS CLUB'));
      assert.ok((await footer.locator('address').innerText()).includes('Avadh Complex'));
      assert.equal(await footer.locator('canvas').count(), 0);
      await footer.locator('.nf-visit').focus();
      assert.notEqual(await footer.locator('.nf-visit').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
      if (config.reduce) assert.equal(await footer.locator('.nf-invite').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await footer.screenshot({ path: `${output}/${config.theme}-${config.width}${config.reduce ? '-reduced' : ''}.png` });
      await page.close();
    }
    checks.push('light and dark logos switch without a background badge', '1440px light and dark layouts', '320px and 390px mobile layouts', '768px tablet layout', 'booking and seven section links', 'real configured phone and directions', 'keyboard focus and reduced motion', 'no horizontal overflow or footer WebGL');
    const main = await open(1440, 'light', false, '/hero');
    assert.equal(await main.locator('.nf-visit').getAttribute('href'), '#booking');
    await main.locator('.nf-visit').click();
    await main.waitForTimeout(1000);
    assert.ok(await main.locator('#booking').evaluate(el => Math.abs(el.getBoundingClientRect().top) < 110));
    await main.locator('#footer').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY));
    await main.getByRole('link', { name: 'Back to top', exact: true }).click();
    await main.waitForTimeout(1000);
    assert.ok(await main.evaluate(() => scrollY < 50));
    checks.push('main-site booking CTA and back-to-top navigation');
    await main.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${output}/result.json`, JSON.stringify({ passed: true, checks, errors }, null, 2));
    console.log(`Passed ${checks.length} footer checks.\nVERDICT: PASS`);
  } catch (error) {
    console.error('Runtime errors:', errors);
    for (const page of browser.contexts().flatMap(context => context.pages())) await page.screenshot({ path: `${output}/failure.png`, timeout: 10000 }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error('VERDICT: FAIL --', error); process.exitCode = 1; });
