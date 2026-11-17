const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const THREE = require('three');
const loaded = new Map();
function load(name) {
  if (loaded.has(name)) return loaded.get(name);
  const source = fs.readFileSync(`src/components/intro/${name}.ts`, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => id.startsWith('./') ? load(id.slice(2)) : require(id), module, module.exports);
  loaded.set(name, module.exports);
  return module.exports;
}
function area(geometry, count = geometry.index?.count || geometry.attributes.position.count) {
  const position = geometry.attributes.position;
  const points = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let total = 0;
  for (let i = 0; i < count; i += 3) {
    points.forEach((point, j) => point.fromBufferAttribute(position, geometry.index ? geometry.index.getX(i + j) : i + j));
    total += points[1].sub(points[0]).cross(points[2].sub(points[0])).length() * .5;
  }
  return total;
}
const { fractureGeometry } = load('fractureGeometry');
const body = new THREE.CylinderGeometry(.625, .625, 3.14, 128, 92);
const logo = new THREE.PlaneGeometry(1.04, 1.04 / 3, 64, 8);
for (let i = 0; i < logo.attributes.position.count; i++) {
  const p = logo.attributes.position, angle = p.getX(i) / .635;
  p.setXYZ(i, Math.sin(angle) * .64, p.getY(i), Math.cos(angle) * .64);
}
logo.computeVertexNormals();
for (const [columns, rows] of [[6, 6], [4, 2]]) {
  const pieces = fractureGeometry(body, logo, columns, rows);
  const shellArea = pieces.reduce((sum, piece) => sum + area(piece.shell, piece.shell.groups[0].count), 0);
  const logoArea = pieces.reduce((sum, piece) => sum + (piece.logo ? area(piece.logo) : 0), 0);
  assert.ok(Math.abs(shellArea / area(body) - 1) < .0001, `leather surface area is conserved across seams (${columns}x${rows}: ${shellArea / area(body)})`);
  assert.ok(Math.abs(logoArea / area(logo) - 1) < .0001, 'branding is preserved across fragments');
  for (const piece of pieces) {
    for (const value of piece.shell.attributes.position.array) assert.ok(Number.isFinite(value), 'finite shell coordinates');
    piece.shell.dispose(); piece.logo?.dispose();
  }
}
const { createRiftSheet } = load('riftGeometry');
for (const [width, height, mobile] of [[16, 9, false], [3.9, 8.44, true]]) {
  const left = createRiftSheet(width, height, -1, mobile), right = createRiftSheet(width, height, 1, mobile);
  assert.ok(Math.abs((area(left) + area(right)) / (width * height) - 1) < .0001, 'both page halves cover the viewport exactly');
  const columns = mobile ? 28 : 44, rows = mobile ? 72 : 112;
  for (let row = 0; row <= rows; row++) {
    const a = row * (columns + 1) + columns, b = row * (columns + 1);
    assert.equal(left.attributes.position.getX(a), right.attributes.position.getX(b), 'torn edges match before impact');
    assert.equal(left.attributes.uv.getX(a), right.attributes.uv.getX(b), 'page graphics stay continuous across the rip');
  }
  left.dispose(); right.dispose();
}
body.dispose(); logo.dispose();
console.log('Fracture geometry checks passed: conserved leather, branding and continuous page seams.');
