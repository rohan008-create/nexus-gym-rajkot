import * as THREE from 'three';
// Deterministic, local textures: no network assets or random changes on remount.
export function createLeather() {
  const size = 1024;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(size, size);
  let seed = 9271;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const folds = Math.sin(y * .067 + Math.sin(x * .023) * 3) * Math.pow(Math.abs(y / size - .5) * 2, 7);
    const value = 104 + random() * 50 + folds * 35 + Math.sin(x * .21 + y * .12) * 6;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const roughCanvas = document.createElement('canvas'); roughCanvas.width = roughCanvas.height = size;
  const roughPixels = new ImageData(new Uint8ClampedArray(pixels.data), size, size);
  for (let i = 0; i < roughPixels.data.length; i += 4) roughPixels.data[i] = roughPixels.data[i + 1] = roughPixels.data[i + 2] = 195 + roughPixels.data[i] * .22;
  roughCanvas.getContext('2d')!.putImageData(roughPixels, 0, 0);
  const bump = new THREE.CanvasTexture(roughCanvas); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.anisotropy = 4;
  const normalCanvas = document.createElement('canvas'); normalCanvas.width = normalCanvas.height = size;
  const nctx = normalCanvas.getContext('2d')!; const normals = nctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const dx = (pixels.data[(y * size + (x + 1) % size) * 4] - pixels.data[i]) / 70;
    const dy = (pixels.data[(((y + 1) % size) * size + x) * 4] - pixels.data[i]) / 70;
    const n = new THREE.Vector3(-dx, -dy, 1).normalize();
    normals.data[i] = (n.x * .5 + .5) * 255; normals.data[i + 1] = (n.y * .5 + .5) * 255; normals.data[i + 2] = n.z * 255; normals.data[i + 3] = 255;
  }
  nctx.putImageData(normals, 0, 0); const normal = new THREE.CanvasTexture(normalCanvas);
  const albedoCanvas = document.createElement('canvas'); albedoCanvas.width = albedoCanvas.height = size;
  for (let i = 0; i < pixels.data.length; i += 4) { pixels.data[i] *= .22; pixels.data[i + 1] *= .225; pixels.data[i + 2] *= .23; }
  albedoCanvas.getContext('2d')!.putImageData(pixels, 0, 0);
  const map = new THREE.CanvasTexture(albedoCanvas); map.colorSpace = THREE.SRGBColorSpace;
  return { map, normal, bump, dispose: () => { map.dispose(); normal.dispose(); bump.dispose(); } };
}
