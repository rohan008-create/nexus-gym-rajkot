const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const url = process.env.FOOTER_TEST_URL || 'http://127.0.0.1:3000/footer-preview';
const out = 'qa/footer-simple'; fs.mkdirSync(out, { recursive: true });
(async()=>{
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const errors=[], result={};
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    await page.addInitScript(()=>{window.footerWebGL=0;const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.includes('webgl'))window.footerWebGL++;return original.call(this,type,...args)}});
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' '+m.location().url)});
    await page.goto(url);
    const effect=page.locator('.rising-horizon');
    await page.locator('.rising-horizon[data-mode=animated]').waitFor();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.np-art,.np-webgl,.np-rock-fallback').count(),0);
    assert.equal(await page.locator('.nsf-details nav a').count(),6);
    assert.equal(await page.locator('.nsf-phone').getAttribute('href'),'tel:+919558752573');
    assert.equal(await page.locator('.nsf-cta').getAttribute('href'),'/hero#booking');
    assert.equal(await page.evaluate(()=>window.footerWebGL),0);
    const state=()=>effect.evaluate(e=>({...e.dataset}));
    const first=Number((await state()).frame);await page.waitForTimeout(350);assert(Number((await state()).frame)>first);
    await page.locator('.nexus-simple-footer').screenshot({path:`${out}/desktop.png`});
    const bounds=await page.locator('.nsf-invite').boundingBox();
    await page.mouse.move(bounds.x+bounds.width*.18,bounds.y+bounds.height*.7);
    await page.waitForTimeout(350);assert.equal((await state()).pointer,'true');
    await page.mouse.click(bounds.x+bounds.width*.18,bounds.y+bounds.height*.7);
    await page.waitForTimeout(350);result.click=await state();assert(Number(result.click.volleys)>0);
    for(let i=0;i<5;i++)await page.mouse.click(bounds.x+bounds.width*.22,bounds.y+bounds.height*.72);
    await page.waitForTimeout(250);assert(Number((await state()).volleys)<=24);
    await page.locator('.nexus-simple-footer').screenshot({path:`${out}/interactive.png`});
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);assert.equal((await state()).mode,'still');
    const still=(await state()).frame;await page.waitForTimeout(400);assert.equal((await state()).frame,still);
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(350);assert.equal((await state()).mode,'animated');
    const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(url);await mobile.locator('.nsf-invite').scrollIntoViewIfNeeded();
    await mobile.locator('.rising-horizon[data-mode=animated]').waitFor();
    await mobile.locator('.nsf-invite').tap({position:{x:35,y:220}});await mobile.waitForTimeout(300);
    result.mobileTap=await mobile.locator('.rising-horizon').evaluate(e=>({...e.dataset}));assert.equal(result.mobileTap.launches,'1');
    await mobile.locator('.nexus-simple-footer').screenshot({path:`${out}/mobile.png`});
    result.widths=[];
    for(const width of [320,360,390,768,1024,1920]){
      await mobile.setViewportSize({width,height:844});await mobile.waitForTimeout(100);
      const layout=await mobile.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth}));assert.equal(layout.overflow,false);result.widths.push(layout);
    }
    await mobile.setViewportSize({width:390,height:300});await mobile.evaluate(()=>scrollTo(0,0));await mobile.waitForTimeout(400);
    assert.equal(await mobile.locator('.rising-horizon').getAttribute('data-visible'),'false');
    const stopped=await mobile.locator('.rising-horizon').getAttribute('data-frame');await mobile.waitForTimeout(400);assert.equal(await mobile.locator('.rising-horizon').getAttribute('data-frame'),stopped);
    const fallback=await browser.newPage();await fallback.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null});await fallback.goto(url);await fallback.locator('.rising-horizon[data-mode=fallback]').waitFor();assert.equal(await fallback.locator('.nsf-cta').isVisible(),true);
    assert.deepEqual(errors,[]);result.errors=errors;fs.writeFileSync(`${out}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
