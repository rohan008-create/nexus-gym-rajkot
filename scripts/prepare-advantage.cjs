const sharp = require('sharp');
const fs = require('node:fs/promises');
(async () => {
  const input = 'assets/imagegen/advantage/athlete-original.png';
  const output = 'public/assets/photography';
  await fs.mkdir(output, { recursive: true });
  await sharp(input).resize({ width: 1600 }).webp({ quality: 87, effort: 5 }).toFile(`${output}/nexus-advantage-athlete.webp`);
  // Keep the athlete and both plates in the mobile framing, without the unused right-hand space.
  const { width, height } = await sharp(input).metadata();
  await sharp(input).extract({ left: 0, top: 0, width: Math.round(width * .64), height }).resize({ width: 850 }).webp({ quality: 85, effort: 5 }).toFile(`${output}/nexus-advantage-athlete-mobile.webp`);
  for (const name of ['nexus-advantage-athlete.webp', 'nexus-advantage-athlete-mobile.webp']) console.log(name, (await fs.stat(`${output}/${name}`)).size, 'bytes');
})().catch(error => { console.error(error); process.exitCode = 1; });
