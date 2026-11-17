import assert from 'node:assert/strict';
import { RopeGeometry } from '../src/components/hero/ropeGeometry.ts';

for (const mobile of [false, true]) {
  const rope = new RopeGeometry(mobile);
  const layout = { unit: 6.432 / (mobile ? 844 : 900), viewHeight: 6.432, heroHeight: mobile ? 940 : 900, rootTop: 0,
    aboutStart: mobile ? 1060 : 1020, aboutEnd: mobile ? 1580 : 1500, headingPageY: mobile ? 1150 : 1120, version: 1 };
  const identity = rope.geometry.uuid, positionBuffer = rope.positions, uvBuffer = rope.uvs;
  const update = { phase: 1.2, progress: 0, amplitude: 1, layout };
  rope.update(update);
  const base = rope.visibleLength, baseEnd = rope.end.y;
  const oldCount = Math.floor(base / rope.step) - 2;
  const fixedPositions = rope.positions.slice(0, oldCount * (rope.radial + 1) * 3);
  const fixedUvs = rope.uvs.slice(0, oldCount * (rope.radial + 1) * 2);
  for (const p of [.2, .5, .8, 1]) {
    update.progress = p; rope.update(update);
    assert.ok(rope.visibleLength > base, 'additional physical rope is fed');
    assert.ok(rope.end.y < baseEnd, 'lower endpoint descends');
    assert.ok(rope.centers[0].distanceTo(rope.anchor) < 1e-12, 'fixed world-space anchor');
    assert.equal(rope.geometry.uuid, identity); assert.equal(rope.positions, positionBuffer); assert.equal(rope.uvs, uvBuffer);
    assert.deepEqual(rope.positions.slice(0, fixedPositions.length), fixedPositions, 'existing rope does not translate or rescale');
    assert.deepEqual(rope.uvs.slice(0, fixedUvs.length), fixedUvs, 'existing UV texel density does not change');
  }
  update.progress = 0; rope.update(update);
  assert.ok(Math.abs(rope.visibleLength - base) < .000001, 'reverse restores visible length');
  assert.ok(Math.abs(rope.end.y - baseEnd) < .000001, 'reverse restores lower endpoint');
  for (const phase of [0, 2, 9, 17]) {
    update.phase = phase; update.amplitude = 1.3; update.progress = .75; rope.update(update);
    assert.ok(rope.centers[0].distanceTo(rope.anchor) < 1e-12, 'wave never dislodges anchor');
    const count = Math.ceil(rope.visibleLength / rope.step);
    for (let i = 0; i < count; i += 13) {
      const vertex = i * (rope.radial + 1), a = vertex * 3, center = rope.centers[i];
      const radius = Math.hypot(rope.positions[a] - center.x, rope.positions[a + 1] - center.y, rope.positions[a + 2] - center.z);
      assert.ok(radius > rope.radius * .64 && radius < rope.radius * 1.12, 'diameter remains within three-ply rope envelope');
      assert.ok(Math.abs(rope.uvs[vertex * 2 + 1] * Math.PI * 2 * rope.radius - i * rope.step) < .00001, 'UVs follow physical arc length');
      assert.ok(Math.abs(Math.hypot(rope.normals[a], rope.normals[a + 1], rope.normals[a + 2]) - 1) < .00001, 'unit finite surface normals');
    }
  }
  rope.dispose();
}
console.log('Rope anchor, extension, fixed buffers, thickness, arc-length UVs, reverse and wave invariants passed.');
