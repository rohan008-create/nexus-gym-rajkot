// Structural budgets for the self-contained exterior delivered to the browser.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const file=process.env.EXTERIOR_MODEL||'public/models/nexus-gym/exterior.glb';
const data=fs.readFileSync(file);assert.equal(data.toString('ascii',0,4),'glTF');assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);
assert.ok(data.length<=5*1024*1024,'exterior model exceeds5MiB');
let json;
for(let offset=12;offset<data.length;){const length=data.readUInt32LE(offset),kind=data.readUInt32LE(offset+4);if(kind===0x4e4f534a)json=JSON.parse(data.toString('utf8',offset+8,offset+8+length));offset+=8+length;}
assert.ok(json?.meshes?.length>0,'missing3D meshes');
assert.ok((json.materials?.length||0)<=18,'too many material buckets');
assert.ok((json.images?.length||0)>0,'model must include actual brand/material textures');
for(const buffer of json.buffers||[])assert.ok(!buffer.uri,'model should be self-contained');
for(const image of json.images||[])assert.ok(image.bufferView!==undefined&&!image.uri,'embedded image required');
let triangles=0,primitives=0;const names=[];
for(const node of json.nodes||[]){if(node.name)names.push(node.name);if(node.mesh===undefined)continue;for(const primitive of json.meshes[node.mesh].primitives){primitives++;assert.ok([undefined,4].includes(primitive.mode),'triangle geometry expected');const accessor=json.accessors[primitive.indices??primitive.attributes.POSITION];triangles+=accessor.count/3;const bounds=json.accessors[primitive.attributes.POSITION];assert.ok(bounds.min?.every(Number.isFinite)&&bounds.max?.every(Number.isFinite),'finite position bounds');}}
assert.ok(triangles>0&&triangles<=120000,'triangle budget exceeded');assert.ok(primitives<=22,'draw-call budget exceeded');
const report={file,bytes:data.length,meshes:json.meshes.length,materials:json.materials.length,images:json.images.length,primitives,triangles,nodeNames:names,extensions:json.extensionsUsed||[],passed:true};
const out=path.resolve('artifacts/gym-tour/phase3');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'model-checks.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({bytes:report.bytes,materials:report.materials,primitives,triangles,images:report.images}));console.log('VERDICT: PASS');
