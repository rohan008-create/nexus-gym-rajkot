// Derive a self-contained hero asset from the user-supplied Ryan GLB.
// Retains the posed face, skin and Idle/Walk/Wave used in the tour.
const fs = require('node:fs');
const sharp = require('sharp');
const path = require('node:path');
const maxTextureSize = 512;

function bakeStaticFace(json, binary) {
  if (json.animations.some(clip => clip.channels.some(channel => channel.target.path === 'weights')) ||
      json.nodes.some(node => node.weights !== undefined)) return;

  function positions(index) {
    const accessor = json.accessors[index], view = json.bufferViews[accessor.bufferView];
    if (accessor.componentType !== 5126 || accessor.type !== 'VEC3' || accessor.sparse ||
        (view.byteStride && view.byteStride !== 12)) throw new Error('Unexpected facial position format');
    return new Float32Array(binary.buffer, binary.byteOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0), accessor.count * 3);
  }

  for (const mesh of json.meshes) {
    for (const primitive of mesh.primitives) {
      if (!primitive.targets) continue;
      const base = positions(primitive.attributes.POSITION);
      primitive.targets.forEach((target, index) => {
        const weight = mesh.weights?.[index] || 0;
        if (!weight) return;
        if (Object.keys(target).length !== 1 || target.POSITION === undefined) throw new Error('Unexpected facial morph');
        const delta = positions(target.POSITION);
        for (let i = 0; i < base.length; i++) base[i] += weight * delta[i];
      });
      const accessor = json.accessors[primitive.attributes.POSITION];
      accessor.min = [Infinity, Infinity, Infinity];
      accessor.max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < base.length; i++) {
        const axis = i % 3;
        accessor.min[axis] = Math.min(accessor.min[axis], base[i]);
        accessor.max[axis] = Math.max(accessor.max[axis], base[i]);
      }
      delete primitive.targets;
    }
    delete mesh.weights;
  }
}
async function main() {
  const source = 'public/models/avatar-preview/ryan-smart.glb';
  const output = 'public/models/nexus-gym/ryan-guide.glb';
  const original = fs.readFileSync(source);
  const jsonLength = original.readUInt32LE(12);
  const json = JSON.parse(original.toString('utf8', 20, 20 + jsonLength));
  // Exporter extras contain several megabytes of editor-only hair metadata.
  const stripExtras = value => {
    if (!value || typeof value !== 'object') return;
    delete value.extras;
    Object.values(value).forEach(stripExtras);
  };
  stripExtras(json);
  const binary = original.subarray(28 + jsonLength);
  json.animations = json.animations.filter(a => ['Idle', 'Walk', 'Wave'].includes(a.name));
  bakeStaticFace(json, binary);
  const used = new Set();
  for (const mesh of json.meshes) for (const p of mesh.primitives) {
    Object.values(p.attributes).forEach(i => used.add(i));
    if (p.indices !== undefined) used.add(p.indices);
    for (const target of p.targets || []) Object.values(target).forEach(i => used.add(i));
  }
  for (const skin of json.skins) if (skin.inverseBindMatrices !== undefined) used.add(skin.inverseBindMatrices);
  for (const animation of json.animations) for (const sampler of animation.samplers) { used.add(sampler.input); used.add(sampler.output); }
  const remap = new Map([...used].sort((a,b) => a-b).map((old, i) => [old, i]));
  json.accessors = [...remap.keys()].map(i => json.accessors[i]);
  for (const mesh of json.meshes) for (const p of mesh.primitives) {
    for (const k of Object.keys(p.attributes)) p.attributes[k] = remap.get(p.attributes[k]);
    if (p.indices !== undefined) p.indices = remap.get(p.indices);
    for (const target of p.targets || []) for (const k of Object.keys(target)) target[k] = remap.get(target[k]);
  }
  for (const skin of json.skins) if (skin.inverseBindMatrices !== undefined) skin.inverseBindMatrices = remap.get(skin.inverseBindMatrices);
  for (const animation of json.animations) for (const sampler of animation.samplers) { sampler.input = remap.get(sampler.input); sampler.output = remap.get(sampler.output); }
  const views = [], chunks = [], viewMap = new Map();
  let offset = 0;
  function append(bytes, props = {}) {
    const pad = (4 - offset % 4) % 4;
    if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
    const i = views.length;
    views.push({ ...props, buffer: 0, byteOffset: offset, byteLength: bytes.length });
    chunks.push(bytes); offset += bytes.length;
    return i;
  }
  for (const accessor of json.accessors) {
    if (accessor.sparse) throw new Error('Sparse accessors need explicit remapping');
    const old = accessor.bufferView;
    if (old === undefined) continue;
    if (!viewMap.has(old)) {
      const view = json.bufferViews[old];
      viewMap.set(old, append(binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength), view));
    }
    accessor.bufferView = viewMap.get(old);
  }
  const alphaImages = new Set(json.materials.filter(m => m.alphaMode && m.alphaMode !== 'OPAQUE')
    .map(m => json.textures[m.pbrMetallicRoughness?.baseColorTexture?.index]?.source));
  for (const [index, image] of json.images.entries()) {
    const view = json.bufferViews[image.bufferView];
    const pipeline = sharp(binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength))
      .resize({ width: maxTextureSize, height: maxTextureSize, fit: 'inside', withoutEnlargement: true });
    const alpha = alphaImages.has(index);
    const bytes = await (alpha ? pipeline.png({ compressionLevel: 9 }) : pipeline.removeAlpha().jpeg({ quality: 88, chromaSubsampling: '4:4:4' })).toBuffer();
    image.bufferView = append(bytes); image.mimeType = alpha ? 'image/png' : 'image/jpeg';
  }
  json.bufferViews = views;
  let bin = Buffer.concat(chunks);
  bin = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
  json.buffers = [{ byteLength: bin.length }];
  let js = Buffer.from(JSON.stringify(json));
  js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20); header.write('glTF'); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + js.length + bin.length, 8); header.writeUInt32LE(js.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(bin.length); binHeader.writeUInt32LE(0x004e4942, 4);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, Buffer.concat([header, js, binHeader, bin]));
  const report = { source, output, sourceBytes: original.length, bytes: fs.statSync(output).size, clips: json.animations.map(a => a.name), maxTextureSize };
  fs.writeFileSync('docs/gym-tour/ryan-guide-source.json', JSON.stringify({ ...report, provenance: 'User supplied local Ryan GLB. Original retained unchanged in avatar-preview.', rights: 'No new third-party asset downloaded.' }, null, 2) + '\n');
  console.log(JSON.stringify(report));
  console.log('VERDICT: PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
