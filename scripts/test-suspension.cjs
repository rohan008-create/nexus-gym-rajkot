const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const THREE = require('three');
const code = ts.transpileModule(fs.readFileSync('src/components/intro/suspensionMotion.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'exports', code)(require, loaded.exports);
const { createSuspension, stepSuspension } = loaded.exports;
for (const fps of [30, 60, 120]) {
  const anchor = new THREE.Vector3(0, 10, 0), end = new THREE.Vector3(0, 2.76, 0);
  const sim = createSuspension(anchor, end);
  let bend = 0;
  for (let frame = 0; frame < fps * 12; frame++) {
    const time = frame / fps;
    end.set(Math.sin(time * 2) * .95, 2.76 - (time < 6 ? .75 * Math.sin(time) ** 2 : 0), 0);
    stepSuspension(sim, end, frame % 47 === 0 ? .5 : 1 / fps, time);
    assert.ok(sim.nodes[0].equals(anchor), 'ceiling must never move');
    assert.ok(sim.nodes.at(-1).equals(end), 'strap must stay attached to bag');
    sim.nodes.forEach((p, i) => {
      assert.ok(Number.isFinite(p.length()) && p.length() < 15, 'bounded during pull and frame stalls');
      bend = Math.max(bend, p.distanceTo(anchor.clone().lerp(end, i / 9)));
    });
  }
  assert.ok(bend > .015, 'strap must bend rather than act as a rigid line');
  end.set(0, 2.76, 0);
  for (let i = 0; i < fps * 5; i++) stepSuspension(sim, end, 1 / fps, 12 + i / fps);
  assert.ok(Math.max(...sim.nodes.map(p => Math.abs(p.x))) < .18, 'released strap settles');
  stepSuspension(sim, end, 1 / fps, 20, true);
  sim.nodes.forEach((p, i) => assert.ok(p.distanceTo(anchor.clone().lerp(end, i / 9)) < 1e-10, 'reduced motion stays still'));
}
console.log('VERDICT: PASS -- fixed anchor, bag attachment, elastic bend, frame stalls, settling, reduced motion at 30/60/120fps');
