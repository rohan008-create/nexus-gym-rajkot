// Uses an isolated agent-browser session. Does not modify application source.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const session = process.env.AB_SESSION || 'nexus-gym-phase1-baseline';
const base = process.env.BASELINE_URL || 'http://localhost:3000';
const out = path.resolve(process.env.BASELINE_OUTPUT || 'qa/gym-tour-phase1/baseline');
fs.mkdirSync(out, { recursive: true });
const report = { capturedAt: new Date().toISOString(), base, environment: 'development server; browser viewport emulation, not physical mobile hardware', conditions: 'fresh navigation per viewport, shared browser cache; no controlled network/CPU throttling; not a cold-cache benchmark', viewports: [], checks: [], limitations: [], errors: [] };
function ab(...args) {
  let raw;
  try { raw = execFileSync('agent-browser', ['--session', session, '--headed', '--json', ...args], { encoding: 'utf8', timeout: 150000, maxBuffer: 10 * 1024 * 1024 }); } catch (error) { throw Error([error.message, error.stdout, error.stderr].filter(Boolean).join('\n')); }
  const result = JSON.parse(raw);
  if (!result.success) throw Error(JSON.stringify(result));
  return result.data;
}
function evaluate(code) { return ab('eval', code).result; }
function check(name, result) { report.checks.push({ name, passed: Boolean(result) }); }
function sample() {
  return evaluate(`(async () => {
    const tasks = [], frames = []; let last = 0;
    const observer = new PerformanceObserver(list => list.getEntries().forEach(e => tasks.push({start: e.startTime, duration: e.duration})));
    observer.observe({type:'longtask',buffered:false});
    const start = performance.now();
    await new Promise(resolve => { function frame(t) { if(last) frames.push(t-last); last=t; if(t-start<2500) requestAnimationFrame(frame); else resolve(); } requestAnimationFrame(frame); });
    observer.disconnect(); const sorted=[...frames].sort((a,b)=>a-b);
    const percentile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))] ?? null;
    const canvas=document.querySelector('.iron-world-scene canvas'); const gl=canvas?.getContext('webgl2'); const ext=gl?.getExtension('WEBGL_debug_renderer_info');
    return {sampleMs:performance.now()-start,frameCount:frames.length,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),framesOver50Ms:frames.filter(n=>n>50).length,longTasks:tasks,renderer:gl?(ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):null,documentHidden:document.hidden};
  })()`);
}
try {
  if (process.env.BASELINE_SKIP_INTRO !== '1') {
  ab('open', base);
  ab('wait', '--fn', '!!document.querySelector(".intro")');
  try { ab('wait', '--fn', 'document.querySelector(".intro")?.dataset.ready === "true" || !!document.querySelector(".intro [role=alert]")'); } catch { report.limitations.push('Intro readiness timed out; capture its current state and test skip independently.'); }
  report.intro = evaluate(`({ready:document.querySelector('.intro')?.dataset.ready,error:document.querySelector('.intro [role=alert]')?.textContent||null})`);
  if (report.intro.error || report.intro.ready !== 'true') report.limitations.push('Intro was not confirmed ready at baseline; normal punching/explosion cannot be certified from this run.');
  ab('screenshot', path.join(out, 'intro.png'));
  ab('wait', '--fn', 'document.querySelector(".entrance-skip") && !document.querySelector(".entrance-skip").disabled');
  ab('click', '.entrance-skip');
  ab('wait', '--fn', 'document.querySelector(".nexus-entrance")?.dataset.entrance === "revealed"');
  check('intro skip releases landing and scroll lock', evaluate(`!document.querySelector('.entrance-landing').inert && document.body.style.overflow !== 'hidden'`));
  // Focus is checked after the entrance RAF has run.
  try { ab('wait', '--fn', 'document.activeElement?.id === "hero-title"'); } catch { report.limitations.push('Existing intro skip did not focus hero-title within timeout; preserve this as a baseline issue.'); }
  check('intro skip focuses hero-title', evaluate('document.activeElement?.id === "hero-title"'));
  } else { report.limitations.push('Intro capture skipped in this responsive sweep; see the separately retained intro observation.'); }
  for (const [name, width, height] of [['desktop',1440,900],['wide-desktop',1920,1080],['tablet',768,1024],['mobile',390,844]]) {
    ab('set','viewport',String(width),String(height));
    const trace = name==='desktop' && process.env.BASELINE_TRACE !== '0';
    if(trace) ab('trace','start');
    ab('open', `${base}/hero`);
    ab('wait','--fn','document.querySelector("[data-rope-status]")?.dataset.ropeStatus === "ready" || document.querySelector("[data-rope-status]")?.dataset.ropeStatus === "error"');
    ab('wait','--fn','getComputedStyle(document.querySelector(".hero-actions")).opacity === "1"');
    const geometry=evaluate(`({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,userAgent:navigator.userAgent,coarsePointer:matchMedia('(pointer:coarse)').matches,status:document.querySelector('[data-rope-status]').dataset.ropeStatus,overflow:document.documentElement.scrollWidth>innerWidth,heading:document.querySelector('#hero-title').getBoundingClientRect().toJSON(),nav:document.querySelector('.site-nav').getBoundingClientRect().toJSON(),sectionIds:[...document.querySelectorAll('main section[id]')].map(e=>e.id),navigation:performance.getEntriesByType('navigation').map(e=>({duration:e.duration,domContentLoaded:e.domContentLoadedEventEnd}))})`);
    const performanceSample=sample();
    ab('screenshot',path.join(out,`${name}-hero.png`));
    if(trace) ab('trace','stop',path.join(out,'desktop.trace.json'));
    check(`${name}: no horizontal overflow`, !geometry.overflow);
    check(`${name}: hero scene ready`, geometry.status==='ready');
    ab('click','.hero-actions .primary-cta');
    try { ab('wait','--fn','document.querySelector(".trial-dialog")?.open'); } catch { report.limitations.push(`${name}: trial dialog did not open within timeout.`); }
    check(`${name}: trial dialog opens`,evaluate(`document.querySelector('.trial-dialog')?.open`));
    ab('press','Escape');
    ab('wait','--fn','!document.querySelector(".trial-dialog")?.open');
    check(`${name}: trial dialog closes`,evaluate(`!document.querySelector('.trial-dialog')?.open`));
    // Check existing navigation as-is, including current Location behavior.
    const destinations=[];
    report.viewports.push({name,...geometry,performanceSample,destinations});
    fs.writeFileSync(path.join(out,'baseline.json'),JSON.stringify(report,null,2)+'\n');
    for(const [label,href,target] of [['About','#about','about'],['Programs','#programs','programs'],['Plans','#membership','membership'],['Location','#about','about'],['Home','#home','home']]) {
      if(evaluate(`getComputedStyle(document.querySelector('.menu-toggle')).display !== 'none'`)) ab('click','.menu-toggle');
      ab('click',`.nav-links a[href="${href}"]${label==='Location'?':last-of-type':label==='About'?':nth-of-type(2)':''}`);
      try { ab('wait','--fn',`Math.abs(document.getElementById(${JSON.stringify(target)}).getBoundingClientRect().top)<180`); } catch { report.limitations.push(`${name}: ${label} did not settle at the expected target within the wait timeout.`); }
      destinations.push({label,target,...evaluate(`({top:document.getElementById(${JSON.stringify(target)}).getBoundingClientRect().top,active:document.querySelector('.nav-links a[aria-current="page"]')?.textContent})`)});
    }
    check(`${name}: navigation links land at existing destinations`,destinations.every(d=>Math.abs(d.top)<180));
    evaluate(`document.getElementById('about').scrollIntoView({behavior:'instant'})`);
    ab('wait','--fn','Math.abs(document.getElementById("about").getBoundingClientRect().top)<180');
    ab('screenshot',path.join(out,`${name}-about.png`));
    evaluate(`document.getElementById('programs').scrollIntoView({behavior:'instant'})`);
    ab('wait','--fn','Math.abs(document.getElementById("programs").getBoundingClientRect().top)<180');
    ab('screenshot',path.join(out,`${name}-programs.png`));
    fs.writeFileSync(path.join(out,'baseline.json'),JSON.stringify(report,null,2)+'\n');
    console.log(`Captured ${name}: p95 ${performanceSample.p95Ms?.toFixed(1)} ms, ${performanceSample.renderer}`);
  }
  report.browserErrors=ab('errors');
  report.limitations.push('Per-frame draw calls/triangles and actual-device mobile performance were not instrumented; no application instrumentation was added.');
  report.functionalChecksPassed = report.checks.every(check => check.passed);
  console.log('Baseline collection completed; site check results recorded separately: ' + report.functionalChecksPassed);
  console.log('VERDICT: PASS');
} catch(error) {
  report.errors.push(error.message);
  console.error('VERDICT: FAIL -- baseline capture incomplete:',error.message);
  process.exitCode=1;
} finally {
  fs.writeFileSync(path.join(out,'baseline.json'),JSON.stringify(report,null,2)+'\n');
  try { ab('close'); } catch {}
}
