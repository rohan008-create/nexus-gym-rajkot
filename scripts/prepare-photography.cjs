const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const generatedRoot = 'C:/Users/Hp/.codex/generated_images/01a1c079-71d2-7c51-b7a9-5640c36465b6';
const assets = [
  ['about-gym', 'exec-ad888eb4-4029-4223-852a-8d407ebcaa9a.png', 1536],
  ['program-strength', 'exec-5e1baf4c-fd90-404a-8509-02d195d1a696.png', 768],
  ['program-muscle', 'exec-71b2fb44-243a-4b65-aa98-636005a5e30f.png', 768],
  ['program-cardio', 'exec-8c32c0e0-940e-4917-9ab1-79431a638093.png', 768],
  ['program-functional', 'exec-2bd536d4-183b-44d6-b770-710761a9eb69.png', 768],
  ['program-personal', 'exec-2b417ff1-cc14-4dd1-a735-d2e6c60e57c9.png', 768],
];
(async () => {
  await fs.mkdir('assets/imagegen', { recursive: true }); await fs.mkdir('public/assets/photography', { recursive: true });
  for (const [name, source, width] of assets) {
    const original = path.join('assets/imagegen', `${name}-original.png`);
    try { await fs.access(original); } catch { await fs.copyFile(path.join(generatedRoot, source), original); }
    const destination = path.join('public/assets/photography', `${name}.webp`);
    await sharp(original).resize({ width, withoutEnlargement: true }).webp({ quality: 85, effort: 5 }).toFile(destination);
    console.log(destination, (await fs.stat(destination)).size, 'bytes');
  }
  const armory = [['barbell', 'exec-0c0cb1e7-2c40-4747-8407-b0c7c5e0b02a.png'], ['treadmill', 'exec-b8203236-d52a-4a8e-bc81-4312ed023842.png'], ['cable-machine', 'exec-7dc8f6f7-19b8-46d3-be58-8712216a4791.png']];
  await fs.mkdir('assets/imagegen/armory', { recursive: true }); await fs.mkdir('public/assets/armory', { recursive: true });
  for (const [name, source] of armory) {
    const original = path.join('assets/imagegen/armory', `${name}-original.png`);
    try { await fs.access(original); } catch { await fs.copyFile(path.join(generatedRoot, source), original); }
    const destination = path.join('public/assets/armory', `${name}.webp`);
    await sharp(original).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 87, effort: 5 }).toFile(destination);
    console.log(destination, (await fs.stat(destination)).size, 'bytes');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
