const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const root = path.resolve(__dirname, '../assets/evolution/nexus-evolution');
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  const framesPerPack = 4;
  for (const variant of ['desktop', 'mobile']) {
    const directory = path.join(root, `${variant}-packs`); await fs.mkdir(directory, { recursive: true });
    for (let first = 0; first < manifest.frameCount; first += framesPerPack) {
      const count = Math.min(framesPerPack, manifest.frameCount - first);
      const header = Buffer.alloc(8); header.writeUInt32LE(first, 0); header.writeUInt32LE(count, 4);
      const parts = [header];
      for (let i = first; i < first + count; i++) { const image = await fs.readFile(path.join(root, variant, `frame-${String(i + 1).padStart(4, '0')}.webp`)); const size = Buffer.alloc(4); size.writeUInt32LE(image.length); parts.push(size, image); }
      await fs.writeFile(path.join(directory, `pack-${String(first / framesPerPack + 1).padStart(3, '0')}.bin`), Buffer.concat(parts));
    }
  }
  manifest.packs = { framesPerPack, format: 'LE uint32 first-frame, count; repeated uint32 byte-length plus unchanged WebP bytes', pattern: '{variant}-packs/pack-%03d.bin' };
  await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Created ${Math.ceil(manifest.frameCount / framesPerPack)} WebP transport batches per variant. Original individual frames remain available as fallback.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
