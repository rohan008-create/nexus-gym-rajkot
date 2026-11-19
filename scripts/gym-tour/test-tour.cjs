const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const moduleObject = { exports: {} };
const source = fs.readFileSync('src/components/hero/gym-tour/gymTourConfig.ts','utf8');
const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
new Function('exports', code)(moduleObject.exports);
const {sampleCamera,tourBeatAt,advanceTour,DOORWAY,DESKTOP_CAMERAS,MOBILE_CAMERAS,sampleGuide,STAIR,stairHeight} = moduleObject.exports;
for (const mobile of [false,true]) {
  const p=[0,0,0],target=[0,0,0];let last=null;
  for(let step=0;step<=1000;step++){
    const t=step/1000,fov=sampleCamera(t,mobile,p,target);
    assert.ok(p.every(Number.isFinite)&&target.every(Number.isFinite));
    assert.ok(fov>=35&&fov<=70);
    assert.ok(p.some((v,i)=>Math.abs(v-target[i])>.1),'camera must not coincide with target');
    if(last) assert.ok(p.reduce((sum,v,i)=>sum+(v-last[i])**2,0)<1,'camera must move continuously including the doorway');
    last=[...p];
  }
  const stops=mobile?MOBILE_CAMERAS:DESKTOP_CAMERAS;
  for(const stop of stops){
    sampleCamera(stop.at,mobile,p,target);
    assert.ok(p.every((v,i)=>Math.abs(v-stop.position[i])<1e-10));
    assert.ok(target.every((v,i)=>Math.abs(v-stop.target[i])<1e-10));
  }
  sampleCamera(-10,mobile,p,target);assert.deepEqual(p,stops[0].position);
  sampleCamera(10,mobile,p,target);assert.ok(p.every((v,i)=>Math.abs(v-stops.at(-1).position[i])<1e-10));
}
assert.deepEqual([0,.28,.82,1].map(tourBeatAt),[0,1,2,3]);
for (const fps of [24, 60, 120]) {
  const playback = { progress: 0, shutter: 0 };
  for (const destination of [1, .28, DOORWAY, .64, 0]) {
    let moving = true;
    for (let frame = 0; moving && frame < fps * 2; frame++) {
      moving = advanceTour(playback, destination, 1 / fps);
      assert.equal(playback.shutter, 0, 'the continuous doorway never blacks out');
    }
    assert.equal(moving, false, 'the renderer must become idle');
    assert.deepEqual(playback, { progress: destination, shutter: 0 }, 'even a stop exactly at the doorway must clear');
  }
}
const reversal = { progress: .44, shutter: 0 };
advanceTour(reversal, .6, .03);
assert.equal(reversal.shutter, 0);
for (let frame = 0; frame < 90; frame++) {
  advanceTour(reversal, .4, 1 / 60);
  assert.ok(reversal.progress < DOORWAY, 'reversing before the cut keeps the exterior visible');
}
assert.deepEqual(reversal, { progress: .4, shutter: 0 });
const guide = { position:[0,0,0],yaw:0,stair:-1,walk:0 };
let previousGuide;
for(let frame=0;frame<=2000;frame++) {
  const p=frame/2000;
  sampleGuide(p,guide);
  assert.ok([...guide.position,guide.yaw,guide.walk].every(Number.isFinite));
  if(previousGuide) assert.ok(guide.position.reduce((sum,v,i)=>sum+(v-previousGuide[i])**2,0)<.1,'guide route has no teleports');
  if(p>=.16&&p<=.52) {
    assert.equal(guide.position[0],STAIR.x);
    assert.ok(guide.position[1]>=stairHeight(0)&&guide.position[1]<=STAIR.landingY);
  }
  previousGuide=[...guide.position];
}
assert.equal(stairHeight(-1),.189);
assert.equal(stairHeight(20),STAIR.landingY);
assert.ok(Math.abs(stairHeight(1)-stairHeight(0)-STAIR.rise)<1e-10);
for(const p of [.66,.7,.74]) {
  const position=[0,0,0],target=[0,0,0]; sampleCamera(p,false,position,target);
  assert.ok(position[0]>7.12&&position[0]<8.98&&position[1]>4.36&&position[1]<6.64,'camera fits the doorway opening');
}
const geometryModule={exports:{}};
const geometryCode=ts.transpileModule(fs.readFileSync('src/components/hero/gym-tour/buildGymGeometry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
new Function('require','exports',geometryCode)(require,geometryModule.exports);
const assets=geometryModule.exports.buildGymGeometry();
for(const view of ['exterior','interior']) {
 assert.ok(assets[view].length<=10,'merged scene must have bounded material draw calls');
 for(const part of assets[view]){assert.ok([...part.geometry.attributes.position.array].every(Number.isFinite));assert.ok(part.geometry.boundingSphere.radius>0);}
}
assets.dispose();
console.log('Merged exterior/interior geometry: bounded material buckets and finite vertices validated.');
console.log('Continuous desktop/mobile camera, open doorway clearance, reversible playback and stair guide route validated.');
console.log('VERDICT: PASS');
