const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const output = 'artifacts/membership-books';
  fs.mkdirSync(output, { recursive: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.MEMBERSHIP_TEST_URL || 'http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const section = page.locator('#membership');
    await section.waitFor({ timeout: 90000 });
    await section.scrollIntoViewIfNeeded();
    assert.equal(await section.locator('article').count(), 3);
    assert.equal(await section.locator('.receipt-printer, .membership-auto-printer').count(), 0);
    const basic = page.getByRole('button', { name: /^Basic plan details/ });
    await basic.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('.curl-book-stage').getAttribute('aria-pressed') === 'true');
    await page.waitForTimeout(350);
    await section.screenshot({ path: `${output}/dark-open.png` });
    await page.keyboard.press('ArrowRight');
    assert.equal(await basic.getAttribute('aria-pressed'), 'false');
    for (const name of ['Basic', 'Pro', 'Elite']) {
      await page.getByRole('button', { name: `Enquire about ${name}`, exact: true }).click();
      const dialog = page.locator('[role=dialog]');
      await dialog.waitFor();
      assert.ok((await dialog.textContent()).includes(`Selected membership: ${name}`));
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
    }
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; document.documentElement.classList.remove('dark'); });
    await section.scrollIntoViewIfNeeded();
    assert.equal(await section.locator('.curl-book-cover h3').first().evaluate(node => getComputedStyle(node).color), 'rgb(246, 240, 229)');
    await section.screenshot({ path: `${output}/light.png` });
    for (const width of [390, 320, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await basic.scrollIntoViewIfNeeded();
      await basic.tap();
      assert.equal(await basic.getAttribute('aria-pressed'), 'true');
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px overflow`);
      await page.screenshot({ path: `${output}/${width}-open.png` });
      await basic.tap();
      assert.equal(await basic.getAttribute('aria-pressed'), 'false');
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    await basic.scrollIntoViewIfNeeded();
    const bounds = await basic.boundingBox();
    const x = bounds.x + bounds.width * .72, y = bounds.y + bounds.height * .9;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x - 250, y - 35, { steps: 12 }); await page.mouse.up();
    assert.equal(await basic.getAttribute('aria-pressed'), 'true', 'drag opens cover');
    assert.deepEqual(errors, []);
    console.log('3 memberships; 3 plan enquiries; keyboard, tap and drag; light/dark contrast; 320/390/768px overflow checks passed.');
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
