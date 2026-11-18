/**
 * Generates deterministic leather PBR maps at build time so the intro never
 * runs million-iteration pixel loops on the main thread. The output is
 * byte-for-byte equivalent to the previous runtime generator in
 * src/components/intro/leather.ts (same seed, folds and normal derivation).
 */
const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs');

const SIZE = 1024;
const OUT = path.join(__dirname, '..', 'public', 'assets', 'intro');

function generate() {
  const base = new Uint8ClampedArray(SIZE * SIZE * 4);
  let seed = 9271;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const folds = Math.sin(y * .067 + Math.sin(x * .023) * 3) * Math.pow(Math.abs(y / SIZE - .5) * 2, 7);
    const value = 104 + random() * 50 + folds * 35 + Math.sin(x * .21 + y * .12) * 6;
    base[i] = base[i + 1] = base[i + 2] = value;
    base[i + 3] = 255;
  }

  const rough = new Uint8ClampedArray(base);
  const albedo = new Uint8ClampedArray(base);
  const normals = new Uint8ClampedArray(base.length);
  for (let i = 0; i < base.length; i += 4) {
    const v = base[i];
    rough[i] = rough[i + 1] = rough[i + 2] = 195 + v * .22;
    albedo[i] = v * .22; albedo[i + 1] = v * .225; albedo[i + 2] = v * .23;
  }
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4;
    const dx = (base[(y * SIZE + (x + 1) % SIZE) * 4] - base[i]) / 70;
    const dy = (base[(((y + 1) % SIZE) * SIZE + x) * 4] - base[i]) / 70;
    const len = Math.hypot(dx, dy, 1) || 1;
    const nx = -dx / len, ny = -dy / len, nz = 1 / len;
    normals[i] = (nx * .5 + .5) * 255;
    normals[i + 1] = (ny * .5 + .5) * 255;
    normals[i + 2] = nz * 255;
    normals[i + 3] = 255;
  }

  return {
    'leather-albedo.webp': albedo,
    'leather-normal.webp': normals,
    'leather-roughness.webp': rough,
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const images = generate();
  for (const [name, pixels] of Object.entries(images)) {
    await sharp(Buffer.from(pixels), { raw: { width: SIZE, height: SIZE, channels: 4 } })
      .webp({ quality: 92, effort: 6 })
      .toFile(path.join(OUT, name));
    console.log('Wrote', path.join(OUT, name));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
