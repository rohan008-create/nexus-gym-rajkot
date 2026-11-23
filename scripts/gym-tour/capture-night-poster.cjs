const { chromium } = require('playwright');
const sharp = require('sharp');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1836, height: 856 } });
    await page.addInitScript(() => localStorage.setItem('nexus-theme', 'dark'));
    await page.goto('http://localhost:3000/hero', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => document.querySelector('#home')?.dataset.tourStatus === 'ready' && document.querySelector('#home canvas')?.dataset.streetSource === '3d', null, { timeout: 90000 });
    for (const [name, width, height] of [['arrival-night', 1836, 856], ['arrival-night-portrait', 760, 1100]]) {
      await page.setViewportSize({ width, height }); await page.waitForTimeout(1500);
      const buffer = await page.locator('#home canvas').screenshot();
      await sharp(buffer).webp({ quality: 86 }).toFile(`public/models/nexus-gym/${name}.webp`);
      console.log(`Captured ${name}`);
    }
    console.log('VERDICT: PASS');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
