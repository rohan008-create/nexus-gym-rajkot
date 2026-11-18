const fs = require('node:fs');
const assert = require('node:assert/strict');
const read = name => JSON.parse(fs.readFileSync(`docs/gym-tour/${name}.json`,'utf8'));
const layout=read('layout'), cameras=read('cameras'), assets=read('assets');
assert.equal(layout.coordinates.up,'+Y');
assert.equal(layout.coordinates.units,'metres');
const ids = new Set();
for(const zone of layout.zones){
  assert.ok(!ids.has(zone.id));ids.add(zone.id);
  assert.equal(zone.center.length,3);
  assert.equal(zone.center[1],layout.coordinates.gymFloorY);
  const [x,,z]=zone.center,[w,d]=zone.footprint;
  assert.ok(x-w/2>=layout.shell.xBounds[0] && x+w/2<=layout.shell.xBounds[1],`${zone.id}: width out of bounds`);
  assert.ok(z-d/2>=layout.shell.zBounds[0] && z+d/2<=layout.shell.zBounds[1],`${zone.id}: depth out of bounds`);
}
for(let i=0;i<layout.zones.length;i++)for(let j=i+1;j<layout.zones.length;j++){
 const a=layout.zones[i],b=layout.zones[j];
 assert.ok(Math.abs(a.center[0]-b.center[0]) >= (a.footprint[0]+b.footprint[0])/2 || Math.abs(a.center[2]-b.center[2]) >= (a.footprint[1]+b.footprint[1])/2,`${a.id}/${b.id}: overlapping zones`);
}
const beats=[];
for(const device of ['desktop','mobile']){
 const track=cameras.tracks[device];
 assert.equal(track.length,4);assert.equal(track[0].progress,0);assert.equal(track.at(-1).progress,1);
 for(let i=0;i<track.length;i++){
  const stop=track[i];
  for(const key of ['position','target']) assert.ok(stop[key].length===3 && stop[key].every(Number.isFinite));
  assert.ok(stop.position.some((v,j)=>Math.abs(v-stop.target[j])>1e-5),'camera coincides with target');
  assert.ok(stop.fov>=30 && stop.fov<=75);
  if(i) assert.ok(stop.progress>track[i-1].progress);
  if(device==='mobile') assert.equal(stop.copySide,'bottom');
 }
 beats.push(track.map(s=>s.id));
}
assert.deepEqual(beats[0],beats[1]);
for(const id of ['branding','architecture','equipment','materials','tour-reference']) assert.ok(assets.assets.some(a=>a.id===id));
assert.ok(fs.existsSync(assets.assets.find(a=>a.id==='branding').source));
const heroFile=fs.readFileSync('src/components/hero/HeroSection.tsx','utf8');
const tourFile='src/components/hero/gym-tour/GymTourHero.tsx';
const hero=heroFile+(heroFile.includes('<GymTourHero')&&fs.existsSync(tourFile)?fs.readFileSync(tourFile,'utf8'):'');
for(const marker of ['<Navbar','<AboutNexus','<ProgramsSection','<TrialDialog','<SmoothScroll','id="home"','id="about"']) assert.ok(hero.includes(marker),`integration anchor missing: ${marker}`);
const page=fs.readFileSync('src/app/page.tsx','utf8');
for(const marker of ['hero-title','onPrepared={ready}','interactive={stage === \'revealed\'}']) assert.ok(page.includes(marker),`entrance contract missing: ${marker}`);
if(process.argv.includes('--evidence')){
 const evidence='artifacts/gym-tour/phase1/';
 const baseline=JSON.parse(fs.readFileSync(evidence+'baseline.json','utf8'));
 assert.deepEqual(baseline.viewports.map(v=>v.name),['desktop','wide-desktop','tablet','mobile']);
 assert.equal(baseline.errors.length,0,'capture infrastructure errors remain');
 for(const view of baseline.viewports){assert.ok(view.performanceSample.frameCount>0);assert.ok(Number.isFinite(view.performanceSample.p95Ms));assert.equal(view.destinations.length,5);}
 const smoke=JSON.parse(fs.readFileSync(evidence+'browser-smoke.json','utf8'));
 assert.equal(smoke.loaded,true);assert.equal(smoke.threeRevision,require('three').REVISION);assert.ok(smoke.meshes>0&&smoke.triangles>0&&smoke.drawCalls>0);
 const glb=fs.readFileSync(evidence+'smoke.glb');assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length);
 const png=fs.readFileSync(evidence+'smoke-render.png');assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),480);assert.equal(png.readUInt32BE(20),320);
}
console.log('3 non-overlapping concept zones, 8 camera stops, asset records and current integration anchors validated; camera visuals remain unvalidated.');
console.log('VERDICT: PASS');
