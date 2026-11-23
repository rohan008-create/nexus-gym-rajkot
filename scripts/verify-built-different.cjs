const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const output = process.env.BUILT_DIFFERENT_OUTPUT || 'artifacts/built-different';
const url = process.env.BUILT_DIFFERENT_URL || 'http://localhost:3000/hero';
const pillars = [
  ['Strength', 'Make the next rep count.', 'program-strength.webp'],
  ['Endurance', 'Go a little further.', 'program-cardio.webp'],
  ['Confidence', 'Train with confidence.', 'program-personal.webp'],
];
fs.mkdirSync(output, { recursive: true });

async function check(page, theme, width) {
  const root = page.locator('.built-different');
  const toggle = page.getByRole('switch', { name: 'Dark mode' });
  if ((await toggle.getAttribute('aria-checked') === 'true') !== (theme === 'dark')) await toggle.click();
  await root.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));

  const layout = await root.evaluate(element => {
    const title = element.querySelector('h2').getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    return {
      fits: title.left >= 0 && title.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth,
      fillsScreen: bounds.height >= innerHeight - 1,
    };
  });
  assert.ok(layout.fits && layout.fillsScreen, JSON.stringify(layout));

  for (const [name, headline, file] of [...pillars.slice(1), pillars[0]]) {
    const button = root.getByRole('button', { name: 'Explore ' + name });
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    assert.equal(await root.getByRole('heading', { level: 3 }).textContent(), headline);
    const photo = root.locator('.bd-room img[data-current=true]');
    assert.ok((await photo.getAttribute('src')).endsWith(file));
    assert.ok(await photo.evaluate(async element => { await element.decode(); return element.naturalWidth > 0; }));
  }
  if ([390, 1440].includes(width)) {
    await root.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.screenshot({ path: path.join(output, width + '-' + theme + '.png') });
    await root.getByRole('button', { name: 'Book a trial' }).click();
    await page.locator('#trial-enquiry-form').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await page.locator('#trial-enquiry-form').waitFor({ state: 'hidden' });
  }
  assert.equal(await root.locator('canvas').count(), 0);
  assert.equal(await root.locator('.bd-room img[data-current=true]').evaluate(element => getComputedStyle(element).transitionProperty), 'none');
  console.log(width + ' ' + theme + ': layout, photo switching, and reduced motion PASS');
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844], [320, 640]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width < 500, isMobile: width < 500 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      for (const theme of ['dark', 'light']) await check(page, theme, width);
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('VERDICT: PASS');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error('VERDICT: FAIL', error); process.exitCode = 1; });
