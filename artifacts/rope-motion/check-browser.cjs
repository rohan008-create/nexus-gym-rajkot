const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-webgl','--use-angle=d3d11']});
 try {
 const page=await browser.newPage({viewport:{width:1100,height:850}}); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3000/intro',{timeout:90000,waitUntil:'domcontentloaded'});
 await page.locator('.intro[data-ready="true"]').waitFor({timeout:60000});
 await page.waitForTimeout(1000);
 await page.screenshot({path:'artifacts/rope-motion/idle.png'});
 await page.mouse.move(550,430); await page.mouse.down(); await page.mouse.move(650,500,{steps:20}); await page.mouse.up();
 await page.waitForTimeout(1200);
 if(await page.locator('.intro').getAttribute('data-phase')!=='IDLE')throw Error('Drag triggered explosion');
 await page.screenshot({path:'artifacts/rope-motion/released.png'});
 await page.mouse.click(550,440); await page.waitForTimeout(400);
 if(await page.locator('.intro').getAttribute('data-phase')==='IDLE')throw Error('Tap did not trigger');
 if(errors.length)throw Error(errors.join('\n'));
 console.log('VERDICT: PASS -- browser render, drag rejection, release, tap and no runtime errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
