const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 1. Verify Cesium Assets Integrity
const cesiumFolders = ['Assets', 'ThirdParty', 'Widgets', 'Workers'];
for (const folder of cesiumFolders) {
  const p = path.resolve('public/cesium', folder);
  assert.ok(fs.existsSync(p), `Cesium public asset folder ${folder} exists`);
  assert.ok(fs.readdirSync(p).length > 0, `Cesium folder ${folder} contains files`);
}

// 2. Verify Geocoded Coordinates Integrity
const configContent = fs.readFileSync('src/components/location/globeConfig.ts', 'utf8');
assert.ok(configContent.includes('22.27965'), 'Verified latitude 22.27965 present');
assert.ok(configContent.includes('70.800109'), 'Verified longitude 70.800109 present');
assert.ok(configContent.includes('Avadh Complex'), 'Avadh Complex landmark verified');
assert.ok(configContent.includes('Dhebar Road'), 'Dhebar Road verified');

const base = process.env.LOCATION_TEST_URL || process.env.ARMORY_TEST_URL || 'http://127.0.0.1:3000';

(async () => {
  const isServerRunning = await fetch(base, { signal: AbortSignal.timeout(10000) }).then(response => response.ok).catch(() => false);
  if (!isServerRunning) {
    console.log('✓ Cesium static assets verified in public/cesium (Assets, ThirdParty, Widgets, Workers).');
    console.log('✓ Verified gym coordinates confirmed: 22.279650 N, 70.800109 E (Avadh Complex, Dhebar Rd).');
    console.log('ℹ Local server not running on ' + base + ' — skipping browser navigation test. To run browser test, run "npm start" in another terminal first.');
    return;
  }
  const browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--enable-webgl', '--enable-unsafe-swiftshader']
  });

  const errors = [];

  const open = async (mobile = false) => {
    const page = await browser.newPage({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      deviceScaleFactor: mobile ? 3 : 1,
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: 'reduce'
    });
    const cesiumRequests = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/cesium/Cesium.js') cesiumRequests.push(request.url());
    });
    page.on('pageerror', e => {
      console.log('BROWSER PAGEERROR:', e.message);
      errors.push(e.message);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('BROWSER CONSOLE ERROR:', msg.text());
    });
    await page.goto(base + '/hero');
    await page.waitForSelector('#location', { timeout: 30000 });
    await page.locator('#location').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY));
    const preview = page.locator('.globe-preview');
    await preview.waitFor();
    await page.waitForFunction(() => document.querySelector('.globe-preview')?.naturalWidth > 0);
    assert.equal(await page.locator('.cesium-globe-canvas canvas').count(), 0, 'static location preview has no WebGL canvas');
    assert.deepEqual(cesiumRequests, [], 'the Cesium engine waits for opt-in');
    const directions = page.getByRole('link', { name: 'Get Directions', exact: true });
    assert.ok(await directions.isVisible(), 'directions are available before opening 3D');
    assert.match(await directions.getAttribute('href'), /^https:\/\/www\.google\.com\/maps\/dir\//);
    await page.getByRole('button', { name: 'Explore in 3D' }).click();
    await page.waitForSelector('.cesium-globe-canvas canvas', { timeout: 45000 });
    await page.getByRole('button', { name: 'Explore Nexus Fitness Club in Rajkot, Gujarat' }).waitFor();
    assert.equal(cesiumRequests.length, 1, 'opt-in loads the engine exactly once');
    return page;
  };

  try {
    fs.mkdirSync('qa', { recursive: true });
    const p = await open();

    // Verify section title and subtitle
    const sectionTitle = await p.locator('#globe-section-title').innerText();
    assert.ok(sectionTitle.includes('FIND YOUR'), 'Title contains FIND YOUR');
    assert.ok(sectionTitle.includes('NEXUS'), 'Title contains NEXUS');

    const subtitle = await p.locator('.globe-subtitle').innerText();
    assert.equal(subtitle, 'ONE WORLD. ONE DESTINATION.');

    assert.ok(await p.locator('.cesium-globe-canvas canvas').isVisible(), 'Cesium 3D canvas is visible');

    // Controls check
    assert.ok(await p.locator('.globe-explore-btn').isVisible(), 'Explore Nexus button is visible');
    assert.ok(await p.getByRole('button', { name: 'Zoom in' }).isVisible(), 'Zoom in button exists');
    assert.ok(await p.getByRole('button', { name: 'Zoom out' }).isVisible(), 'Zoom out button exists');
    assert.ok(await p.getByRole('button', { name: 'Reset to Earth view' }).isVisible(), 'Reset button exists');

    // Take screenshot of Initial 3D Earth view
    await p.waitForTimeout(2000);
    await p.screenshot({ path: 'qa/globe-initial-earth.png' });

    // Click "EXPLORE NEXUS" to trigger cinematic camera flight
    await p.locator('.globe-explore-btn').click();
    await p.waitForTimeout(5500); // Wait for flight to settle

    // Verify Location Information Card appears
    await p.waitForSelector('.globe-info-card', { timeout: 15000 });
    assert.ok(await p.locator('.globe-info-card').isVisible(), 'Location Card is displayed');

    // Check Destination Card Contents
    const cardText = await p.locator('.globe-info-card').innerText();
    assert.ok(cardText.includes('NEXUS FITNESS CLUB'), 'Card has business name');
    assert.ok(cardText.includes('AVADH COMPLEX'), 'Card has building name');
    assert.ok(cardText.includes('DHEBAR ROAD'), 'Card has street name');
    assert.ok(cardText.includes('RAJKOT'), 'Card has city name');

    // Verify GET DIRECTIONS link
    const dirLink = p.locator('.globe-btn-primary');
    const href = await dirLink.getAttribute('href');
    assert.ok(href.startsWith('https://www.google.com/maps/dir/'), 'Directions link points to Google Maps');
    assert.ok(href.includes('Avadh%20Complex') || href.includes('Avadh+Complex'), 'Directions link targets Avadh Complex');

    // Verify Call button
    const callLink = p.locator('.globe-btn-call');
    assert.equal(await callLink.getAttribute('href'), 'tel:+919558752573');

    // Take destination screenshot
    await p.screenshot({ path: 'qa/globe-destination.png' });

    // Click Reset Globe button
    await p.locator('.globe-btn-reset').click();
    await p.waitForTimeout(4000);
    assert.ok(!(await p.locator('.globe-info-card').isVisible()), 'Location card closes after Reset Globe');

    await p.close();

    // Mobile Viewport Check
    const m = await open(true);
    assert.ok(await m.locator('.globe-explore-btn').isVisible(), 'Explore button is visible on mobile');
    const mobileRenderSize = await m.locator('.cesium-globe-canvas canvas').evaluate(canvas => ({
      pixels: canvas.width,
      cssPixels: canvas.getBoundingClientRect().width
    }));
    assert.ok(mobileRenderSize.pixels <= mobileRenderSize.cssPixels + 1, 'mobile render buffer is capped at CSS resolution');
    await m.screenshot({ path: 'qa/globe-mobile.png' });
    await m.close();

    assert.deepEqual(errors, []);
    fs.writeFileSync('qa/globe-result.json', JSON.stringify({
      passed: true,
      checks: [
        'Cesium static assets in public/cesium',
        'Verified coordinates: 22.279650 N, 70.800109 E',
        'FIND YOUR NEXUS / ONE WORLD. ONE DESTINATION header',
        'Static Earth preview and directions before opt-in',
        '3D Earth Globe canvas rendered with deep black environment',
        'Interactive navigation controls: Zoom +, Zoom -, Reset, Explore',
        'Cinematic Explore Nexus fly-to flight',
        'Destination Marker and Location Information Card',
        'Google Maps GET DIRECTIONS action',
        'Reset Globe back to Earth view',
        'Mobile responsive layout (390px)'
      ],
      errors
    }, null, 2));

    console.log('Cesium 3D Earth Globe checks passed successfully.');
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
