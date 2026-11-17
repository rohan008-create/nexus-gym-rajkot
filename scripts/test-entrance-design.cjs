const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const sharp=require('sharp');
const fs=require('node:fs');
(async()=>{
 for(const file of ['dumbbells-cutout.webp','kettlebell-gloves-cutout.webp']) {
  const p='public/assets/entrance/'+file; const m=await sharp(p).metadata(); const s=await sharp(p).stats();
  assert.equal(m.hasAlpha,true); assert.equal(s.channels[3].min,0);
 }
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--enable-webgl','--use-angle=d3d11']});
 const errors=[]; const checks=[];
 try{
  for(const config of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844,mobile:true},{name:'reduced',width:320,height:740,mobile:true,reduced:true}]){
   const page=await browser.newPage({viewport:{width:config.width,height:config.height},isMobile:!!config.mobile,hasTouch:!!config.mobile,reducedMotion:config.reduced?'reduce':'no-preference'});
   page.on('pageerror',e=>errors.push(e.message));
   const loaded=new Set(); page.on('response',r=>{if(r.url().includes('/assets/entrance/')){if(r.status()!==200 && r.status()!==304) errors.push('Asset HTTP '+r.status()+' '+r.url());loaded.add(r.url().split('/').at(-1));}});
   await page.goto('http://127.0.0.1:3000',{timeout:90000});
   await page.locator('.intro[data-ready="true"]').waitFor({timeout:60000});
   await page.locator('.entrance-skip:not(:disabled)').waitFor({timeout:60000});
   await page.waitForTimeout(1400);
   assert.equal(loaded.size,3,'all generated assets loaded');
   assert.equal(await page.locator('.sound-control').count(),0);
   assert.ok(await page.locator('.entrance-brand').isVisible());
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:'qa/entrance-red-'+config.name+'.png'});
   await page.mouse.click(15,150);
   assert.equal(await page.locator('.nexus-entrance').getAttribute('data-entrance'),'waiting');
   const box=await page.locator('.intro canvas').boundingBox();
   if(config.mobile) await page.touchscreen.tap(box.x+box.width*.5,box.y+box.height*.51);
   else await page.mouse.click(box.x+box.width*.5,box.y+box.height*.51);
   await page.locator('[data-entrance="breaking"]').waitFor();
   if(!config.reduced){await page.waitForTimeout(700);await page.screenshot({path:'qa/entrance-red-'+config.name+'-breaking.png'});}
   await page.locator('[data-entrance="revealed"]').waitFor({timeout:15000});
   assert.equal(await page.locator('.intro').count(),0);
   assert.equal(await page.locator('.entrance-landing').evaluate(e=>e.inert),false);
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
   checks.push(config.name+' render, assets, tap, transition and disposal');
   if(config.name==='reduced'){
    await page.reload();await page.locator('.entrance-skip:not(:disabled)').waitFor({timeout:60000});
    await page.getByRole('button',{name:'ENTER NEXUS'}).click();
    await page.locator('[data-entrance="revealed"]').waitFor();checks.push('skip button');
   }
   await page.close();
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync('qa/entrance-red-result.json',JSON.stringify({passed:true,checks,errors},null,2));
  console.log('VERDICT: PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);console.log('VERDICT: FAIL -- '+e.message);process.exitCode=1;});
