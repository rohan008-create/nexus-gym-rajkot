const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
const session=process.env.AB_SESSION||'nexus-interior-phase4';const base=process.env.TOUR_TEST_URL||'http://localhost:3000';const out=path.resolve('artifacts/gym-tour/phase4');fs.mkdirSync(out,{recursive:true});
const mode=process.env.INTERIOR_TEST_MODE||'all';const reportFile=path.join(out,mode==='all'?'interior-browser.json':`interior-${mode}.json`);
const report={checks:[],errors:[],mode:'headed Chromium viewport checks; not physical-phone performance'};
function ab(...args){let raw;try{raw=execFileSync('agent-browser',['--session',session,'--headed','--json',...args],{encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});}catch(e){throw Error([e.message,e.stdout,e.stderr].filter(Boolean).join('\n'));}const value=JSON.parse(raw);if(!value.success)throw Error(JSON.stringify(value));return value.data;}
function js(code){return ab('eval',code).result;}function wait(code){ab('wait','--fn',code);}function check(label,value){assert.ok(value,label);report.checks.push(label);fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');}
function stop(index,beat){ab('click',`.gym-tour-stops button:nth-child(${index})`);try{wait(`document.getElementById('home').dataset.tourBeat===${JSON.stringify(beat)}`)}catch(error){report.scrollDiagnostic=js(`({y:scrollY,progress:document.getElementById('home')?.getAttribute('data-tour-progress'),beat:document.getElementById('home')?.getAttribute('data-tour-beat'),height:document.getElementById('home')?.offsetHeight,viewport:innerHeight,url:location.href})`);throw error}js('new Promise(r=>setTimeout(r,1200))');}
try{
 if(mode!=='failure'){
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  ab('open',`${base}/hero`);ab('set','viewport',String(width),String(height));wait(`innerWidth===${width}&&innerHeight===${height}`);wait(`document.getElementById('home')?.dataset.tourStatus==='ready'`);
  wait(`document.querySelector('#home canvas')?.getAttribute('data-interior-source')==='detailed'`);js('document.fonts.ready');js('new Promise(r=>setTimeout(r,600))');stop(2,'entry');
  stop(3,'strength');check(`${name}: detailed interior and no horizontal overflow`,js(`document.querySelector('#home canvas').getAttribute('data-interior-source')==='detailed'&&document.documentElement.scrollWidth<=innerWidth`));ab('screenshot',path.join(out,`${name}-strength.png`));
  stop(4,'cardio');ab('screenshot',path.join(out,`${name}-cardio.png`));check(`${name}: detailed cardio shot reached`,true);
  stop(1,'exterior');wait(`document.querySelector('#home canvas')?.getAttribute('data-exterior-source')==='detailed'`);check(`${name}: detailed exterior retained on return`,true);
 }
 }
 if(mode!=='views'){
 ab('network','requests','--clear');ab('network','route','**/models/nexus-gym/interior.glb','--abort');ab('open',`${base}/hero`);wait(`document.getElementById('home')?.dataset.tourStatus==='ready'`);js('document.fonts.ready');js('new Promise(r=>setTimeout(r,700))');stop(2,'entry');js('new Promise(r=>setTimeout(r,1600))');stop(3,'strength');
 check('failed interior download preserves ready fallback',js(`document.querySelector('#home canvas')?.getAttribute('data-interior-source')==='fallback'&&document.getElementById('home').dataset.tourStatus==='ready'`));
 report.blockedModelRequests=ab('network','requests','--filter','interior.glb');
 check('interior request was attempted under interception',report.blockedModelRequests.requests?.length>0);
 ab('click','[data-tour-trial]');wait(`!!document.querySelector('.trial-dialog[open], [role=dialog] #trial-enquiry-form')`);ab('press','Escape');check('fallback trial CTA stays usable',true);ab('screenshot',path.join(out,'interior-fallback.png'));
 ab('network','unroute');ab('open',`${base}/hero`);wait(`document.getElementById('home')?.dataset.tourStatus==='ready'`);stop(2,'entry');wait(`document.querySelector('#home canvas')?.getAttribute('data-interior-source')==='detailed'`);check('interior asset recovers after restoration and reload',true);
 }
 report.browserErrors=ab('errors');check('no uncaught browser errors',!report.browserErrors.errors?.length);report.passed=true;console.log(JSON.stringify({checks:report.checks,passed:true}));console.log('VERDICT: PASS');
}catch(error){report.passed=false;report.errors.push(error.message);console.error('VERDICT: FAIL --',error.message);process.exitCode=1;}
finally{fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');try{ab('network','unroute');ab('close')}catch{}}
