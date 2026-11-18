const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.ARMORY_TEST_URL || 'http://127.0.0.1:3001';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const errors = []; let whatsAppRequests = 0;
  const open = async mobile => {
    const p = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: !!mobile, hasTouch: !!mobile, timezoneId: 'Asia/Kolkata' });
    await p.clock.setSystemTime(new Date('2026-11-10T06:30:00Z'));
    p.on('pageerror', error => errors.push(error.message));
    p.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    p.on('request', r => { if (r.url().startsWith('https://wa.me/')) whatsAppRequests++; });
    await p.goto(`${base}/hero`);
    await p.waitForSelector('[data-rope-status=ready]', { timeout: 90000 });
    await p.locator('#booking').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY - 84));
    await p.waitForTimeout(1000); return p;
  };
  const step = async (p, number) => { await p.waitForSelector(`#booking[data-booking-step="${number}"]`); await p.waitForFunction(() => document.querySelector('.booking-step-content').getAttribute('aria-busy') === 'false'); };
  const next = async p => { await p.getByRole('button', { name: 'CONTINUE', exact: true }).click(); };
  try {
    fs.mkdirSync('qa', { recursive: true });
    const p = await open(false);
    assert.equal(await p.locator('#booking').evaluate(el => el.previousElementSibling.id), 'membership');
    await p.screenshot({ path: 'qa/booking-desktop.png' });
    for (const title of ['Trial session', 'Membership enquiry', 'Gym visit']) { await p.locator('.booking-experience').filter({ hasText: title }).click(); assert.ok(await p.getByRole('radio', { name: new RegExp(title) }).isChecked()); }
    await p.locator('.booking-experience').filter({ hasText: 'Trial session' }).click(); await next(p); await step(p, 2);
    assert.ok(await p.locator('[data-day="2026-11-09"]').isDisabled());
    assert.ok(await p.getByRole('button', { name: 'Previous month' }).isDisabled());
    await next(p); assert.ok(await p.locator('.booking-error-summary').isVisible());
    await p.locator('[data-day="2026-11-10"]').focus(); await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter');
    assert.ok((await p.locator('[data-day="2026-11-11"]').getAttribute('class')).includes('is-selected'));
    await p.getByRole('button', { name: 'Next month' }).click(); await p.getByRole('button', { name: 'Next month' }).click();
    assert.equal(await p.locator('#booking-calendar-month').innerText(), 'January 2027');
    await p.getByRole('button', { name: 'Previous month' }).click();
    await p.locator('[data-day="2026-12-31"]').focus(); await p.keyboard.press('ArrowRight');
    await p.waitForFunction(() => document.activeElement.getAttribute('data-day') === '2027-01-01'); await p.keyboard.press('Enter');
    await p.locator('.booking-times label').filter({ hasText: '07:00 AM' }).click(); await next(p); await step(p, 3);
    await next(p); assert.ok(await p.locator('#booking-name-error').isVisible()); assert.ok(await p.locator('#booking-mobile-error').isVisible());
    await p.getByLabel('Full name').fill('12345'); await p.getByLabel('Mobile number', { exact: false }).fill('12'); await next(p);
    assert.equal(await p.getByLabel('Full name').getAttribute('aria-invalid'), 'true');
    await p.getByLabel('Full name').fill('Ana María O’Neil'); await p.getByLabel('Mobile number', { exact: false }).fill('+91 98765 43210');
    await p.locator('.booking-goals label').filter({ hasText: 'Muscle Building' }).click(); await next(p); await step(p, 4);
    const review = await p.locator('.booking-review').innerText(); assert.ok(review.includes('Ana María O’Neil')); assert.ok(review.includes('1 January 2027')); assert.ok(review.includes('07:00 AM')); assert.ok(review.includes('Muscle Building'));
    await p.getByRole('button', { name: 'Edit experience', exact: true }).click(); await step(p, 1); assert.ok(await p.getByRole('radio', { name: /Trial session/ }).isChecked());
    await p.locator('.booking-experience').filter({ hasText: 'Membership enquiry' }).click(); await next(p); await step(p, 2);
    assert.ok((await p.locator('[data-day="2027-01-01"]').getAttribute('class')).includes('is-selected')); assert.ok(await p.getByRole('radio', { name: '07:00 AM', exact: true }).isChecked());
    await next(p); await step(p, 3); assert.equal(await p.getByLabel('Full name').inputValue(), 'Ana María O’Neil');
    await next(p); await step(p, 4);
    await p.locator('.booking-message-preview summary').click();
    const message = await p.locator('.booking-message-preview pre').innerText(); assert.ok(message.includes('Experience: Membership enquiry')); assert.ok(message.includes('Fitness Goal: Muscle Building')); assert.ok(!message.includes('undefined'));
    const link = p.locator('.booking-whatsapp[href]');
    if (await link.count()) {
      const href = new URL(await link.getAttribute('href')); assert.equal(href.origin, 'https://wa.me'); assert.equal(href.searchParams.get('text'), message); assert.equal(await link.getAttribute('target'), '_blank');
    } else { assert.ok(await p.getByRole('button', { name: 'CONTINUE TO WHATSAPP', exact: true }).isDisabled()); assert.ok((await p.locator('.booking-configuration').innerText()).includes('NEXT_PUBLIC_NEXUS_WHATSAPP_NUMBER')); }
    assert.equal(whatsAppRequests, 0, 'changing steps never opens WhatsApp');
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.locator('.booking-panel').scrollIntoViewIfNeeded(); await p.screenshot({ path: 'qa/booking-review.png' });
    await p.close();
    const m = await open(true);
    await m.screenshot({ path: 'qa/booking-mobile.png' });
    await next(m); await step(m, 2); await m.locator('[data-day="2026-11-12"]').tap(); await m.locator('.booking-times label').filter({ hasText: '06:00 PM' }).tap();
    await m.screenshot({ path: 'qa/booking-calendar-mobile.png' }); await next(m); await step(m, 3);
    await m.getByLabel('Full name').fill('નિલ પટેલ'); await m.getByLabel('Mobile number', { exact: false }).fill('9876543210'); await next(m); await step(m, 4);
    assert.ok((await m.locator('.booking-review').innerText()).includes('Not specified'));
    await m.setViewportSize({ width: 320, height: 667 }); await m.waitForTimeout(400); assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await m.getByRole('button', { name: 'Edit date and time' }).tap(); await step(m, 2); await m.screenshot({ path: 'qa/booking-small-mobile.png' });
    await m.emulateMedia({ reducedMotion: 'reduce' }); await m.waitForTimeout(350); await m.getByRole('button', { name: 'BACK', exact: true }).tap(); await step(m, 1);
    assert.ok(await m.getByRole('radio', { name: /Gym visit/ }).isChecked());
    assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    fs.writeFileSync('qa/booking-result.json', JSON.stringify({ passed: true, checks: ['section order', 'all experiences', 'inline validation', 'past dates disabled', 'calendar keyboard', 'month/year rollover', 'date/time selection', 'Unicode name', 'phone validation', 'back/edit preservation', 'accurate review', 'message preview', 'safe missing configuration / encoded link', 'no automatic external action', 'touch', '320px layout', 'reduced motion', 'no errors'], errors }, null, 2));
    console.log('Booking browser checks passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
