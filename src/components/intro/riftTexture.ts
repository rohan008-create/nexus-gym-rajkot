import * as THREE from 'three';
import { riftSeam } from './riftGeometry';
import { seededRandom } from './fractureGeometry';

function trackedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number) {
  for (const character of text) { ctx.fillText(character, x, y); x += ctx.measureText(character).width + tracking; }
}

/** The entire designed intro is printed on the surface, so its graphics tear too. */
export function createRiftTextures(aspect: number, logo?: CanvasImageSource) {
  const width = aspect < 1 ? 1024 : 2048, height = Math.round(width / aspect);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const scale = width / (aspect < 1 ? 390 : 1440);
  ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, width, height);
  const light = ctx.createRadialGradient(width * .5, height * .5, 0, width * .5, height * .5, Math.max(width, height) * .65);
  light.addColorStop(0, '#141113'); light.addColorStop(.48, '#080809'); light.addColorStop(1, '#030304');
  ctx.fillStyle = light; ctx.fillRect(0, 0, width, height);
  const random = seededRandom(1702);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 16000; i++) { ctx.globalAlpha = random() * .025; ctx.fillRect(random() * width, random() * height, 1, 1); }
  ctx.globalAlpha = 1;
  const margin = (aspect < 1 ? 24 : 44) * scale;
  if (logo) {
    const image = logo as HTMLImageElement;
    const logoWidth = (aspect < 1 ? 124 : 170) * scale;
    ctx.drawImage(logo, margin, 28 * scale, logoWidth, logoWidth * image.height / image.width);
  }
  // Deliberately quiet campaign typography; the bag remains the foreground subject.
  ctx.textBaseline = 'middle';
  ctx.font = `900 italic ${width * (aspect < 1 ? .205 : .111)}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = '#272428';
  if (aspect < 1) {
    ctx.fillText('BREAK', margin, height * .205);
    ctx.font = `900 italic ${width * .148}px Arial Black, Arial, sans-serif`;
    const fit = Math.min(1, (width - margin * 2) / ctx.measureText('THROUGH.').width);
    ctx.font = `900 italic ${width * .148 * fit}px Arial Black, Arial, sans-serif`;
    ctx.fillText('THROUGH.', margin, height * .79);
  } else {
    ctx.fillText('BREAK', width * .055, height * .43);
    ctx.font = `900 italic ${width * .075}px Arial Black, Arial, sans-serif`;
    const fit = Math.min(1, width * .355 / ctx.measureText('THROUGH.').width);
    ctx.font = `900 italic ${width * .075 * fit}px Arial Black, Arial, sans-serif`;
    ctx.fillText('THROUGH.', width * .59, height * .625);
  }
  ctx.lineWidth = .7 * scale; ctx.strokeStyle = '#292429';
  ctx.beginPath(); ctx.moveTo(margin, height - margin * 2.3); ctx.lineTo(width - margin, height - margin * 2.3); ctx.stroke();
  ctx.fillStyle = '#a39b9e'; ctx.font = `${8.5 * scale}px Arial, sans-serif`;
  trackedText(ctx, '01 / THE BREAKTHROUGH', margin, height - margin * 1.6, 1.7 * scale);
  if (aspect >= 1) trackedText(ctx, 'BUILT TO GO BEYOND.', width - 240 * scale, height - margin * 1.6, 1.7 * scale);
  ctx.fillStyle = '#ed1529'; ctx.fillRect(margin, height - margin * 2.3 - 1, 42 * scale, 2 * scale);
  if (aspect >= 1) {
    ctx.fillStyle = '#71696d'; ctx.font = `${9 * scale}px Arial, sans-serif`;
    trackedText(ctx, 'RAJKOT, GUJARAT', width - 210 * scale, 94 * scale, 1.8 * scale);
  }
  const page = new THREE.CanvasTexture(canvas); page.colorSpace = THREE.SRGBColorSpace;

  const mask = document.createElement('canvas'); mask.width = width; mask.height = height;
  const crack = mask.getContext('2d')!;
  crack.fillStyle = '#000'; crack.fillRect(0, 0, width, height);
  crack.strokeStyle = '#fff'; crack.lineWidth = 1.2 * scale; crack.lineJoin = 'round';
  crack.beginPath();
  for (let i = 0; i <= 160; i++) {
    const v = i / 160, x = riftSeam(v) * width, y = (1 - v) * height;
    if (!i) crack.moveTo(x, y); else crack.lineTo(x, y);
  }
  crack.stroke();
  // Long branching faults reach the perimeter: the full page takes the impact.
  const paths = [
    [[.5, .49], [.38, .39], [.29, .37], [.21, .2], [0, .08]],
    [[.5, .51], [.64, .42], [.71, .25], [.83, .23], [1, .04]],
    [[.5, .52], [.35, .62], [.24, .64], [.18, .82], [0, .94]],
    [[.51, .52], [.62, .6], [.69, .76], [.81, .79], [1, .95]],
    [[.39, .4], [.28, .48], [.15, .46], [0, .52]],
    [[.63, .43], [.74, .52], [.87, .48], [1, .55]],
  ];
  paths.forEach((path, i) => {
    crack.lineWidth = (i < 4 ? .9 : .55) * scale;
    crack.beginPath(); path.forEach(([u, v], j) => { if (!j) crack.moveTo(u * width, v * height); else crack.lineTo(u * width, v * height); }); crack.stroke();
  });
  const cracks = new THREE.CanvasTexture(mask);
  return { page, cracks };
}
