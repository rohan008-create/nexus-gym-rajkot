const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
const session=process.env.AB_SESSION||'nexus-exterior-phase3';const base=process.env.TOUR_TEST_URL||'http://localhost:3000';const out=path.resolve('artifacts/gym-tour/phase3');fs.mkdirSync(out,{recursive:true});
const report={checks:[],errors:[],mode:'headed Chromium viewport checks; physical-mobile performance not certified'};
function ab(...args){let raw;try{raw=execFileSync('agent-browser',['--session',session,'--headed','--json',...args],{encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});}catch(e){throw Error([e.message,e.stdout,e.stderr].filter(Boolean).join('\n'));}const value=JSON.parse(raw);if(!value.success)throw Error(JSON.stringify(value));return value.data;}
function js(code){return ab('eval',code).result;}function wait(code){ab('wait','--fn',code);}function check(label,condition){assert.ok(condition,label);report.checks.push(label);}
const source=()=>js(`document.querySelector('#home canvas')?.getAttribute('data-exterior-source')`);
try{
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  ab('open',`${base}/hero`);ab('set','viewport',String(width),String(height));wait(`innerWidth===${width}&&innerHeight===${height}`);
  wait(`document.getElementById('home')?.dataset.tourStatus==='ready'`);wait(`document.querySelector('#home canvas')?.getAttribute('data-exterior-source')==='detailed'`);
  ab('click','.gym-tour-stops button:nth-child(1)');wait(`document.getElementById('home').dataset.tourBeat==='exterior'`);js('new Promise(r=>setTimeout(r,1000))');
  check(`${name}: detailed model and responsive layout`,source()==='detailed'&&js('document.documentElement.scrollWidth<=innerWidth'));
  ab('screenshot',path.join(out,`${name}-exterior.png`));
  ab('click','.gym-tour-stops button:nth-child(2)');wait(`document.getElementById('home').dataset.tourBeat==='entry'`);js('new Promise(r=>setTimeout(r,1000))');
  ab('screenshot',path.join(out,`${name}-entrance.png`));
  check(`${name}: entrance shot uses detailed model`,source()==='detailed');
 }
 ab('network','route','**/models/nexus-gym/exterior.glb','--abort');
 ab('open',`${base}/hero`);wait(`document.getElementById('home')?.dataset.tourStatus==='ready'`);wait(`document.querySelector('#home canvas')?.getAttribute('data-exterior-source')==='fallback'`);
 js('new Promise(r=>setTimeout(r,1500))');
 check('failed optional model preserves ready procedural scene',js(`document.getElementById('home').dataset.tourStatus==='ready'&&document.querySelector('#home canvas')?.getAttribute('data-exterior-source')==='fallback'`));
 ab('click','[data-tour-trial]');wait(`!!document.querySelector('.trial-dialog[open], [role=dialog] #trial-enquiry-form')`);ab('press','Escape');check('asset failure leaves trial CTA usable',true);
 ab('screenshot',path.join(out,'asset-fallback.png'));
 ab('network','unroute');ab('open',`${base}/hero`);wait(`document.querySelector('#home canvas')?.getAttribute('data-exterior-source')==='detailed'`);check('detailed asset recovers after network restoration and reload',true);
 report.browserErrors=ab('errors');check('no uncaught browser errors',!report.browserErrors.errors?.length);
 report.passed=true;console.log(JSON.stringify(report));console.log('VERDICT: PASS');
}catch(error){report.passed=false;report.errors.push(error.message);console.error('VERDICT: FAIL --',error.message);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'exterior-browser.json'),JSON.stringify(report,null,2)+'\n');try{ab('network','unroute');ab('close')}catch{}}
