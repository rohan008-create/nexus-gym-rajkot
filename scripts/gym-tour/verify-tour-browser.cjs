// Browser integration checks for the Phase 2 tour, using an isolated CLI session.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
let session=process.env.AB_SESSION||'nexus-tour-qa';const base=process.env.TOUR_TEST_URL||'http://localhost:3000';
const out=path.resolve(process.env.TOUR_TEST_OUTPUT||'artifacts/gym-tour/phase2');fs.mkdirSync(out,{recursive:true});
const reportFile=path.join(out,process.env.TOUR_REPORT_LABEL?'browser-'+process.env.TOUR_REPORT_LABEL+'.json':'browser-checks.json');
const report={capturedAt:new Date().toISOString(),base,checks:[],viewports:[],errors:[],limitations:['Viewport tests use desktop Chrome; true touch emulation is a separate check. No physical-phone or guaranteed-FPS claim.']};
function ab(...args){let raw;try{raw=execFileSync('agent-browser',['--session',session,'--headed','--json',...args],{encoding:'utf8',timeout:150000,maxBuffer:8*1024*1024});}catch(e){throw Error([e.message,e.stdout,e.stderr].filter(Boolean).join('\n'));}const result=JSON.parse(raw);if(!result.success)throw Error(JSON.stringify(result));return result.data;}
function js(code){return ab('eval',code).result;}
function check(label,value){assert.ok(value,label);report.checks.push(label);}
function wait(code){ab('wait','--fn',code);}
function go(progress){const index=progress<.1?0:progress<.45?1:progress<.8?2:3;const expected=[0,.28,.64,1][index];ab('click',`#home .gym-tour-stops button:nth-child(${index+1})`);try{wait(`Math.abs(Number(document.getElementById('home').dataset.tourProgress)-${expected})<.04`)}catch(error){throw Error(error.message+'\nScroll diagnostic: '+JSON.stringify(js(`({y:scrollY,progress:document.getElementById('home').dataset.tourProgress,height:document.getElementById('home').offsetHeight,viewport:innerHeight})`)))}}
try{
 const cases=[['desktop',1440,900],['wide-desktop',1920,1080],['tablet',768,1024],['mobile',390,844]].filter(item=>!process.env.TOUR_TEST_VIEWPORTS||process.env.TOUR_TEST_VIEWPORTS.split(',').includes(item[0]));
 for(const [name,width,height] of cases){
  ab('open',`${base}/hero`);ab('set','viewport',String(width),String(height));
  wait(`innerWidth===${width}&&innerHeight===${height}`);
  wait(`document.getElementById('home')?.dataset.tourStatus==='ready'`);
  check(`${name}: no horizontal overflow`,js('document.documentElement.scrollWidth<=innerWidth'));
  check(`${name}: one hero canvas`,js('document.querySelectorAll("#home canvas").length===1'));
  const beats=[];
  for(const [p,beat] of [[0,'exterior'],[.32,'entry'],[.68,'strength'],[.99,'cardio']]){
   go(p);wait(`document.getElementById('home').dataset.tourBeat===${JSON.stringify(beat)}`);
   beats.push(js(`({beat:document.getElementById('home').dataset.tourBeat,progress:Number(document.getElementById('home').dataset.tourProgress)})`));
   js('new Promise(resolve=>setTimeout(resolve,1200))'); // let the camera spring settle before visual capture
   ab('screenshot',path.join(out,`${name}-${beat}.png`));
  }
  go(0);wait(`document.getElementById('home').dataset.tourBeat==='exterior'`);
  check(`${name}: four stops and reverse scroll`,true);
  if(name==='desktop'){ab('scroll','down','400');wait(`Number(document.getElementById('home').dataset.tourProgress)>.02`);go(0);check('native desktop wheel scroll drives tour',true);}
  if(name==='desktop'){
   const draws=js(`(async()=>{await new Promise(r=>setTimeout(r,1800));const gl=document.querySelector('#home canvas').getContext('webgl2');const original=gl.drawElements;let count=0;gl.drawElements=function(...args){count++;return original.apply(this,args)};try{await new Promise(r=>setTimeout(r,800));return count}finally{gl.drawElements=original}})()`);
   check('tour renderer settles without continuous idle draw calls',draws===0);
  }
  ab('click','[data-tour-trial]');wait(`!!document.querySelector('.trial-dialog[open], [role=dialog] #trial-enquiry-form')`);
  ab('press','Escape');wait(`!document.querySelector('.trial-dialog[open], [role=dialog] #trial-enquiry-form')`);
  check(`${name}: natural pointer trial CTA and Escape close`,true);
  if(js(`getComputedStyle(document.querySelector('.menu-toggle')).display!=='none'`))ab('click','.menu-toggle');
  ab('click','.nav-links a[href="#programs"]');wait(`Math.abs(document.getElementById('programs').getBoundingClientRect().top)<180`);
  check(`${name}: Programs navigation bypasses tour`,true);
  wait(`Number(getComputedStyle(document.querySelector('.programs-heading')).opacity)>.9`);
  check(`${name}: Programs reveal retained`,true);
  js(`document.getElementById('about').scrollIntoView({behavior:'instant'})`);
  wait(`Number(getComputedStyle(document.querySelector('.about-line > span')).opacity)>.9`);
  ab('screenshot',path.join(out,`${name}-about.png`));
  check(`${name}: About reveal retained`,true);
  report.viewports.push({name,width,height,beats});
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
  console.log(`Verified ${name}`);
 }
 if(process.env.TOUR_TEST_EXTRAS!=='0'){
 // Confirm the actual home-page entrance contract, not just the preview route.
 ab('set','viewport','1440','900');ab('open',base);
 wait(`document.querySelector('.entrance-skip')&&!document.querySelector('.entrance-skip').disabled`);
 if(process.env.EXPECT_DETAILED_INTERIOR==='1'){report.interiorBeforeEntry=js(`({source:document.querySelector('#home canvas')?.getAttribute('data-interior-source'),requested:performance.getEntriesByType('resource').some(entry=>entry.name.endsWith('/models/nexus-gym/interior.glb'))})`);check('interior asset stays deferred behind noninteractive intro',!report.interiorBeforeEntry.requested);}
 ab('click','.entrance-skip');wait(`document.querySelector('.nexus-entrance')?.dataset.entrance==='revealed'`);
 wait(`document.getElementById('home')?.dataset.tourStatus==='ready'`);
 report.entryFocusBeforeWait=js(`({stage:document.querySelector('.nexus-entrance')?.getAttribute('data-entrance'),heading:!!document.getElementById('hero-title'),active:document.activeElement?.tagName,activeId:document.activeElement?.id,inert:document.querySelector('.entrance-landing')?.inert,overflow:document.body.style.overflow})`);
 try{wait(`document.activeElement?.id==='hero-title'&&!document.querySelector('.entrance-landing').inert&&document.body.style.overflow!=='hidden'`);}catch(error){report.entryFocusAfterWait=js(`({stage:document.querySelector('.nexus-entrance')?.getAttribute('data-entrance'),heading:!!document.getElementById('hero-title'),active:document.activeElement?.tagName,activeId:document.activeElement?.id,inert:document.querySelector('.entrance-landing')?.inert,overflow:document.body.style.overflow})`);throw error;}
 check('intro entry unlocks landing and focuses hero title',js(`!document.querySelector('.entrance-landing').inert&&document.activeElement?.id==='hero-title'&&document.body.style.overflow!=='hidden'`));
 ab('set','media','dark','reduced-motion');ab('open',`${base}/hero`);
 wait(`matchMedia('(prefers-reduced-motion:reduce)').matches&&!!document.getElementById('home')`);
 check('reduced motion uses short readable hero',js(`document.getElementById('home').offsetHeight<=innerHeight*1.5&&getComputedStyle(document.getElementById('hero-title')).visibility!=='hidden'`));
 ab('screenshot',path.join(out,'reduced-motion.png'));
 // A fresh session resets reduced-motion overrides before the GPU-loss case.
 report.preContextLossBrowserErrors=ab('errors');
 check('no uncaught errors before context-loss case',!report.preContextLossBrowserErrors.errors?.length);
 ab('close');session+='-gpu-loss';ab('open',`${base}/hero`);wait(`document.getElementById('home')?.dataset.tourStatus==='ready'`);
 if(process.env.EXPECT_DETAILED_EXTERIOR==='1')wait(`document.querySelector('#home canvas')?.getAttribute('data-exterior-source')==='detailed'`);
 if(process.env.EXPECT_DETAILED_INTERIOR==='1'){go(.32);wait(`document.querySelector('#home canvas')?.getAttribute('data-interior-source')==='detailed'`);go(.68);js('new Promise(resolve=>setTimeout(resolve,1000))');go(0);}
 js('new Promise(resolve=>setTimeout(resolve,1500))'); // inject loss after asset swap/shader initialization, not during renderer startup
 js(`(()=>{const canvas=document.querySelector('#home canvas');const gl=canvas.getContext('webgl2');const lose=gl.getExtension('WEBGL_lose_context');if(!lose)throw Error('WebGL loss extension unavailable');lose.loseContext()})()`);
 wait(`document.getElementById('home').dataset.tourStatus==='error'`);
 check('WebGL loss leaves a short usable fallback',js(`document.getElementById('home').offsetHeight<=innerHeight*1.5&&!!document.querySelector('[data-tour-trial]')`));
 ab('click','[data-tour-trial]');wait(`!!document.querySelector('.trial-dialog[open], [role=dialog] #trial-enquiry-form')`);ab('press','Escape');
 ab('screenshot',path.join(out,'webgl-fallback.png'));
 check('fallback CTA remains usable',true);
 }
 report.browserErrors=ab('errors');
 report.browserConsole=ab('console');
 check('no uncaught browser errors',!report.browserErrors.errors?.length);
 report.passed=true;console.log('VERDICT: PASS');
}catch(error){report.passed=false;report.errors.push(error.message);console.error('VERDICT: FAIL --',error.message);process.exitCode=1;}
finally{fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');try{ab('close')}catch{}}
