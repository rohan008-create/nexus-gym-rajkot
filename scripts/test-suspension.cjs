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
const { createBagMotion, stepBagMotion } = loaded.exports;
const outcomes = [];
for (const fps of [30, 60, 120]) {
  const m = createBagMotion();
  const pull = { held: true, x: .9, y: -.65, yaw: 1.8, pitch: .15 };
  for (let i = 0; i < fps; i++) stepBagMotion(m, 1 / fps, false, pull);
  assert.ok(m.x > .8 && m.y < -.55, 'bag follows a held pull');
  pull.held = false;
  let crossed = false;
  for (let i = 0; i < fps * 8; i++) {
    stepBagMotion(m, 1 / fps, false, pull);
    crossed ||= m.x < -.1;
    assert.ok(Number.isFinite(m.x + m.y + m.yaw) && Math.abs(m.x) < 1.5, 'release remains bounded');
  }
  assert.ok(crossed, 'released load swings through centre with momentum');
  outcomes.push(m.x);
  for (let i = 0; i < fps * 12; i++) stepBagMotion(m, 1 / fps, false, pull);
  assert.ok(Math.abs(m.x) < .005 && Math.abs(m.y) < .005 && Math.abs(m.yaw) < .005, 'load settles after release');
}
assert.ok(Math.max(...outcomes) - Math.min(...outcomes) < 1e-9, 'refresh rates produce identical physics');
console.log('VERDICT: PASS -- fixed anchor, attached strap, bend, stalls, reduced motion, load pull/release/settling and identical 30/60/120fps physics');
