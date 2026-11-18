const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
const moduleObject = { exports: {} };
const source = fs.readFileSync('src/components/hero/gym-tour/gymTourConfig.ts','utf8');
const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
new Function('exports', code)(moduleObject.exports);
const {sampleCamera,tourBeatAt,tourCutOpacity,settleTourFov,DESKTOP_CAMERAS,MOBILE_CAMERAS} = moduleObject.exports;
for (const mobile of [false,true]) {
  const p=[0,0,0],target=[0,0,0];let last=null;
  for(let step=0;step<=1000;step++){
    const t=step/1000,fov=sampleCamera(t,mobile,p,target);
    assert.ok(p.every(Number.isFinite)&&target.every(Number.isFinite));
    assert.ok(fov>=35&&fov<=70);
    assert.ok(p.some((v,i)=>Math.abs(v-target[i])>.1),'camera must not coincide with target');
    if(last && !(t>=.45&&t<.451)) assert.ok(p.reduce((sum,v,i)=>sum+(v-last[i])**2,0)<1,'camera must move continuously except intentional doorway cut');
    last=[...p];
  }
  const stops=mobile?MOBILE_CAMERAS:DESKTOP_CAMERAS;
  for(const stop of [stops[0],stops[2],stops.at(-1)]){
    sampleCamera(stop.at,mobile,p,target);assert.deepEqual(p,stop.position);assert.deepEqual(target,stop.target);
  }
  sampleCamera(-10,mobile,p,target);assert.deepEqual(p,stops[0].position);
  sampleCamera(10,mobile,p,target);assert.deepEqual(p,stops.at(-1).position);
}
assert.deepEqual([0,.28,.64,1].map(tourBeatAt),[0,1,2,3]);
for(const alpha of [.05,.18,1]) {
 let value=43;for(let frame=0;frame<400;frame++)value=settleTourFov(value,63,alpha);
 assert.equal(value,63,'FOV must finish exactly so demand rendering can become idle');
 assert.equal(settleTourFov(52.995,53,alpha),53,'sub-threshold FOV residual must snap');
}
assert.equal(tourCutOpacity(.45),1);assert.equal(tourCutOpacity(0),0);assert.equal(tourCutOpacity(1),0);
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
console.log('Camera sampling: finite/continuous desktop and mobile tracks, intentional cut, clamping, four beats and transition mask validated.');
console.log('VERDICT: PASS');
