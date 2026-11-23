const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-webgl','--use-angle=d3d11']});
 try {
 for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let release;const gate=new Promise(r=>release=r);
 if(!mobile)await page.route('**/models/nexus-gym/exterior.glb',async route=>{await gate;await route.continue()});
 await page.goto('http://localhost:3001',{waitUntil:'domcontentloaded',timeout:90000});
 if(!mobile){
 await page.waitForTimeout(11000);
 console.log('DELAY',await page.evaluate(()=>({status:document.querySelector('#home')?.dataset,canvas:document.querySelector('#home canvas')?.dataset,skip:document.querySelector('.entrance-skip')?.outerHTML})),errors); assert.equal(await page.locator('.entrance-skip').isDisabled(),true,'10s cannot bypass model readiness');
 assert.equal(await page.locator('.nexus-entrance').getAttribute('data-entrance'),'waiting');release();
 }
 await page.locator('.entrance-skip:not(:disabled)').waitFor({timeout:90000}); console.log(await page.evaluate(()=>({status:document.querySelector('#home')?.dataset,canvas:document.querySelector('#home canvas')?.dataset,alert:document.querySelector('[role=alert]')?.textContent})),errors);
 await page.locator('#home canvas[data-exterior-source="detailed"][data-interior-source="detailed"]').waitFor({timeout:60000,state:'attached'});
 await page.locator('.intro[data-ready="true"]').waitFor({timeout:60000});
 if(mobile)await page.locator('.entrance-skip').click();
 else{const box=await page.locator('.intro canvas').boundingBox();await page.mouse.click(box.width/2,box.height*.51);}
 await page.locator('[data-entrance="revealed"]').waitFor({timeout:15000});
 assert.equal(await page.locator('#home canvas').getAttribute('data-exterior-source'),'detailed');
 assert.equal(await page.locator('#home').getAttribute('data-tour-status'),'ready');
 await page.screenshot({path:'artifacts/model-reveal/'+(mobile?'mobile':'desktop')+'.png'});
 assert.deepEqual(errors,[]);await page.close();
 }
 console.log('VERDICT: PASS -- delayed model stays behind bag past 10 seconds; desktop break and mobile skip reveal detailed models; no runtime errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});




