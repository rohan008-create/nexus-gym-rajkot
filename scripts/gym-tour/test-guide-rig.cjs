const fs = require('node:fs');
const ts = require('typescript');
const THREE = require('three');
const assert = require('node:assert/strict');
async function main() {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const bytes = fs.readFileSync('public/models/nexus-gym/ryan-guide.glb');
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + length));
  // Geometry and skinning are unchanged; omit browser-only texture decoding.
  json.materials = json.materials.map(() => ({}));
  delete json.images; delete json.textures;
  const binary = bytes.subarray(28 + length);
  let encoded = Buffer.from(JSON.stringify(json));
  encoded = Buffer.concat([encoded, Buffer.alloc((4 - encoded.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20);
  header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + encoded.length + binary.length, 8);
  header.writeUInt32LE(encoded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([header, encoded, binHeader, binary]);
  const asset = await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.length), '');
  const avatar = asset.scene;
  const config = { exports: {} };
  new Function('exports', ts.transpileModule(fs.readFileSync('src/components/hero/gym-tour/gymTourConfig.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(config.exports);
  const { STAIR, stairHeight, smooth, COMPLEX_SETBACK } = config.exports;
  const source = fs.readFileSync('src/components/hero/gym-tour/RyanTourGuide.tsx', 'utf8');
  const normalize = source.slice(source.indexOf('function normalizeGuide('), source.indexOf('// Solve a two-bone'));
  new Function('THREE', 'avatar', ts.transpileModule(normalize, {}).outputText + '; normalizeGuide(avatar);')(THREE, avatar);
  const create = source.slice(source.indexOf('function createLeg('), source.indexOf('function relaxIdleArms('));
  const createLeg = new Function('THREE', 'STAIR', 'stairHeight', 'smooth', ts.transpileModule(create, {}).outputText + '; return createLeg;')(THREE, STAIR, stairHeight, smooth);
  const legs = [createLeg(avatar, 'Left'), createLeg(avatar, 'Right')];
  const root = new THREE.Group(); root.add(avatar);
  const rest = [];
  avatar.traverse(b => { if (b.isBone) rest.push([b, b.position.clone(), b.quaternion.clone()]); });
  const position = name => avatar.getObjectByName('mixamorig' + name).getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(4));
  assert.ok(Math.abs(position('Hips')[0]) < .0001, 'route must pass through pelvis, not mesh bounds');
  assert.ok(Math.abs((position('LeftFoot')[2] + position('RightFoot')[2]) / 2) < .0001, 'ankles centred over tread');
  const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  let count = 0, maxLateral = 0, maxError = 0;
  const samples = Array.from({ length: 401 }, (_, i) => i / 20);
  const complex = new THREE.Group(); complex.add(root);
  complex.position.z = -COMPLEX_SETBACK;
  assert.ok(STAIR.bottomZ + .25 - COMPLEX_SETBACK < 4.9, 'the lowest tread and supports must stay behind the road curb');
  for (const stair of [...samples, ...samples.toReversed()]) {
    rest.forEach(([b, p, q]) => { b.position.copy(p); b.quaternion.copy(q); });
    root.position.set(STAIR.x, stairHeight(0) + (STAIR.landingY - stairHeight(0)) * stair / 20, STAIR.bottomZ - stair * STAIR.run);
    root.rotation.set(0, Math.PI, 0);
    let drop = 0;
    legs.forEach((leg, i) => { const shifted = stair + i; drop = Math.max(drop, leg.target(Math.floor(shifted / 2) * 2 - i, shifted % 2, STAIR.x + (i ? .095 : -.095), stair)); });
    root.position.y -= drop;
    const errors = legs.map(leg => leg.place(yaw));
    const leftKnee = position('LeftLeg'), rightKnee = position('RightLeg');
    assert.ok(leftKnee[0] < STAIR.x - .04 && rightKnee[0] > STAIR.x + .04, `knees must stay in separate lanes at ${stair}`);
    for (const side of ['Left', 'Right']) {
      const hip = position(side + 'UpLeg'), knee = position(side + 'Leg'), ankle = position(side + 'Foot');
      const lateral = Math.max(Math.abs(hip[0] - knee[0]), Math.abs(hip[0] - ankle[0]));
      maxLateral = Math.max(maxLateral, lateral);
      assert.ok(lateral < .04, `${side} leg must not lean across pelvis at ${stair}: ${lateral}`);
    }
    maxError = Math.max(maxError, ...errors);
    assert.ok(errors.every(e => e < .005), `unreachable foot target at ${stair}: ${errors}`);
    count++;
  }
  console.log(`${count} forward/reverse rig poses: knees stay separate, lateral deviation ${(maxLateral * 100).toFixed(2)} cm, foot error ${(maxError * 1000).toFixed(3)} mm.`);

  root.rotation.set(0, 0, 0);
  const relaxSource = source.slice(source.indexOf('function relaxIdleArms('), source.indexOf('function AnimatedRyan('));
  const relaxIdleArms = new Function('THREE', ts.transpileModule(relaxSource, {}).outputText + '; return relaxIdleArms;')(THREE);
  const idleClip = asset.animations.find(clip => clip.name === 'Idle');
  const walkClip = asset.animations.find(clip => clip.name === 'Walk');
  const mixer = new THREE.AnimationMixer(avatar);
  const idle = mixer.clipAction(relaxIdleArms(idleClip, walkClip)).play();
  const walk = mixer.clipAction(walkClip).play();
  function sample(walking, phase) {
    idle.setEffectiveWeight(1 - walking);
    walk.setEffectiveWeight(walking);
    idle.time = .4;
    walk.time = walkClip.duration * phase;
    mixer.update(0);
  }
  sample(0, 0);
  assert.ok(position('RightForeArm')[1] - position('RightHand')[1] > .20, 'the resting right wrist hangs below the elbow');
  mixer.stopAllAction();
  idle.play();
  walk.play();
  sample(smooth(.25), 0);
  assert.ok(position('RightForeArm')[1] - position('RightHand')[1] > .20, 'the wrist stays relaxed at the start of the stair turn');
  const armSwing = side => position(side + 'Hand')[2] - position(side + 'Arm')[2];
  sample(1, .25);
  const leftForward = armSwing('Left'), rightForward = armSwing('Right');
  sample(1, .75);
  assert.ok(leftForward - armSwing('Left') > .12 && armSwing('Right') - rightForward > .12, 'the arms swing in opposite directions during each stair cycle');
  console.log('Guide arms rest at the sides between gestures and alternate through the climb.');
  console.log('VERDICT: PASS');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
