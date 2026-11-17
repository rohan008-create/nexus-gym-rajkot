const sharp = require('sharp');
const fs = require('node:fs/promises');
(async () => {
  await fs.mkdir('public/assets/membership', { recursive: true });
  const logo = await sharp('public/assets/nexus-logo.png').resize({ width: 470, height: 125, fit: 'inside' }).png().toBuffer();
  for (const [index, plan] of ['basic', 'pro', 'elite'].entries()) {
    const body = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="1280"><style>text{font-family:Arial,sans-serif;fill:white}</style><text x="320" y="650" text-anchor="middle" font-size="220" font-weight="900">0${index + 1}</text><text x="320" y="790" text-anchor="middle" font-size="56" font-weight="800">${plan.toUpperCase()}</text><text x="320" y="846" text-anchor="middle" font-size="38" font-weight="700" letter-spacing="6">PLAN</text><path d="M400 1190L620 970M460 1210L640 1030" stroke="#e50914" stroke-width="29" opacity=".9"/></svg>`;
    await sharp(Buffer.from(body)).composite([{ input: logo, left: 85, top: 305 }]).png().toFile(`public/assets/membership/${plan}-door.png`);
    const inside = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="1240"><style>text{font-family:Arial,sans-serif;fill:#f5f5f5}</style><text x="320" y="440" text-anchor="middle" font-size="94" font-weight="900">${plan.toUpperCase()}</text><text x="320" y="505" text-anchor="middle" font-size="38" letter-spacing="4">MEMBERSHIP</text><text x="320" y="570" text-anchor="middle" font-size="25" fill="#a1a1aa">0${index + 1} / DEMO PLAN</text><path d="M70 620H570" stroke="#e50914" stroke-width="2"/><text x="320" y="715" text-anchor="middle" font-size="38">YOUR NEXT CHAPTER.</text><text x="320" y="800" text-anchor="middle" font-size="31" fill="#c9c9d0">Benefits to be confirmed</text><text x="320" y="864" text-anchor="middle" font-size="31" fill="#c9c9d0">Duration to be confirmed</text><text x="320" y="1004" text-anchor="middle" font-size="34">ENQUIRE FOR PRICING</text><path d="M70 1070H570" stroke="#ffffff" stroke-opacity=".16"/><text x="320" y="1150" text-anchor="middle" font-size="29" fill="#a1a1aa">DETAILS &amp; ENQUIRY BELOW</text></svg>`;
    await sharp(Buffer.from(inside)).composite([{ input: logo, left: 85, top: 160 }]).png().toFile(`public/assets/membership/${plan}-interior.png`);
  }
  console.log('Created six transparent locker branding textures using the official logo. No background images.');
})().catch(error => { console.error(error); process.exitCode = 1; });
