// Supplemental real touch-context emulation: agent-browser's device preset
// exposes UA/viewport settings but this installation reports zero touch points.
const {chromium,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.TOUR_TEST_URL||'http://localhost:3000';
const out=path.resolve(process.env.TOUR_TEST_OUTPUT||'artifacts/gym-tour/phase2');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||'/opt/google/chrome/chrome',headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({...devices['iPhone 13'],viewport:{width:390,height:844}});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const report={mode:'Chromium touch emulation with software WebGL; not physical iOS Safari',checks:[],errors};
 try{
  await page.goto(`${base}/hero`,{timeout:120000});
  await page.waitForFunction(()=>document.querySelector('#home')?.getAttribute('data-tour-status')==='ready'||document.querySelector('#home [data-tour-status="ready"]'),null,{timeout:90000});
  if(process.env.EXPECT_DETAILED_EXTERIOR==='1'){await page.waitForFunction(()=>document.querySelector('#home canvas')?.getAttribute('data-exterior-source')==='detailed',null,{timeout:60000});report.checks.push('detailed exterior model loaded in touch context');}
  if(process.env.EXPECT_DETAILED_INTERIOR==='1'){await page.locator('.gym-tour-stops button').nth(1).tap();await page.waitForFunction(()=>document.querySelector('#home canvas')?.getAttribute('data-interior-source')==='detailed',null,{timeout:60000});await page.locator('.gym-tour-stops button').nth(0).tap();await page.waitForFunction(()=>document.getElementById('home')?.getAttribute('data-tour-beat')==='exterior');report.checks.push('detailed interior loaded in touch context');}
  report.environment=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,touch:navigator.maxTouchPoints,coarse:matchMedia('(pointer:coarse)').matches}));
  assert.ok(report.environment.touch>0&&report.environment.coarse,'true touch context');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
  report.checks.push('touch context, coarse pointer and no horizontal overflow');
  const targets=await page.locator('.gym-tour-stops button').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return {width:r.width,height:r.height}}));
  assert.ok(targets.length===4&&targets.every(t=>t.width>=44&&t.height>=44),'four accessible touch targets');
  report.checks.push('all four stop targets are at least44x44 CSS pixels');
  for(const [index,beat] of ['exterior','entry','strength','cardio'].entries()){
   await page.locator('.gym-tour-stops button').nth(index).tap();
   await page.waitForFunction(expected=>document.getElementById('home')?.getAttribute('data-tour-beat')===expected,beat);
  }
  report.checks.push('all four tour stops reached through touch controls');
  await page.waitForFunction(()=>Number(document.getElementById('home')?.getAttribute('data-tour-progress'))>.985);
  const trial=page.locator('#home button').filter({hasText:/Book.*Trial/i}).first();
  await trial.tap();await page.locator('.trial-dialog[open], [role=dialog]:has(#trial-enquiry-form)').waitFor();
  await page.getByRole('button',{name:/Close (trial enquiry|dialog)/i}).tap();
  await page.locator('.trial-dialog[open], [role=dialog]:has(#trial-enquiry-form)').waitFor({state:'hidden'});
  report.checks.push('trial CTA opens and closes by touch');
  await page.locator('.menu-toggle').tap();
  await page.locator('.nav-links a[href="#programs"]').tap();
  await page.waitForFunction(()=>Math.abs(document.getElementById('programs').getBoundingClientRect().top)<180);
  report.checks.push('mobile menu bypasses tour to Programs');
  await page.locator('.menu-toggle').tap();
  await page.locator('.nav-links a[href="#home"]').tap();
  await page.waitForFunction(()=>Math.abs(document.getElementById('home').getBoundingClientRect().top)<20);
  await page.screenshot({path:path.join(out,'mobile-touch-exterior.png')});
  const client=await context.newCDPSession(page);
  // Chrome synthesizes native scrolling from a touch gesture rather than wheel input.
  await page.waitForTimeout(1300); // let the Home navigation animation finish before the independent gesture
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:340}]});
  for(const y of [300,260,220,180,140]){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y}]});await page.waitForTimeout(30);}
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  report.scrollDiagnostic=await page.evaluate(()=>({scroll:scrollY,bodyOverflow:getComputedStyle(document.body).overflow,htmlOverflow:getComputedStyle(document.documentElement).overflow,classes:document.documentElement.className,target:document.elementFromPoint(190,340)?.className}));
  await page.waitForFunction(()=>scrollY>100,null,{timeout:10000});
  report.checks.push('native touch gesture scrolls the hero');
  await page.evaluate(()=>{const hero=document.getElementById('home');scrollTo(0,hero.offsetTop+(hero.offsetHeight-innerHeight)*.85)});
  await page.waitForFunction(()=>Number(document.getElementById('home')?.getAttribute('data-tour-progress')||document.querySelector('#home [data-tour-progress]')?.getAttribute('data-tour-progress'))>.75);
  await page.screenshot({path:path.join(out,'mobile-touch-interior.png')});
  report.checks.push('interior reached on mobile');
  assert.deepEqual(errors,[],'no uncaught runtime errors');
  report.passed=true;console.log(JSON.stringify(report));console.log('VERDICT: PASS');
 }catch(error){report.passed=false;report.failure=error.message;console.error('VERDICT: FAIL --',error);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(out,'mobile-touch.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(error=>{console.error('VERDICT: FAIL --',error);process.exitCode=1});
