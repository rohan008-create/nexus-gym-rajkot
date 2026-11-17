const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.goto(`${process.env.ARMORY_TEST_URL || 'http://127.0.0.1:3001'}/hero`);
    await page.waitForSelector('[data-rope-status=ready]', { timeout: 90000 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 70, downloadThroughput: 750000, uploadThroughput: 750000 });
    await page.locator('#human-evolution').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY - 1400));
    const warmupMs = Number(process.env.EVOLUTION_WARMUP_MS || 10000);
    await page.waitForTimeout(warmupMs);
    const samples = await page.evaluate(async () => {
      const el = document.querySelector('#human-evolution');
      const start = el.getBoundingClientRect().top + scrollY, range = innerHeight * 3.5;
      const begun = performance.now(), rows = [];
      await new Promise(resolve => {
        function tick(t) {
          const p = Math.min(1, (t - begun) / 5000);
          scrollTo(0, start + range * (.03 + p * .72));
          const canvas = el.querySelector('canvas');
          rows.push({ t: t - begun, f: Number(canvas?.dataset.frame || 0), position: Number(canvas?.dataset.position || 0), cache: Number(canvas?.dataset.cacheSize || 0), encodedBytes: Number(canvas?.dataset.encodedBytes || 0), progress: el.style.getPropertyValue('--journey-progress'), y: scrollY });
          if (p < 1) requestAnimationFrame(tick); else resolve();
        }
        requestAnimationFrame(tick);
      });
      return rows;
    });
    let changes = 0, blendedChanges = 0, previous = 0, previousPosition = 0, holdStart = 0, longestHold = 0, largestJump = 0;
    for (const row of samples) {
      if (Math.abs(row.position - previousPosition) > .005) { blendedChanges++; previousPosition = row.position; }
      if (row.f !== previous) { changes++; largestJump = Math.max(largestJump, Math.abs(row.f - previous)); longestHold = Math.max(longestHold, row.t - holdStart); holdStart = row.t; previous = row.f; }
      assert.ok(row.cache <= 14); assert.ok(row.encodedBytes <= 8 * 1024 * 1024);
    }
    const result = { network: `6 Mbps / 70ms latency; cold browser cache; ${warmupMs / 1000}s near-section warmup (preceding-section browsing)`, durationMs: 5000, integerFrameChanges: changes, blendedPoseChanges: blendedChanges, longestFrameHoldMs: Math.round(longestHold), largestFrameJump: largestJump, samples };
    fs.writeFileSync('qa/evolution-smooth-after.json', JSON.stringify(result, null, 2));
    assert.ok(blendedChanges > 60, 'continuous poses update during a throttled scroll');
    assert.ok(longestHold < 600, 'no long frame stalls');
    console.log(JSON.stringify({ ...result, samples: undefined }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
