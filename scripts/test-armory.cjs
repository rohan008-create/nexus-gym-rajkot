const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const baseUrl = process.env.ARMORY_TEST_URL || 'http://127.0.0.1:3000';
(async () => {
 const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-webgl','--use-angle=d3d11']});
 const errors=[],failures=[];fs.mkdirSync('qa',{recursive:true});
 const open=async(mobile=false)=>{const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`)});await p.goto(baseUrl + '/hero',{timeout:90000});await p.waitForSelector('[data-rope-status=ready]',{timeout:90000});return p};
 try{
  const p=await open();await p.waitForSelector('.armory-is-pinned');
  assert.equal(await p.locator('.armory-stage').count(),3);assert.equal(await p.evaluate(()=>document.querySelector('#programs').compareDocumentPosition(document.querySelector('#armory'))&Node.DOCUMENT_POSITION_FOLLOWING),4);
  const images=await p.locator('.armory-equipment').evaluateAll(imgs=>Promise.all(imgs.map(async img=>{img.loading='eager';await img.decode();return {src:img.getAttribute('src'),valid:img.naturalWidth>0}})));assert.equal(new Set(images.map(i=>i.src)).size,3);assert.ok(images.every(i=>i.valid));
  const start=await p.locator('.armory-showcase').evaluate(el=>el.getBoundingClientRect().top+scrollY-84);
  const range=900*1.65;
  const seek=async(progress)=>{await p.evaluate(y=>scrollTo(0,y),start+range*progress);await p.waitForTimeout(1050)};
  await seek(.16);assert.equal(await p.locator('#armory').getAttribute('data-armory-stage'),'power');await p.screenshot({path:'qa/armory-power.png'});
  await seek(.36);assert.ok(await p.locator('.armory-scanner').evaluate(el=>+getComputedStyle(el).opacity)>.05,'scanner appears during transition');
  await seek(.5);assert.equal(await p.locator('#armory').getAttribute('data-armory-stage'),'endurance');assert.equal(await p.locator('.armory-progress').getAttribute('aria-valuenow'),'2');await p.screenshot({path:'qa/armory-endurance.png'});
  const visible=await p.locator('.armory-stage').evaluateAll(nodes=>nodes.filter(n=>+getComputedStyle(n).opacity>.05).length);assert.equal(visible,1,'no equipment overlap');
  await p.mouse.move(1270,420);await p.waitForTimeout(750);assert.notEqual(await p.locator('[data-stage=endurance] .armory-parallax').evaluate(el=>getComputedStyle(el).transform),'none');
  await seek(.86);assert.equal(await p.locator('#armory').getAttribute('data-armory-stage'),'precision');assert.equal(await p.locator('.armory-progress').getAttribute('aria-valuenow'),'3');await p.screenshot({path:'qa/armory-precision.png'});
  await seek(.5);assert.equal(await p.locator('#armory').getAttribute('data-armory-stage'),'endurance','reverse stage 2');await seek(.16);assert.equal(await p.locator('#armory').getAttribute('data-armory-stage'),'power','reverse stage 1');
  await seek(.96);await p.getByRole('button',{name:'EXPLORE OUR PROGRAMS',exact:true}).click();await p.waitForTimeout(1600);assert.ok(await p.locator('#programs').evaluate(el=>Math.abs(el.getBoundingClientRect().top-80)<20),'CTA returns to Programs');
  assert.equal(await p.locator('.program-panel').count(),5);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(700);assert.equal(await p.locator('.armory-is-pinned').count(),0);assert.equal(await p.locator('.armory-stage').evaluateAll(nodes=>nodes.every(n=>+getComputedStyle(n).opacity===1)),true,'all reduced-motion content readable');await p.close();
  const m=await open(true);assert.equal(await m.locator('.armory-is-pinned').count(),0);assert.equal(await m.locator('.armory-stage').count(),3);
  await m.locator('[data-stage=power]').scrollIntoViewIfNeeded();await m.waitForTimeout(600);await m.screenshot({path:'qa/armory-mobile.png'});
  await m.locator('[data-stage=precision]').scrollIntoViewIfNeeded();await m.getByRole('button',{name:'EXPLORE OUR PROGRAMS',exact:true}).click();await m.waitForTimeout(1500);assert.ok(await m.locator('#programs').evaluate(el=>el.getBoundingClientRect().top<150),'mobile CTA works');assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);fs.writeFileSync('qa/armory-result.json',JSON.stringify({passed:true,checks:['after Programs','three distinct local images','desktop pin','power','endurance','precision','no image overlap','scanner','progress','parallax','reverse','Programs CTA','mobile unpinned flow','reduced motion','no overflow'],errors,failures},null,2));console.log('Armory browser checks passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
