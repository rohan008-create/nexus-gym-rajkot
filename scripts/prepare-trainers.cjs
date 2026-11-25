const fs = require('node:fs/promises');
const sharp = require('sharp');
const names = ['trainer-01', 'trainer-02', 'trainer-03', 'trainer-04', 'trainer-05'];
const specializations = ['STRENGTH &amp; CONDITIONING', 'FUNCTIONAL FITNESS', 'PERFORMANCE &amp; CONDITIONING', 'MOBILITY &amp; RECOVERY', 'STRENGTH &amp; TECHNIQUE'];
const focuses = [['STRENGTH FOUNDATIONS', 'CONTROLLED TECHNIQUE', 'PROGRESSIVE TRAINING'], ['MOVEMENT QUALITY', 'FULL-BODY STRENGTH', 'EVERYDAY FITNESS'], ['CONDITIONING', 'TRAINING CONSISTENCY', 'WORK CAPACITY'], ['MOBILITY PRACTICE', 'MOVEMENT CONTROL', 'RECOVERY HABITS'], ['LIFTING FOUNDATIONS', 'TECHNIQUE PRACTICE', 'STEADY PROGRESS']];
const biographies = [['Purposeful strength sessions.', 'Steady progress, one rep at a time.'], ['Move with confidence.', 'Build balanced full-body strength.'], ['Train with intention.', 'Develop consistent training habits.'], ['Move freely, train confidently.', 'Build sustainable movement habits.'], ['Build strength with purpose.', 'Practice technique, rep by rep.']];
const accents = ['#285b63', '#244c71', '#8d4c3c', '#65517a', '#4f6042'];
const portraitCrops = ['north', 'north', 'north', 'north', 'centre'];
const svg = (body, accent) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1080">
  <defs>
    <linearGradient id="paper" x2=".92" y2="1"><stop stop-color="#fff8e8"/><stop offset="1" stop-color="#e6d6b8"/></linearGradient>
    <pattern id="grain" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 1H8" stroke="#634e32" opacity=".06"/></pattern>
  </defs>
  <style>text{font-family:Arial,sans-serif;fill:#202931}.muted{fill:#4f5354}.accent{fill:${accent}}</style>
  ${body}</svg>`);
const backing = '<rect width="768" height="1080" fill="url(#paper)"/><rect width="768" height="1080" fill="url(#grain)"/>';
async function writeBadge(image, id, side) {
  const path = `public/assets/trainers/${id}-${side}`;
  const png = await image.png().toBuffer();
  await Promise.all([
    fs.writeFile(`assets/generated/trainers/${id}-${side}.png`, png),
    sharp(png).webp({ lossless: true, effort: 6 }).toFile(`${path}.webp`)
  ]);
}
(async () => {
  await fs.mkdir('public/assets/trainers', { recursive: true });
  await fs.mkdir('assets/generated/trainers', { recursive: true });
  const logo = await sharp('public/assets/nexus-logo.png').resize({ width: 245, height: 62, fit: 'inside' }).png().toBuffer();
  for (let i = 0; i < names.length; i++) {
    const id = names[i]; const number = String(i + 1).padStart(2, '0');
    const accent = accents[i];
    const portrait = `assets/imagegen/trainers/${id}-white.png`;
    const photo = await sharp(portrait).resize(688, 610, { fit: 'cover', position: portraitCrops[i] }).png().toBuffer();
    await sharp(portrait).resize({ width: 640 }).webp({ quality: 85 }).toFile(`public/assets/trainers/${id}-photo.webp`);
    const front = svg(`
      <rect x="40" y="185" width="688" height="610" fill="none" stroke="${accent}" stroke-width="5"/>
      <path d="M40 832H728" stroke="${accent}" stroke-width="3"/>
      <path d="M40 832H142" stroke="${accent}" stroke-width="8"/>
      <text x="724" y="132" text-anchor="end" font-size="23" font-weight="700" letter-spacing="3" class="accent">DEMO PROFILE</text>
      <text x="40" y="918" font-size="51" font-weight="900" letter-spacing="-1">Trainer ${number}</text>
      <text x="40" y="975" font-size="27" font-weight="700" letter-spacing="1" class="accent">${specializations[i]}</text>
      <rect y="1042" width="768" height="38" fill="${accent}"/>`, accent);
    await writeBadge(sharp(svg(backing, accent))
      .composite([{ input: photo, left: 40, top: 185 }, { input: logo, left: 38, top: 94 }, { input: front }]), id, 'front');
    const back = svg(`${backing}
      <path d="M40 191H728" stroke="${accent}" stroke-width="3"/>
      <text x="724" y="132" text-anchor="end" font-size="23" font-weight="700" letter-spacing="3" class="accent">DEMO PROFILE</text>
      <text x="40" y="290" font-size="61" font-weight="900" letter-spacing="-2">Trainer ${number}</text>
      <text x="40" y="348" font-size="28" font-weight="700" class="accent">${specializations[i]}</text>
      <rect x="40" y="410" width="688" height="244" rx="14" fill="${accent}" opacity=".11"/>
      <text x="68" y="464" font-size="21" font-weight="700" letter-spacing="3" class="accent">TRAINING FOCUS</text>
      ${focuses[i].map((value, row) => `<circle cx="75" cy="${508 + row * 44}" r="4" fill="${accent}"/><text x="94" y="${515 + row * 44}" font-size="24">${value}</text>`).join('')}
      <text x="40" y="728" font-size="27">${biographies[i][0]}</text>
      <text x="40" y="774" font-size="27">${biographies[i][1]}</text>
      <path d="M40 904H728" stroke="${accent}" opacity=".55"/>
      <text x="40" y="960" font-size="21" class="muted">Illustrative profile ? Not actual Nexus staff</text>
      <rect y="1042" width="768" height="38" fill="${accent}"/>`, accent);
    await writeBadge(sharp(back).composite([{ input: logo, left: 38, top: 94 }]), id, 'back');
  }
  const strap = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="128"><rect width="1024" height="128" fill="#111111"/><path d="M0 8H1024M0 120H1024" stroke="#393939" stroke-width="2" stroke-dasharray="8 6"/><text x="512" y="78" text-anchor="middle" font-family="Arial" font-weight="900" font-size="46" letter-spacing="6" fill="#e50914">NEXUS FITNESS CLUB</text></svg>`);
  await sharp(strap).png().toFile('public/assets/trainers/nexus-lanyard-strap.png');
  console.log('Created five front/back pairs, five photo assets and repeating strap texture.');
})().catch(error => { console.error(error); process.exitCode = 1; });
