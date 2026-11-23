const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const sharp = require('sharp');
const base = process.env.PRODUCTS_TEST_URL || 'http://127.0.0.1:3000';
const output = 'artifacts/products';
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const errors = [], checks = [];
  const open = async (width = 1440, reduce = false, theme = 'light', corrupt = false) => {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, isMobile: width < 600, hasTouch: width < 600, reducedMotion: reduce ? 'reduce' : 'no-preference' });
    page.on('pageerror', error => errors.push(error.stack));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.addInitScript(({ theme, corrupt }) => { localStorage.setItem('nexus-theme', theme); if (corrupt) localStorage.setItem('nexus-product-kit-v1', '{invalid'); }, { theme, corrupt });
    await page.goto(`${base}/hero`, { timeout: 90000 });
    await page.locator('#products').waitFor({ timeout: 90000 });
    await page.locator('#products').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY));
    return page;
  };
  const decode = async page => page.locator('.ps-product-image').evaluateAll(images => Promise.all(images.map(async image => { image.loading = 'eager'; await image.decode(); return image.naturalWidth > 0; })));
  const close = async page => { await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.ps-dialog')); };
  try {
    for (const name of ['whey', 'isolate', 'creatine', 'preworkout', 'electrolytes', 'gainer', 'peanut', 'bar', 'shaker', 'straps', 'bands', 'bag']) {
      const { data, info } = await sharp(`public/assets/products/${name}.webp`).raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.channels, 4, `${name} alpha channel`);
      let transparent = 0;
      for (let i = 3; i < data.length; i += 4) if (!data[i]) transparent++;
      assert.ok(transparent / (info.width * info.height) > .15, `${name} actual transparency`);
    }
    checks.push('12 genuine transparent product photographs');
    const p = await open();
    assert.equal(await p.locator('.ps-product').count(), 12);
    assert.equal(await p.locator('.ps-shelf-row').count(), 3);
    assert.equal(await p.locator('#products').evaluate(el => el.previousElementSibling.id), 'membership');
    assert.equal(await p.locator('#booking').evaluate(el => el.previousElementSibling.id), 'products');
    assert.ok((await decode(p)).every(Boolean));
    assert.equal(await p.locator('#products').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
    assert.equal(await p.locator('.ps-shelves').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
    assert.equal(await p.locator('.ps-shelves').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
    assert.equal(await p.locator('.ps-wall-rail, .ps-wall-lighting, .ps-wall-title').count(), 0);
    const desktopBoards = await p.locator('.ps-shelf-row').first().locator('.ps-shelf-edge').evaluateAll(boards => boards.map(board => { const r = board.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, height: r.height }; }));
    assert.ok(desktopBoards.every(board => board.height >= 20));
    assert.ok(desktopBoards.every(board => Math.abs(board.top - desktopBoards[0].top) < 1));
    assert.ok(desktopBoards.slice(0, -1).every((board, index) => Math.abs(board.right - desktopBoards[index + 1].left) < 1));
    checks.push('pure white display without textured wall or rails and continuous white shelves');
    await p.locator('#products').screenshot({ path: `${output}/desktop-shelf.png` });
    checks.push('12 products, three shelves, correct page placement and image decode');
    for (const [name, count] of [['Supplements', 6], ['Nutrition', 2], ['Accessories', 4], ['All', 12]]) {
      await p.getByRole('group', { name: 'Filter products' }).getByRole('button', { name: new RegExp(`^${name}`) }).click();
      assert.equal(await p.locator('.ps-product').count(), count);
    }
    checks.push('all four category filters');
    const trigger = p.getByRole('button', { name: 'View Whey Protein', exact: true });
    await trigger.click();
    const dialog = p.getByRole('dialog', { name: 'Whey Protein', exact: true });
    await dialog.waitFor();
    await dialog.locator('.ps-detail-image').evaluate(image => image.decode());
    assert.equal(await p.evaluate(() => document.body.style.overflow), 'hidden');
    assert.ok(await dialog.evaluate(el => el.open && el.contains(document.activeElement)));
    for (let i = 0; i < 15; i++) {
      await p.keyboard.press('Tab');
      assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)), 'focus stays in modal');
    }
    checks.push('native modal focus containment and page scroll lock');
    await dialog.getByRole('radio', { name: /Chocolate \/ 2 kg/ }).check();
    assert.ok((await dialog.locator('.ps-detail-price').innerText()).includes('4,699'));
    assert.ok(await dialog.getByRole('button', { name: 'Decrease quantity', exact: true }).isDisabled());
    await dialog.getByRole('button', { name: 'Increase quantity', exact: true }).click();
    await dialog.getByRole('button', { name: 'ADD TO YOUR KIT', exact: true }).click();
    assert.ok((await dialog.getByRole('button', { name: /^YOUR KIT/ }).innerText()).includes('(2)'));
    await dialog.getByRole('button', { name: 'Product information', exact: false }).click();
    assert.ok(await dialog.locator('.ps-information').getByText(/manufacturer label/).isVisible());
    await dialog.getByRole('button', { name: 'Product details', exact: false }).click();
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${output}/desktop-product.png` });
    checks.push('variant pricing, quantity, add to kit and information panels');
    const inspect = await dialog.locator('.ps-inspect').boundingBox();
    await p.mouse.move(inspect.x + inspect.width / 2, inspect.y + inspect.height / 2);
    await p.mouse.down();
    await p.mouse.move(inspect.x + inspect.width / 2 + 70, inspect.y + inspect.height / 2, { steps: 6 });
    assert.notEqual(await dialog.locator('.ps-inspect').evaluate(el => getComputedStyle(el).transform), 'none');
    await p.mouse.up();
    checks.push('drag inspection and release');
    await close(p);
    assert.ok(await trigger.evaluate(el => el === document.activeElement));
    assert.notEqual(await p.evaluate(() => document.body.style.overflow), 'hidden');
    checks.push('Escape, focus restoration and scroll unlock');
    await p.getByRole('button', { name: 'View kit, 2 items', exact: true }).click();
    const kit = p.getByRole('dialog', { name: 'Your product kit' });
    await kit.waitFor();
    assert.equal(await kit.locator('.ps-kit-line').count(), 1);
    assert.ok((await kit.locator('.ps-kit-total').innerText()).includes('9,398'));
    await kit.getByRole('button', { name: 'Increase Whey Protein quantity', exact: true }).click();
    assert.ok((await kit.locator('.ps-kit-total').innerText()).includes('14,097'));
    await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await kit.getByRole('button', { name: 'COPY PRODUCT ENQUIRY' }).click();
    await p.waitForFunction(() => document.querySelector('.ps-copy-status')?.textContent.includes('ready to paste'));
    const clipboard = await p.evaluate(() => navigator.clipboard.readText());
    assert.ok(clipboard.includes('3 x Whey Protein') && clipboard.includes('Chocolate / 2 kg'));
    assert.ok(clipboard.includes('confirm'));
    await p.screenshot({ path: `${output}/desktop-kit.png` });
    checks.push('kit quantity edits, indicative total and copied enquiry');
    await close(p);
    await p.reload({ timeout: 90000 });
    await p.getByRole('button', { name: 'View kit, 3 items', exact: true }).waitFor({ timeout: 90000 });
    await p.getByRole('button', { name: 'View kit, 3 items', exact: true }).click();
    await p.getByRole('dialog').getByRole('button', { name: 'Remove Whey Protein', exact: true }).click();
    assert.ok(await p.getByText('Your kit is waiting for its first essential.').isVisible());
    await close(p);
    checks.push('kit persistence after reload, removal and empty state');
    await p.close();
    for (const config of [{ width: 390 }, { width: 768 }, { width: 1920, theme: 'dark' }, { width: 390, reduce: true, corrupt: true }]) {
      const page = await open(config.width, config.reduce || false, config.theme || 'light', config.corrupt || false);
      assert.equal(await page.locator('.ps-product').count(), 12);
      assert.ok((await decode(page)).every(Boolean));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${config.width}px shelf no overflow`);
      if (config.width <= 800) {
        const boards = await page.locator('.ps-shelf-edge').evaluateAll(items => items.map(item => { const r = item.getBoundingClientRect(); return { top: Math.round(r.top), left: r.left, right: r.right }; }));
        const levels = new Map();
        for (const board of boards) levels.set(board.top, [...(levels.get(board.top) || []), board]);
        assert.equal(levels.size, 6, 'six physical shelves for twelve mobile products');
        assert.ok([...levels.values()].every(pair => pair.length === 2 && Math.abs(pair[0].right - pair[1].left) < 1), 'each mobile shelf is continuous and holds two products');
      }
      await page.locator('#products').screenshot({ path: `${output}/shelf-${config.width}${config.reduce ? '-reduced' : ''}.png` });
      await page.getByRole('button', { name: 'View Nexus Shaker', exact: true }).click();
      const detail = page.getByRole('dialog', { name: 'Nexus Shaker' });
      await detail.waitFor();
      await detail.locator('.ps-detail-image').evaluate(image => image.decode());
      assert.equal(await detail.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `${config.width}px modal no overflow`);
      await detail.getByRole('button', { name: 'ADD TO YOUR KIT', exact: true }).click();
      if (config.width === 390) await page.screenshot({ path: `${output}/detail-mobile${config.reduce ? '-reduced' : ''}.png` });
      await close(page);
      if (config.reduce) assert.equal(await page.locator('.ps-product-stage').first().evaluate(el => getComputedStyle(el).animationName), 'none');
      await page.close();
    }
    checks.push('390px mobile shelf and product controls', 'two products per continuous mobile and tablet shelf', '768px tablet layout', '1920px dark theme compatibility', 'reduced motion', 'invalid saved kit recovery', 'no shelf or dialog horizontal overflow');
    assert.deepEqual(errors, []);
    fs.writeFileSync(`${output}/result.json`, JSON.stringify({ passed: true, checks, errors }, null, 2));
    console.log(`Passed ${checks.length} product checks.\nVERDICT: PASS`);
  } catch (error) {
    console.error('Runtime errors:', errors);
    for (const page of browser.contexts().flatMap(context => context.pages())) await page.screenshot({ path: `${output}/failure.png`, timeout: 10000 }).catch(() => {});
    throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error('VERDICT: FAIL --', error); process.exitCode = 1; });
