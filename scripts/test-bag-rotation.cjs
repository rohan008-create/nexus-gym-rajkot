const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const THREE = require('three');
function load(path, dependencies = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('require', 'exports', js)(name => dependencies[name] ?? require(name), module.exports);
  return module.exports;
}
for (const fps of [30, 60, 120]) {
  let frame;
  const { useBagAnimation } = load('src/hooks/useBagAnimation.ts', {
    react: { useRef: current => ({ current }) },
    '@react-three/fiber': { useFrame: callback => { frame = callback; } },
    './useReducedMotion': {},
  });
  const pull = { current: { held: true, x: .8, y: -.4, yaw: 2, pitch: .18 } };
  const ref = useBagAnimation(false, false, pull); ref.current = new THREE.Group();
  for (let i = 0; i < fps * 3; i++) frame({ clock: { elapsedTime: i / fps } }, 1 / fps);
  assert.ok(Math.abs(ref.current.rotation.y - 2) < .03, 'horizontal pull must turn bag in depth');
  assert.ok(ref.current.rotation.x > .15 && ref.current.position.z > .12, 'pitch and depth respond');
  pull.current.held = false;
  for (let i = 0; i < fps * 5; i++) frame({ clock: { elapsedTime: 3 + i / fps } }, 1 / fps);
  assert.ok(Math.abs(ref.current.rotation.y) < .01 && Math.abs(ref.current.position.x) < .01, 'release settles smoothly');
  assert.ok(Math.abs(ref.current.position.y - 3.2) < .01, 'stretch recovers');
}
const { createStrap, updateStrap } = load('src/components/intro/strapGeometry.ts');
const band = createStrap(48, .21, 7.24);
const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 10, 0), new THREE.Vector3(.05, 7, .02), new THREE.Vector3(.3, 4, .1), new THREE.Vector3(.6, 2.4, .2)]);
const topAcross = new THREE.Vector3(1, 0, 0), endAcross = new THREE.Vector3(), tangent = curve.getTangent(1);
const position = band.geometry.getAttribute('position'), normal = band.geometry.getAttribute('normal');
const initialBuffer = position.array, initialIndex = band.geometry.index.array;
let previousTwist;
for (let yaw = -3.6; yaw <= 3.6; yaw += .025) {
  endAcross.set(Math.cos(yaw), 0, -Math.sin(yaw));
  updateStrap(band, curve, topAcross, endAcross, 1, true);
  const a = new THREE.Vector3().fromBufferAttribute(position, 0), b = new THREE.Vector3().fromBufferAttribute(position, 1);
  assert.ok(a.clone().add(b).multiplyScalar(.5).distanceTo(new THREE.Vector3(0, 10, .009)) < 1e-5, 'ceiling frame fixed');
  assert.ok(b.clone().sub(a).normalize().dot(topAcross) > .99999, 'ceiling must not twist with bag');
  const last = 47 * 8;
  a.fromBufferAttribute(position, last); b.fromBufferAttribute(position, last + 1);
  const desired = endAcross.clone().addScaledVector(tangent, -endAcross.dot(tangent)).normalize();
  assert.ok(b.clone().sub(a).normalize().dot(desired) > .9999, 'lower strap must follow bag twist');
  const back = new THREE.Vector3().fromBufferAttribute(position, last + 3);
  assert.ok(Math.abs(a.distanceTo(back) - .018) < 1e-5, 'strap retains 3D thickness');
  if (previousTwist !== undefined) assert.ok(Math.abs(band.twist - previousTwist) < .1, 'no snapping at +/- pi');
  previousTwist = band.twist;
  for (let i = 0; i < normal.count; i++) assert.ok(Math.abs(new THREE.Vector3().fromBufferAttribute(normal, i).length() - 1) < 1e-5);
}
assert.equal(position.array, initialBuffer); assert.equal(band.geometry.index.array, initialIndex);
band.geometry.dispose();
console.log('VERDICT: PASS -- 3D yaw/pitch/depth and recovery at 30/60/120fps; fixed top, twist continuity, solid thickness and reused buffers');
