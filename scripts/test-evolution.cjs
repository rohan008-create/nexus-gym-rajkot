const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sharp = require('sharp');
const base = process.env.ARMORY_TEST_URL || 'http://127.0.0.1:3001';
const manifest = JSON.parse(fs.readFileSync('public/animations/nexus-evolution/manifest.json', 'utf8'));
const source = p => p < .5 ? p : p < .78 ? .5 + (p - .5) / .28 * .41 : .91 + (p - .78) / .22 * .09;
(async () => {
  assert.equal(manifest.frameCount, manifest.source.frameCount);
  assert.equal(manifest.frameCount, 239);
  for (const variant of ['desktop', 'mobile']) {
    const dir = `public/animations/nexus-evolution/${variant}`;
    assert.equal(fs.readdirSync(dir).filter(name => name.endsWith('.webp')).length, manifest.frameCount);
    for (let i = 1; i <= manifest.frameCount; i++) assert.ok(fs.statSync(`${dir}/frame-${String(i).padStart(4, '0')}.webp`).size > 0);
    for (const i of [1, 75, 150, 239]) { const image = sharp(`${dir}/frame-${String(i).padStart(4, '0')}.webp`); const meta = await image.metadata(); assert.equal(meta.hasAlpha, true); assert.equal(meta.width, manifest[variant].width); assert.equal(meta.height, manifest[variant].height); const stats = await image.stats(); assert.ok(stats.channels[3].min === 0 && stats.channels[3].max === 255); }
    if (manifest.packs) for (let first = 0; first < manifest.frameCount; first += manifest.packs.framesPerPack) {
      const data = fs.readFileSync(`public/animations/nexus-evolution/${variant}-packs/pack-${String(first / manifest.packs.framesPerPack + 1).padStart(3, '0')}.bin`);
      assert.equal(data.readUInt32LE(0), first); const count = data.readUInt32LE(4); let offset = 8;
      for (let i = 0; i < count; i++) { const length = data.readUInt32LE(offset); offset += 4; assert.deepEqual(data.subarray(offset, offset + length), fs.readFileSync(`${dir}/frame-${String(first + i + 1).padStart(4, '0')}.webp`)); offset += length; }
      assert.equal(offset, data.length);
    }
  }
  const { unzipSync } = await import('three/examples/jsm/libs/fflate.module.js');
  assert.equal(Object.keys(unzipSync(fs.readFileSync('artifacts/nexus-human-evolution.zip'))).length, manifest.frameCount * 2 + 1);
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--enable-webgl', '--use-angle=d3d11'] });
  const errors = []; let inFlight = 0, peak = 0;
  const open = async mobile => {
    const p = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: !!mobile, hasTouch: !!mobile });
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    p.on('request', r => { if (r.resourceType() === 'fetch' && /nexus-evolution\/.*(?:frame-|pack-)/.test(r.url())) { inFlight++; peak = Math.max(peak, inFlight); } });
    const done = r => { if (r.resourceType() === 'fetch' && /nexus-evolution\/.*(?:frame-|pack-)/.test(r.url())) inFlight--; };
    p.on('requestfinished', done); p.on('requestfailed', done);
    // Fail this frame before the compressed prefetch can warm it.
    await p.route('**/nexus-evolution/desktop/frame-0110.webp', route => route.fulfill({ status: 200, contentType: 'image/webp', body: 'invalid-frame-for-fallback-test' }));
    const failedPack = String(Math.floor(109 / (manifest.packs?.framesPerPack || 4)) + 1).padStart(3, '0');
    await p.route(`**/nexus-evolution/desktop-packs/pack-${failedPack}.bin*`, route => route.fulfill({ status: 200, contentType: 'application/octet-stream', body: 'invalid-pack-for-fallback-test' }));
    await p.goto(`${base}/hero`);
    await p.waitForSelector('[data-rope-status=ready]', { timeout: 90000 });
    await p.locator('#human-evolution').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY));
    await p.waitForSelector('.evolution-is-enhanced[data-evolution-status=ready]', { timeout: 30000 });
    await p.waitForTimeout(700);
    return p;
  };
  const seek = async (p, progress, mobile = false, exact = true) => {
    const start = await p.locator('#human-evolution').evaluate(el => el.getBoundingClientRect().top + scrollY);
    await p.evaluate(y => scrollTo(0, y), start + p.viewportSize().height * (mobile ? 3.5 : 4) * progress);
    if (exact) await p.waitForFunction(expected => Math.abs(Number(document.querySelector('.evolution-canvas').dataset.frame) - expected) <= 1, Math.round(source(progress) * (manifest.frameCount - 1)) + 1, { timeout: 20000 });
    await p.waitForTimeout(600);
  };
  try {
    fs.mkdirSync('qa', { recursive: true });
    const p = await open(false);
    assert.equal(await p.locator('#human-evolution').evaluate(el => el.previousElementSibling.id), 'membership');
    assert.equal(await p.locator('#human-evolution video').count(), 0);
    assert.equal(await p.locator('.evolution-stage').evaluate(el => Math.round(el.getBoundingClientRect().height)), 1000);
    for (const [i, progress] of [.08, .34, .58, .94].entries()) {
      await seek(p, progress);
      assert.equal(await p.locator('#human-evolution').getAttribute('data-evolution-chapter'), ['beginning', 'anatomy', 'training', 'evolution'][i]);
      await p.screenshot({ path: `qa/evolution-chapter-${i + 1}.png` });
      assert.ok(Number(await p.locator('.evolution-canvas').getAttribute('data-cache-size')) <= 12);
    }
    const frame = await p.locator('.evolution-canvas').getAttribute('data-frame'); await p.waitForTimeout(700); assert.equal(await p.locator('.evolution-canvas').getAttribute('data-frame'), frame, 'stopping scroll freezes the sequence');
    await seek(p, .34); assert.equal(await p.locator('#human-evolution').getAttribute('data-evolution-chapter'), 'anatomy');
    assert.ok(await p.locator('.evolution-callout').count() >= 1, 'callouts follow decoded anatomy frames');
    await p.getByRole('button', { name: 'Go to Evolution chapter', exact: true }).click();
    await p.waitForFunction(() => document.querySelector('#human-evolution').dataset.evolutionChapter === 'evolution'); await p.waitForTimeout(700);
    await p.locator('#evolution-evolution').getByRole('button', { name: 'START YOUR JOURNEY', exact: true }).click();
    assert.ok(await p.locator('.trial-dialog').isVisible()); assert.equal(await p.locator('.trial-membership-plan').count(), 0); await p.getByRole('button', { name: 'Close trial enquiry' }).click();
    await p.route('**/nexus-evolution/desktop/frame-0110.webp', route => route.fulfill({ status: 200, contentType: 'image/webp', body: 'invalid-frame-for-fallback-test' }));
    await seek(p, 109 / 238, false, false); await p.waitForTimeout(800);
    const fallback = Number(await p.locator('.evolution-canvas').getAttribute('data-frame'));
    assert.ok(fallback > 0 && fallback !== 110, 'decode failure retains a nearby cached frame');
    assert.equal(await p.locator('#human-evolution').getAttribute('data-evolution-status'), 'ready');
    assert.ok(peak <= 3, `bounded request concurrency: ${peak}`);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.emulateMedia({ reducedMotion: 'reduce' }); await p.waitForTimeout(600);
    assert.equal(await p.locator('.evolution-is-enhanced').count(), 0);
    assert.equal(await p.locator('.evolution-chapter').evaluateAll(els => els.every(el => +getComputedStyle(el).opacity === 1 && getComputedStyle(el).visibility === 'visible')), true);
    await p.locator('.evolution-transcript summary').click(); assert.ok(await p.locator('.evolution-transcript ol').isVisible());
    await p.close();
    const m = await open(true);
    await seek(m, .58, true); assert.equal(await m.locator('.evolution-canvas').getAttribute('data-variant'), 'mobile');
    await m.screenshot({ path: 'qa/evolution-mobile.png' });
    assert.ok(Number(await m.locator('.evolution-canvas').getAttribute('data-cache-size')) <= 14);
    await seek(m, .95, true); await m.locator('#evolution-evolution').getByRole('button', { name: 'START YOUR JOURNEY', exact: true }).tap(); assert.ok(await m.locator('.trial-dialog').isVisible()); await m.getByRole('button', { name: 'Close trial enquiry' }).tap();
    await m.setViewportSize({ width: 320, height: 667 }); await m.waitForTimeout(1000); await seek(m, .9, true); assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await m.screenshot({ path: 'qa/evolution-small-mobile.png' });
    assert.deepEqual(errors, []);
    fs.writeFileSync('qa/evolution-result.json', JSON.stringify({ passed: true, frameCount: manifest.frameCount, totalAssetBytes: manifest.totalBytes, peakFrameRequests: peak, checks: ['transparent WebP assets', 'consecutive numbering', 'ZIP contents', 'after membership', 'Canvas 2D only', 'fullscreen pin', 'four chapters', 'forward/reverse', 'freeze on pause', 'decoded-frame callouts', 'chapter navigation', 'enquiry CTA', 'bounded cache/concurrency', 'failed decode fallback', 'mobile assets', '320px layout', 'reduced motion', 'semantic transcript', 'no errors'], errors }, null, 2));
    console.log('Evolution asset and browser checks passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
