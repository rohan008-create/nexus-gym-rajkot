const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = 'artifacts/gym-tour/3d-street';
fs.mkdirSync(out, { recursive: true });
const bytes = fs.readFileSync('public/models/nexus-gym/street.glb');
const json = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
assert.ok(json.nodes.filter(n => n.name?.startsWith('Wheel_')).length >= 5, 'independent three-wheel auto and two-wheel scooter rigs');
assert.ok(json.materials.some(m => m.alphaMode === 'BLEND'), 'transparent windscreen');
assert.ok(json.materials.some(m => m.pbrMetallicRoughness?.metallicFactor > .8), 'metal trim material');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-angle=d3d11'] });
  const errors = [], report = [];
  try {
    for (const mobile of [false, true]) {
      const label = mobile ? 'mobile' : 'desktop';
      const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1917, height: 900 }, isMobile: mobile, hasTouch: mobile });
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram/.test(m.text())) errors.push(m.text()); });
      await page.goto('http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForFunction(() => document.querySelector('#home canvas')?.dataset.streetSource === '3d' && document.querySelector('#home canvas')?.dataset.exteriorSource === 'detailed', null, { timeout: 90000 });
      assert.equal(await page.locator('#home canvas').count(), 1);
      assert.equal(await page.locator('.gym-tour-arrival').count(), 0, 'interactive hero has no image overlay');
      const canvas = page.locator('#home canvas');
      const a = await canvas.evaluate(e => ({ ...e.dataset }));
      await page.waitForTimeout(500);
      const b = await canvas.evaluate(e => ({ ...e.dataset }));
      assert.notEqual(a.trafficPosition, b.trafficPosition, 'traffic moves without scrolling');
      assert.notEqual(a.trafficWheelRotation, b.trafficWheelRotation, 'wheels roll');
      assert.equal(await page.locator('#home').getAttribute('data-tour-progress'), '0.0000');
      assert.ok(await page.locator('.gym-tour-stage').evaluate(e => Math.abs(e.getBoundingClientRect().height - innerHeight) < 2), 'stage fills the visible viewport');
      await page.screenshot({ path: `${out}/${label}-world.png` });
      if (mobile) {
        await page.setViewportSize({ width: 390, height: 740 });
        await page.waitForTimeout(500);
        assert.ok(await canvas.evaluate(e => Math.abs(e.getBoundingClientRect().bottom - innerHeight) < 2), 'canvas fills viewport after mobile browser bar resize');
        await page.screenshot({ path: `${out}/mobile-short-viewport.png` });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(500);
      }
      await page.getByRole('button', { name: 'FOLLOW RYAN INSIDE' }).click();
      await page.waitForFunction(() => Number(document.getElementById('home').dataset.tourProgress) >= .119);
      await page.screenshot({ path: `${out}/${label}-approach.png` });
      await page.getByRole('button', { name: 'Skip tour' }).click();
      await page.waitForFunction(() => document.getElementById('home').dataset.tourActive === 'false');
      await page.waitForTimeout(200);
      const stopped = await canvas.getAttribute('data-traffic-time');
      await page.waitForTimeout(350);
      assert.equal(await canvas.getAttribute('data-traffic-time'), stopped, 'offscreen traffic pauses');
      report.push({ label, oneCanvas: true, noPhotograph: true, movingTraffic: true, rollingWheels: true, offscreenPauses: true });
      console.log(`PASS: ${label}: 3D opening, moving traffic, rolling wheels, tour entry and pause`);
      await page.close();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${out}/checks.json`, JSON.stringify({ report, errors, modelBytes: bytes.length }, null, 2));
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(e => { console.error('VERDICT: FAIL --', e); process.exitCode = 1; });
