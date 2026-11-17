const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const { zipSync, unzipSync } = await import('three/examples/jsm/libs/fflate.module.js');
  const root = path.resolve(__dirname, '..');
  const input = path.join(root, 'public/animations/nexus-evolution');
  const manifest = JSON.parse(await fs.readFile(path.join(input, 'manifest.json'), 'utf8'));
  // The portable archive is the original extracted sequence. Transport batches
  // are an optional website optimization, reproducible with pack:evolution.
  const portableManifest = { ...manifest }; delete portableManifest.packs;
  const entries = { 'manifest.json': Buffer.from(JSON.stringify(portableManifest, null, 2)) };
  for (const variant of ['desktop', 'mobile']) for (let i = 1; i <= manifest.frameCount; i++) {
    const name = `frame-${String(i).padStart(4, '0')}.webp`;
    entries[`${variant}/${name}`] = await fs.readFile(path.join(input, variant, name));
  }
  await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
  const output = path.join(root, 'artifacts/nexus-human-evolution.zip');
  const archive = zipSync(entries, { level: 0 }); // WebP is already compressed.
  await fs.writeFile(output, archive);
  const contents = unzipSync(archive);
  if (Object.keys(contents).length !== manifest.frameCount * 2 + 1) throw new Error('Archive verification failed');
  console.log(`${output}: ${archive.length} bytes; ${Object.keys(contents).length} verified entries.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
