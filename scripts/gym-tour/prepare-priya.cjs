// Preserve the user's source rig; optimize only the browser delivery asset.
const fs = require('node:fs');
const sharp = require('sharp');
async function main() {
  const source = process.argv[2] || 'assets/vendor/priya-casual-original.glb';
  const output = 'public/models/nexus-gym/priya-reception.glb';
  const bytes = fs.readFileSync(source), length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + length)), binary = bytes.subarray(28 + length);
  delete json.animations; // Reception uses the existing deterministic greeting rig.
  const strip = value => { if (!value || typeof value !== 'object') return; delete value.extras; Object.values(value).forEach(strip); }; strip(json);
  const used = new Set();
  for (const mesh of json.meshes) for (const p of mesh.primitives) {
    Object.values(p.attributes).forEach(i => used.add(i));
    if (p.indices !== undefined) used.add(p.indices);
    for (const target of p.targets || []) Object.values(target).forEach(i => used.add(i));
  }
  for (const skin of json.skins || []) if (skin.inverseBindMatrices !== undefined) used.add(skin.inverseBindMatrices);
  const remap = new Map([...used].sort((a, b) => a - b).map((old, index) => [old, index]));
  json.accessors = [...remap.keys()].map(i => json.accessors[i]);
  for (const mesh of json.meshes) for (const p of mesh.primitives) {
    for (const key of Object.keys(p.attributes)) p.attributes[key] = remap.get(p.attributes[key]);
    if (p.indices !== undefined) p.indices = remap.get(p.indices);
    for (const target of p.targets || []) for (const key of Object.keys(target)) target[key] = remap.get(target[key]);
  }
  for (const skin of json.skins || []) if (skin.inverseBindMatrices !== undefined) skin.inverseBindMatrices = remap.get(skin.inverseBindMatrices);
  const chunks = [], views = [], viewMap = new Map(); let offset = 0;
  function append(data, props = {}) {
    const padding = (4 - offset % 4) % 4; if (padding) { chunks.push(Buffer.alloc(padding)); offset += padding; }
    const index = views.length; views.push({ ...props, buffer: 0, byteOffset: offset, byteLength: data.length }); chunks.push(data); offset += data.length; return index;
  }
  for (const accessor of json.accessors) {
    if (accessor.sparse) throw Error('Sparse accessors need explicit remapping');
    const old = accessor.bufferView; if (old === undefined) continue;
    if (!viewMap.has(old)) { const v = json.bufferViews[old]; viewMap.set(old, append(binary.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength), v)); }
    accessor.bufferView = viewMap.get(old);
  }
  const alpha = new Set(json.materials.filter(m => m.alphaMode && m.alphaMode !== 'OPAQUE').map(m => json.textures[m.pbrMetallicRoughness?.baseColorTexture?.index]?.source));
  for (const [index, image] of json.images.entries()) {
    const view = json.bufferViews[image.bufferView];
    const pipeline = sharp(binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength)).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true });
    const encoded = await (alpha.has(index) ? pipeline.png({ compressionLevel: 9 }) : pipeline.removeAlpha().jpeg({ quality: 88, chromaSubsampling: '4:4:4' })).toBuffer();
    image.bufferView = append(encoded); image.mimeType = alpha.has(index) ? 'image/png' : 'image/jpeg';
  }
  json.bufferViews = views;
  let bin = Buffer.concat(chunks); bin = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]); json.buffers = [{ byteLength: bin.length }];
  let encoded = Buffer.from(JSON.stringify(json)); encoded = Buffer.concat([encoded, Buffer.alloc((4 - encoded.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + encoded.length + bin.length, 8); header.writeUInt32LE(encoded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(output, Buffer.concat([header, encoded, binHeader, bin]));
  const report = { source, output, originalBytes: bytes.length, deliveryBytes: fs.statSync(output).size };
  if (report.deliveryBytes >= 5 * 1024 * 1024) throw Error(`Delivery asset exceeds 5 MiB: ${report.deliveryBytes}`);
  console.log(JSON.stringify(report)); console.log('VERDICT: PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
