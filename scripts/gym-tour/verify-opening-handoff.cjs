const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const base = process.env.TOUR_TEST_URL || 'http://127.0.0.1:3001';
const executablePath = process.env.BROWSER_EXECUTABLE ||
  (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : undefined);

async function verifyOpening(browser, mobile) {
  const page = await browser.newPage(mobile
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
    : { viewport: { width: 1440, height: 1000 } });
  const models = [];
  const errors = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/models/nexus-gym/') && path.endsWith('.glb')) models.push(path);
  });
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const waitForModel = name => page.waitForFunction(file =>
    performance.getEntriesByType('resource').some(entry => entry.name.endsWith(file)), name);

  try {
    await page.goto(base + (mobile ? '/hero' : '/'), { waitUntil: 'domcontentloaded' });
    await page.locator('.nexus-opening[data-active=true]').waitFor();
    assert.equal(await page.locator('#home canvas').count(), 0);
    assert.deepEqual(models, [], 'the opening does not start the 3D tour');
    if (mobile) await page.locator('.nexus-opening-skip').tap();
    await page.locator('.nexus-opening').waitFor({ state: 'detached', timeout: 20000 });
    await page.waitForSelector('#home[data-tour-status=ready]', { timeout: 45000 });
    assert.equal(await page.locator('#home canvas').count(), 1);
    await waitForModel('/street.glb');
    assert.ok(!models.some(model => model.endsWith('/interior.glb')), 'the interior waits for entry');

    await page.locator('.gym-tour-enter').click();
    await page.waitForFunction(() => Number(document.querySelector('#home')?.dataset.tourProgress) >= .1);
    await waitForModel('/interior.glb');
    await page.getByRole('button', { name: 'Skip tour' }).click();
    await page.getByRole('button', { name: 'Replay tour' }).click();
    await page.waitForSelector('#home[data-tour-status=ready]');
    assert.deepEqual(errors, [], 'skipping and replaying during asset preparation is safe');
    console.log(`${mobile ? 'Mobile' : 'Desktop'} opening, model loading, skip and replay passed.`);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath,
    args: process.platform === 'win32'
      ? ['--enable-webgl', '--use-angle=d3d11']
      : ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  try {
    await verifyOpening(browser, false);
    await verifyOpening(browser, true);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
