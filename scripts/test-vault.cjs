const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-webgl','--use-angle=d3d11']});
const errors=[];
try{
 fs.mkdirSync('qa',{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000/hero',{timeout:90000});
 await page.locator('[data-rope-status="ready"]').waitFor({timeout:90000});
 await page.locator('#membership').evaluate(el=>scrollTo(0,el.getBoundingClientRect().top+scrollY-84));
 await page.locator('#membership[data-locker-status="ready"]').waitFor({timeout:60000});
 await page.waitForTimeout(1800);
 await page.locator('#membership').screenshot({path:'qa/vault-desktop-closed.png'});
 await page.getByRole('button',{name:'02 Pro'}).click();
 await page.locator('#membership[data-selected-plan="pro"][data-revealed="true"]').waitFor({timeout:15000});
 await page.locator('#membership').screenshot({path:'qa/vault-desktop-open.png'});
 assert.equal(await page.locator('.vault-interior-card').count(),1);
 assert.equal(await page.locator('#membership canvas').count(),1);
 await page.getByRole('button',{name:'01 Basic'}).click();
 await page.getByRole('button',{name:'03 Elite'}).click();
 await page.getByRole('button',{name:'02 Pro'}).click();
 await page.getByRole('button',{name:'03 Elite'}).click();
 await page.locator('#membership[data-selected-plan="elite"][data-revealed="true"]').waitFor({timeout:15000});
 assert.match(await page.locator('.vault-interior-card').innerText(),/ELITE/);
 await page.getByRole('button',{name:'ENQUIRE ABOUT ELITE'}).click();
 await page.locator('.trial-dialog').waitFor({state:'visible'});
 assert.match(await page.locator('.trial-membership-plan').innerText(),/Elite/);
 await page.getByRole('button',{name:'Close trial enquiry'}).click();
 await page.getByRole('button',{name:'Close vault',exact:true}).click();
 assert.equal(await page.locator('#membership').getAttribute('data-selected-plan'),'none');
 await page.emulateMedia({reducedMotion:'reduce'});
 const basic=page.getByRole('button',{name:'01 Basic'}); await basic.focus(); await page.keyboard.press('Enter');
 await page.locator('#membership[data-selected-plan="basic"][data-revealed="true"]').waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('#membership').evaluate(el=>el.scrollIntoView());
 await page.getByRole('button',{name:'02 Pro'}).click();
 try { await page.locator('#membership[data-selected-plan="pro"][data-revealed="true"]').waitFor({timeout:15000}); }
 catch (error) { console.log(await page.locator('#membership').evaluate(e=>({data:{...e.dataset},rect:e.getBoundingClientRect().toJSON(),text:e.innerText}))); await page.screenshot({path:'qa/vault-mobile-failure.png'}); throw error; }
 await page.locator('#membership').screenshot({path:'qa/vault-mobile-open.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile no overflow');
 await page.setViewportSize({width:320,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px no overflow');
 await page.locator('#membership canvas').evaluate(c=>c.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
 await page.locator('#membership[data-locker-status="error"]').waitFor();
 await page.getByRole('button',{name:'03 Elite'}).click();
 await page.getByRole('button',{name:'ENQUIRE ABOUT ELITE'}).click();
 await page.locator('.trial-dialog').waitFor({state:'visible'});
 assert.deepEqual(errors,[]);
 fs.writeFileSync('qa/vault-result.json',JSON.stringify({passed:true,checks:['desktop 3D render','opening and interior','all plans','rapid switching','selected enquiry','close','keyboard','reduced motion','390px and 320px layouts','WebGL fallback'],errors},null,2));
 console.log('VERDICT: PASS');
}finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('VERDICT: FAIL -- '+e.message);process.exitCode=1;});
