const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = 'artifacts/themes';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11'] });
  const errors = [], checks = [];
  try {
    for (const mobile of [false, true]) {
      const label = mobile ? 'mobile' : 'desktop';
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, reducedMotion: 'reduce', isMobile: mobile, hasTouch: mobile });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.locator('.gym-tour-static-copy').waitFor({ timeout: 60000 });
      for (const theme of ['light', 'dark']) {
        await page.getByRole('button', { name: `${theme === 'light' ? 'Light' : 'Dark'} mode`, exact: true }).click();
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
        assert.equal(await page.evaluate(() => localStorage.getItem('nexus-theme')), theme);
        assert.equal(await page.locator('html').evaluate(e => e.classList.contains('dark')), theme === 'dark');
        for (const [name, selector] of [['about', '#about'], ['programs', '#programs'], ['armory', '.armory-section'], ['advantage', '.advantage-section'], ['trainers', '#trainers'], ['booking', '.booking-section'], ['voices', '.nexus-voices'], ['membership', '#membership'], ['footer', '.nexus-simple-footer']]) {
          const section = page.locator(selector);
          await section.scrollIntoViewIfNeeded();
          await page.waitForTimeout(150);
          const colors = await section.evaluate(e => ({ background: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color }));
          if (theme === 'light') {
            const channels = colors.background.match(/[\d.]+/g).map(Number);
            assert.ok(channels.slice(0, 3).every(n => n > 220), `${name} light surface: ${colors.background}`);
            const contrast = await section.evaluate(e => {
              const rgb = c => c.match(/[\d.]+/g).slice(0, 3).map(Number);
              const luminance = c => rgb(c).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
              const bg = luminance(getComputedStyle(e).backgroundColor);
              return ['h2', 'p'].map(selector => {
                const node = e.querySelector(selector);
                if (!node) return 21;
                const fg = luminance(getComputedStyle(node).color);
                return (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05);
              });
            });
            assert.ok(contrast.every(n => n >= 4.5), `${name} heading/body contrast: ${contrast}`);
          }
          await page.screenshot({ path: `${out}/${label}-${theme}-${name}.png` });
        }
        await page.locator('#home [data-tour-trial]').click();
        await page.locator('#trial-enquiry-form').waitFor({ state: 'visible' });
        const input = page.locator('#trial-enquiry-form input').first();
        assert.ok(await input.isVisible());
        await page.screenshot({ path: `${out}/${label}-${theme}-dialog.png` });
        await page.keyboard.press('Escape');
        await page.locator('#trial-enquiry-form').waitFor({ state: 'hidden' });
        if (theme === 'light') {
          await page.locator('.booking-experience').nth(1).click();
          const value = await page.locator('.booking-experiences input:checked').inputValue();
          await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
          assert.equal(await page.locator('.booking-experiences input:checked').inputValue(), value, 'theme change preserves booking choices');
          await page.getByRole('button', { name: 'Light mode', exact: true }).click();
        }
        await page.reload({ waitUntil: 'domcontentloaded' });
        assert.equal(await page.locator('html').getAttribute('data-theme'), theme, 'saved theme restored on navigation');
        await page.waitForFunction(t => document.querySelector(`.theme-switch button[aria-label="${t === 'light' ? 'Light' : 'Dark'} mode"]`)?.getAttribute('aria-pressed') === 'true', theme);
        assert.equal(await page.getByRole('button', { name: `${theme === 'light' ? 'Light' : 'Dark'} mode`, exact: true }).getAttribute('aria-pressed'), 'true');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
        checks.push(`${label} ${theme}: section surfaces, controls, dialog, persistence, responsive layout`);
        console.log('PASS:', checks.at(-1));
      }
      await context.close();
    }
    const live = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    live.on('pageerror', e => errors.push(e.message));
    await live.addInitScript(() => localStorage.setItem('nexus-theme', 'light'));
    await live.goto('http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await live.waitForFunction(() => document.querySelector('#home canvas')?.dataset.streetSource === '3d', null, { timeout: 90000 });
    await live.locator('#home canvas').evaluate(e => { e.dataset.themeTest = 'preserved'; });
    await live.screenshot({ path: `${out}/live-3d-light.png` });
    await live.getByRole('button', { name: 'Dark mode', exact: true }).click();
    assert.equal(await live.locator('#home canvas').getAttribute('data-theme-test'), 'preserved', 'switching themes does not remount the tour');
    await live.screenshot({ path: `${out}/live-3d-dark.png` });
    await live.close();
    checks.push('live 3D tour remains mounted across themes');
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${out}/checks.json`, JSON.stringify({ checks, errors }, null, 2));
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(e => { console.error('VERDICT: FAIL --', e); process.exitCode = 1; });
