const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

const base = process.env.FOOTER_TEST_URL || 'http://127.0.0.1:3000';
const screenshotDir = process.env.FOOTER_SCREENSHOT_DIR;
const sections = ['about', 'programs', 'trainers', 'products', 'membership', 'location', 'faq', 'booking'];

async function verifyLayout(browser, { width, theme, reduced = false }) {
  const page = await browser.newPage({
    viewport: { width, height: 900 },
    hasTouch: width <= 600,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  try {
    await page.addInitScript(theme => localStorage.setItem('nexus-theme', theme), theme);
    await page.goto(base + '/footer-preview', { waitUntil: 'domcontentloaded' });
    const footer = page.locator('#footer');
    await footer.scrollIntoViewIfNeeded();
    await footer.locator('.fgf-art[data-ready]').waitFor();
    assert.equal(await footer.evaluate(el => getComputedStyle(el).backgroundColor),
      theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
    assert.equal(await footer.locator('.fgf-eye').count(), 2);
    assert.equal(await footer.locator('[data-testid="nexus-wordmark"], .nf-logo').count(), 0);
    assert.ok(await footer.locator('.fgf-img').evaluate(async image => {
      await image.decode();
      return image.naturalWidth > 0 && new URL(image.currentSrc).origin === location.origin;
    }));
    assert.match(await footer.locator('.fgf-img').evaluate(image => getComputedStyle(image).filter), /#nexus-footer-art/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
    assert.ok(await footer.evaluate(el => {
      const frame = el.getBoundingClientRect();
      return Array.from(el.querySelectorAll('a')).every(link => {
        const bounds = link.getBoundingClientRect();
        return bounds.left >= frame.left && bounds.right <= frame.right;
      });
    }));
    for (const section of sections) {
      assert.equal(await footer.locator('nav a[href="/hero#' + section + '"]').count(), 1);
    }
    assert.equal(await footer.getByRole('link', { name: '+91 95587 52573' }).getAttribute('href'), 'tel:+919558752573');
    const directions = new URL(await footer.getByRole('link', { name: 'Get directions' }).getAttribute('href'));
    assert.equal(directions.hostname, 'www.google.com');
    assert.match(directions.searchParams.get('destination'), /Avadh Complex/);

    const wordmark = footer.getByRole('link', { name: 'Go Beyond, back to top' });
    assert.equal(await wordmark.innerText(), 'Go Beyond');
    assert.equal(await wordmark.getAttribute('href'), '/hero#home');
    assert.equal(await wordmark.evaluate(el => getComputedStyle(el).color),
      theme === 'light' ? 'rgb(167, 17, 29)' : 'rgb(255, 102, 118)');
    await wordmark.focus();
    assert.notEqual(await wordmark.evaluate(el => getComputedStyle(el).outlineStyle), 'none');

    if (reduced) {
      assert.equal(await footer.locator('.fgf-fur-stroke').isVisible(), false);
      assert.equal(await wordmark.locator('.fgf-word').evaluate(el => getComputedStyle(el).filter), 'none');
      assert.equal(await footer.locator('.fgf-eye').first().evaluate(el => el.style.getPropertyValue('--fgf-lid')), '');
    } else if (width === 1440) {
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.fgf-word')).filter !== 'none');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.fgf-word')).filter === 'none');
      await wordmark.hover();
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.fgf-word')).filter !== 'none');
      await page.mouse.move(width - 20, 360);
      await page.waitForFunction(() => parseFloat(document.querySelector('.fgf-pupil').style.transform.slice(10)) > 10);
      await page.mouse.move(20, 360);
      await page.waitForFunction(() => parseFloat(document.querySelector('.fgf-pupil').style.transform.slice(10)) < -10);
      await page.waitForFunction(() => parseFloat(document.querySelector('.fgf-eye').style.getPropertyValue('--fgf-lid')) > 95, null, { timeout: 9000 });
    }

    if (!reduced && (width === 1440 || width === 320)) {
      const art = await footer.locator('.fgf-art').boundingBox();
      const x = Math.round(width / 2);
      const y = Math.round(art.y + art.height * .36);
      const stroke = footer.locator('.fgf-fur-stroke');

      if (width === 320) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 45, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.move(x - 54, y);
        await page.mouse.move(x, y, { steps: 6 });
        await page.waitForFunction(() => {
          const art = document.querySelector('.fgf-art');
          return parseFloat(art.style.getPropertyValue('--fgf-nudge-x')) > .3;
        });
      }

      await page.waitForFunction(expectedX => {
        const canvas = document.querySelector('.fgf-fur-stroke');
        const rect = canvas.getBoundingClientRect();
        return !canvas.hidden && Math.abs(rect.left + rect.width / 2 - expectedX) < 10;
      }, x);
      assert.ok(await stroke.evaluate(canvas => {
        const pixel = canvas.getContext('2d').getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
        return pixel[0] > pixel[1] && pixel[3] > 150;
      }));
      if (width === 1440) await wordmark.hover();
      await stroke.waitFor({ state: 'hidden' });
      if (width === 1440) {
        await page.waitForFunction(() => {
          const art = document.querySelector('.fgf-art');
          return Math.abs(parseFloat(art.style.getPropertyValue('--fgf-nudge-x'))) < .1;
        });
      }
    }

    if (screenshotDir) {
      await wordmark.evaluate(el => el.blur());
      await page.waitForFunction(() => getComputedStyle(document.querySelector('.fgf-word')).filter === 'none');
      await footer.screenshot({ path: path.join(screenshotDir, theme + '-' + width + '.png') });
    }
    assert.deepEqual(errors, []);
    console.log('Passed footer preview at ' + width + 'px, ' + theme + (reduced ? ', reduced motion' : ''));
  } finally {
    await page.close();
  }
}

async function verifySite(browser, route) {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  try {
    await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
    const footer = page.locator('#footer');
    for (const section of ['home', ...sections]) {
      assert.equal(await footer.locator('a[href="#' + section + '"]').count(), 1);
      assert.equal(await page.locator('#' + section).count(), 1);
    }
    if (route === '/hero') {
      await footer.getByRole('link', { name: 'Book a visit' }).click({ timeout: 30000 });
      await page.waitForFunction(() => location.hash === '#booking' && Math.abs(document.querySelector('#booking').getBoundingClientRect().top) < 110);
      await footer.getByRole('link', { name: 'Go Beyond, back to top' }).click();
      await page.waitForFunction(() => location.hash === '#home' && scrollY < 50);
    }
    console.log('Passed footer navigation on ' + route);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  try {
    for (const config of [
      { width: 1440, theme: 'dark' },
      { width: 1024, theme: 'light' },
      { width: 768, theme: 'light' },
      { width: 390, theme: 'dark', reduced: true },
      { width: 320, theme: 'light' },
    ]) {
      await verifyLayout(browser, config);
    }
    for (const route of ['/', '/hero']) await verifySite(browser, route);
    console.log('VERDICT: PASS');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error('VERDICT: FAIL --', error);
  process.exitCode = 1;
});
