import type { FooterEye } from './fuzzy-gaze-footer';

const PATCH_SIZE = 320;
const HALF_PATCH = PATCH_SIZE / 2;

function noise(column: number, row: number, seed: number) {
  const value = Math.imul(column + seed * 71, 0x1f123bb5) ^ Math.imul(row - seed * 113, 0x5f356495);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}

function paintPadding(
  patch: ImageData,
  texture: ImageData,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  stroke: number,
) {
  const { width, height, data } = texture;
  const pixels = patch.data;
  for (let row = 0; row < patch.height; row++) {
    const dy = (row + .5) / (patch.height / 2) - 1;
    for (let col = 0; col < patch.width; col++) {
      const dx = (col + .5) / (patch.width / 2) - 1;
      const offset = (row * patch.width + col) * 4;
      pixels[offset + 3] = 0;
      const edge = 1 - dx * dx - dy * dy;
      if (edge <= 0) continue;
      const pressure = edge * edge * stroke;
      const pull = 1 / (1 + .32 * pressure);
      const sx = x + dx * radiusX * pull;
      const sy = y + dy * radiusY * pull;
      const ix = Math.floor(sx);
      const iy = Math.floor(sy);
      const ox = Math.floor(x + dx * radiusX);
      const oy = Math.floor(y + dy * radiusY);
      if (ix < 0 || iy < 0 || ix >= width - 1 || iy >= height - 1 ||
          ox < 0 || oy < 0 || ox >= width || oy >= height) continue;

      const sample = (iy * width + ix) * 4;
      const next = sample + width * 4;
      const original = (oy * width + ox) * 4;
      const alpha = Math.min(data[original + 3], data[sample + 3], data[sample + 7], data[next + 3], data[next + 7]);
      if (alpha < 238 || data[original] < data[original + 1] * 1.45 || data[original] < data[original + 2] * 1.25) continue;
      const fx = sx - ix;
      const fy = sy - iy;
      // Light rolls across the padded leather as it presses inward.
      const light = 1 + pressure * (-.20 + .65 * (.31 * dx + .72 * dy));
      for (let channel = 0; channel < 3; channel++) {
        const upper = data[sample + channel] * (1 - fx) + data[sample + 4 + channel] * fx;
        const lower = data[next + channel] * (1 - fx) + data[next + 4 + channel] * fx;
        pixels[offset + channel] = (upper * (1 - fy) + lower * fy) * light;
      }
      pixels[offset + 3] = alpha * Math.min(1, edge * edge * 5, stroke * 20);
    }
  }
}

export function createFurStroke(canvas: HTMLCanvasElement, eyes: FooterEye[], padded = false) {
  const context = canvas.getContext('2d');
  const buffer = document.createElement('canvas');
  const sourceContext = buffer.getContext('2d', { willReadFrequently: true });
  if (!context || !sourceContext) return null;

  canvas.width = canvas.height = padded ? 232 : PATCH_SIZE;
  const paddingPatch = padded ? context.createImageData(canvas.width, canvas.height) : null;
  let texture: ImageData | undefined;
  let currentSource = '';
  let lastFrame: { x: number; y: number; width: number; height: number; stroke: number } | undefined;

  return {
    contains(image: HTMLImageElement, box: DOMRect, x: number, y: number) {
      if (x < 0 || x >= box.width || y < 0 || y >= box.height) return false;
      if (currentSource !== image.currentSrc && image.complete && image.naturalWidth) {
        currentSource = image.currentSrc;
        texture = undefined;
        const filter = getComputedStyle(image).filter;
        if (filter !== 'none' && typeof sourceContext.filter !== 'string') return false;
        buffer.width = image.naturalWidth;
        buffer.height = image.naturalHeight;
        sourceContext.filter = filter;
        sourceContext.drawImage(image, 0, 0);
        try {
          texture = sourceContext.getImageData(0, 0, buffer.width, buffer.height);
        } catch { /* Keep the original artwork if pixel readback is unavailable. */ }
        lastFrame = undefined;
      }
      if (!texture) return false;
      const { width, height, data } = texture;
      const center = (Math.floor(y * height / box.height) * width + Math.floor(x * width / box.width)) * 4;
      return data[center + 3] >= 225 &&
        (!padded || (data[center] > data[center + 1] * 1.45 && data[center] > data[center + 2] * 1.25));
    },
    paint(box: DOMRect, x: number, y: number, stroke: number) {
      if (stroke < .012 || !texture || x < 0 || y < 0 || x >= box.width || y >= box.height) {
        canvas.hidden = true;
        return;
      }
      if (!canvas.hidden && lastFrame && Math.abs(lastFrame.x - x) < .35 && Math.abs(lastFrame.y - y) < .35 &&
          lastFrame.width === box.width && lastFrame.height === box.height &&
          Math.abs(lastFrame.stroke - stroke) < .008) return;
      lastFrame = { x, y, width: box.width, height: box.height, stroke };

      const radius = Math.max(padded ? 54 : 77, Math.min(padded ? 121 : 183, box.width * .155));
      const unit = HALF_PATCH / radius;
      const left = x - radius;
      const top = y - radius;
      const { width, height, data } = texture;
      const sx = width / box.width;
      const sy = height / box.height;
      canvas.style.width = canvas.style.height = 2 * radius + 'px';
      canvas.style.transform = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
      if (paddingPatch) {
        paintPadding(paddingPatch, texture, x * sx, y * sy, radius * sx, radius * sy, stroke);
        context.putImageData(paddingPatch, 0, 0);
        canvas.hidden = false;
        return;
      }
      const center = (Math.floor(y * sy) * width + Math.floor(x * sx)) * 4;
      const eyesInStroke = eyes.map(eye => ({
        x: (eye.x * box.width - left) * unit,
        y: (eye.y * box.height - top) * unit,
        radius: eye.r * box.width * unit,
      })).filter(eye => Math.hypot(eye.x - HALF_PATCH, eye.y - HALF_PATCH) < HALF_PATCH + eye.radius * 1.15);

      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
      context.clearRect(0, 0, PATCH_SIZE, PATCH_SIZE);
      context.drawImage(buffer, left * sx, top * sy, 2 * radius * sx, 2 * radius * sy, 0, 0, PATCH_SIZE, PATCH_SIZE);

      const compression = context.createRadialGradient(HALF_PATCH, HALF_PATCH, 0, HALF_PATCH, HALF_PATCH, HALF_PATCH);
      compression.addColorStop(0, 'rgba(14, 3, 5, .27)');
      compression.addColorStop(.65, 'rgba(14, 3, 5, .06)');
      compression.addColorStop(1, 'rgba(14, 3, 5, 0)');
      context.globalCompositeOperation = 'source-atop';
      context.globalAlpha = stroke;
      context.fillStyle = compression;
      context.fillRect(0, 0, PATCH_SIZE, PATCH_SIZE);

      const strands = Array.from({ length: 5 }, () => new Path2D());
      const spacing = radius / 29;
      for (let row = Math.floor(top / spacing); row <= (y + radius) / spacing; row++) {
        for (let col = Math.floor(left / spacing); col <= (x + radius) / spacing; col++) {
          const rx = (col + noise(col, row, 1)) * spacing;
          const ry = (row + noise(col, row, 2)) * spacing;
          const dx = rx - x;
          const dy = ry - y;
          const distance = Math.hypot(dx, dy) / radius;
          if (distance >= 1 || rx < 0 || ry < 0 || rx >= box.width || ry >= box.height) continue;
          const pixel = (Math.floor(ry * sy) * width + Math.floor(rx * sx)) * 4;
          if (data[pixel + 3] < 225) continue;

          const falloff = (1 - distance) ** 2 * (1 + 2 * distance);
          const f = falloff * stroke;
          const seed = noise(col, row, 3);
          const length = HALF_PATCH * (.125 + seed * .135);
          const angle = Math.atan2(ry - box.height * .18, (rx - box.width * .5) * .68) + (seed - .5) * 1.75;
          const leanX = Math.cos(angle) * length * .4;
          const leanY = Math.sin(angle) * length * .4;
          const norm = Math.max(1, Math.hypot(dx, dy));
          const bendX = dx / norm * f * length * 1.5;
          const bendY = dy / norm * f * length * 1.5;
          const fold = f * .35;
          const rootX = (rx - left) * unit;
          const rootY = (ry - top) * unit;
          const tipX = rootX + leanX * (1 - fold) + bendX;
          const tipY = rootY + leanY * (1 - fold) + bendY;
          const midX = rootX + leanX * .43 + bendX * .13;
          const midY = rootY + leanY * .43 + bendY * .13;
          const taper = (.2 + seed * .62) * Math.min(1, f * 4);
          const sideX = -Math.sin(angle) * taper;
          const sideY = Math.cos(angle) * taper;
          const tint = Math.max(0, Math.min(4, Math.round(2 + (data[pixel] - data[center]) / 35 + (seed - .5) * 2)));
          const strand = strands[tint];
          strand.moveTo(rootX + sideX, rootY + sideY);
          strand.quadraticCurveTo(midX + sideX, midY + sideY, tipX, tipY);
          strand.quadraticCurveTo(midX - sideX, midY - sideY, rootX - sideX, rootY - sideY);
          strand.closePath();
        }
      }

      context.globalAlpha = Math.min(1, stroke * 1.75);
      for (let tint = 0; tint < strands.length; tint++) {
        const gain = [.61, .94, 1.23, 1.65, 2.1][tint];
        const lift = [0, 0, 8, 17, 30][tint];
        const channels = [0, 1, 2].map(channel => Math.min(255, data[center + channel] * gain + lift));
        context.fillStyle = 'rgba(' + channels.join(',') + ',.58)';
        context.fill(strands[tint]);
      }

      context.globalAlpha = Math.min(1, stroke * 12);
      context.globalCompositeOperation = 'destination-in';
      const edge = context.createRadialGradient(HALF_PATCH, HALF_PATCH, 0, HALF_PATCH, HALF_PATCH, HALF_PATCH);
      edge.addColorStop(0, '#000');
      edge.addColorStop(.55, '#000');
      edge.addColorStop(1, '#0000');
      context.fillStyle = edge;
      context.fillRect(0, 0, PATCH_SIZE, PATCH_SIZE);
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'destination-out';
      for (const eye of eyesInStroke) {
        const fade = context.createRadialGradient(eye.x, eye.y, eye.radius, eye.x, eye.y, eye.radius * 1.15);
        fade.addColorStop(0, '#000');
        fade.addColorStop(1, '#0000');
        context.fillStyle = fade;
        context.fillRect(0, 0, PATCH_SIZE, PATCH_SIZE);
      }
      canvas.hidden = false;
    },
  };
}
