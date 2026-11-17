const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-webgl','--use-angle=d3d11']});
 const errors=[], failures=[]; fs.mkdirSync('qa',{recursive:true});
 const open = async (mobile=false,route='/hero') => {
  const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`)});
  await page.goto(`http://127.0.0.1:3000${route}`,{timeout:90000});return page;
 };
 const imageReady=async(page,selector)=>page.locator(selector).evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode().then(()=>true).catch(()=>false)}))).then(results=>assert.ok(results.every(Boolean),'all image assets loaded'));
 const go=async(page,name)=>{await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name,exact:true}).click();await page.waitForTimeout(1500)};
 try{
  const p=await open();await p.waitForSelector('[data-rope-status=ready]',{timeout:90000});await p.waitForTimeout(2000);
  assert.equal((await p.locator('h1').innerText()).replace(/\s+/g,' '),'TRANSFORM YOUR POTENTIAL.');
  assert.equal(await p.locator('.program-panel').count(),5);assert.equal(await p.locator('.program-panel.is-active').getAttribute('data-program'),'muscle');
  const rope=await p.locator('canvas').getAttribute('data-rope-id');assert.ok(rope);
  await imageReady(p,'.brand img');await p.screenshot({path:'qa/hero-desktop.png'});
  const wave=await p.locator('canvas').screenshot();await p.waitForTimeout(650);assert.equal(wave.equals(await p.locator('canvas').screenshot()),false,'animated rope');
  await p.getByRole('button',{name:'Start Your Journey'}).click();await p.getByLabel('Your name').fill('Demo Visitor');await p.getByRole('button',{name:'Prepare enquiry'}).click();assert.match(await p.locator('.enquiry-result').innerText(),/Demo Visitor/);await p.keyboard.press('Escape');
  await p.evaluate(()=>scrollTo(0,document.querySelector('.hero-section').getBoundingClientRect().height*.71));await p.waitForTimeout(1200);await p.screenshot({path:'qa/rope-pulse.png'});
  await go(p,'About');await imageReady(p,'.gym-photo,.gym-wall-logo');assert.equal(await p.locator('.gym-wall-logo').getAttribute('src'),'/assets/nexus-logo.png');assert.match(await p.locator('#about-title').innerText(),/BUILT/);
  assert.equal(await p.locator('canvas').getAttribute('data-rope-id'),rope,'same rope into About');
  assert.equal(await p.evaluate(()=>+getComputedStyle(document.querySelector('.persistent-scene')).zIndex>+getComputedStyle(document.querySelector('.about-gym-visual')).zIndex),true,'rope in front of gym photograph');
  await p.screenshot({path:'qa/about-desktop.png'});
  await p.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Home',exact:true}).click();await p.waitForTimeout(1500);assert.equal(await p.locator('canvas').getAttribute('data-rope-id'),rope,'same mesh on reverse scroll');assert.equal(await p.evaluate(()=>scrollY<5),true);
  await go(p,'Programs');await imageReady(p,'.program-panel > img');await p.screenshot({path:'qa/programs-desktop.png'});
  await p.locator('[data-program=functional]').hover();await p.waitForTimeout(750);assert.equal(await p.locator('.program-panel.is-active').getAttribute('data-program'),'functional');
  await p.getByRole('button',{name:'Select Strength Training',exact:true}).focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('.program-panel.is-active').getAttribute('data-program'),'muscle');
  await p.locator('.program-panel.is-active').getByRole('button',{name:'EXPLORE PROGRAM',exact:true}).click();assert.match(await p.locator('#program-detail-title').textContent(),/Muscle Building/);await p.screenshot({path:'qa/program-detail.png'});
  await p.getByRole('button',{name:'Enquire about this program'}).click();assert.equal(await p.locator('.trial-dialog').evaluate(d=>d.open),true);await p.keyboard.press('Escape');
  for(const name of ['Strength Training','Cardio Training','Functional Fitness','Personal Training']){await p.getByRole('button',{name:`View ${name} details`,exact:true}).click();assert.equal(await p.locator('#program-detail-title').textContent(),name);await p.getByRole('button',{name:'Close program details'}).click()}
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.close();
  const m=await open(true);await m.waitForSelector('[data-rope-status=ready]',{timeout:90000});await m.waitForTimeout(2000);await m.screenshot({path:'qa/hero-mobile.png'});
  await m.getByRole('button',{name:'Open navigation'}).click();await go(m,'About');await m.screenshot({path:'qa/about-mobile.png'});
  await m.evaluate(()=>scrollBy(0,380));await m.waitForTimeout(500);await imageReady(m,'.gym-photo');await m.screenshot({path:'qa/about-gym-mobile.png'});
  await m.getByRole('button',{name:'Open navigation'}).click();await go(m,'Programs');await imageReady(m,'.program-panel > img');await m.screenshot({path:'qa/programs-mobile.png'});
  await m.getByRole('button',{name:'Feature Functional Fitness'}).click();await m.waitForTimeout(700);await m.locator('.program-panel.is-active').getByRole('button',{name:'EXPLORE PROGRAM',exact:true}).click();assert.equal(await m.locator('#program-detail-title').textContent(),'Functional Fitness');await m.keyboard.press('Escape');
  assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile no overflow');
  await m.emulateMedia({reducedMotion:'reduce'});await m.getByRole('button',{name:'Back to top'}).click();await m.waitForTimeout(300);assert.equal(await m.evaluate(()=>scrollY<5),true);await m.close();
  const f=await open(false,'/');await f.waitForSelector('main[data-phase=IDLE] canvas',{timeout:90000});await f.waitForTimeout(6500);await f.mouse.click(720,450);for(let i=0;i<3&&await f.locator('main[data-phase=IDLE]').count();i++){await f.waitForTimeout(2500);await f.mouse.click(720,450)}
  await f.waitForSelector('[data-rope-status=ready]',{timeout:30000});assert.equal(await f.locator('main.intro').count(),0);await f.getByRole('button',{name:'Replay intro'}).click();await f.waitForSelector('main[data-phase=IDLE] canvas',{timeout:30000});
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);fs.writeFileSync('qa/hero-result.json',JSON.stringify({passed:true,checks:['official logo','three-ply rope','anchor continuity and reverse','About photograph and wall logo','foreground rope layering','five program images','featured card','hover/click/keyboard expansion','all program detail modals','trial enquiry handoff','desktop/mobile','no overflow','reduced motion','intro explosion to hero','replay intro'],errors,failures},null,2));console.log('Three-section website browser checks passed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

