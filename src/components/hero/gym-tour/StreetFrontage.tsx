'use client';

import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Sample directly from the same image used in the opening shot. The browser
// shares its downloaded image, and all the facade panels draw in one batch.
const IMAGE_WIDTH = 1836;
const IMAGE_HEIGHT = 856;
type Crop = [left: number, top: number, right: number, bottom: number];

function frontageGeometry() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  function panel(x: number, y: number, z: number, w: number, h: number, [l, t, r, b]: Crop) {
    const base = positions.length / 3;
    for (const [dx, dy] of [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]]) {
      positions.push(x + w * dx, y + h * dy, z);
      uvs.push((dx < 0 ? l : r) / IMAGE_WIDTH, 1 - (dy < 0 ? b : t) / IMAGE_HEIGHT);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  // The letters belong to the blue steel fascia, just above the awning.
  for (const x of [14.5, 19.9]) {
    panel(x, 3.28, -1.54, 3.00, .79, [1512, 517, 1651, 555]);
  }

  // The shutters in the photograph have a warm reflected sky and deep grooves.
  // Dress only their faces: guides, signs, awnings and stairs retain their depth.
  const shutters = [
    { x: -7.15, crop: [431, 563, 554, 626] },
    { x: -3.55, crop: [592, 565, 726, 627] },
    { x: .05, crop: [762, 564, 903, 625] },
    { x: 3.65, crop: [935, 565, 1075, 625] },
    { x: 7.05, crop: [1095, 565, 1176, 618] },
  ] satisfies { x: number; crop: Crop }[];
  for (const { x, crop } of shutters) panel(x, 1.84, .195, 2.99, 2.94, crop);

  // Place the photographed view through the lower glazing behind the physical
  // mullions. Stop before the right-hand entrance so its door swings freely.
  for (let i = 0; i < 10; i++) {
    const left = 401 + 78 * i;
    panel(-8.25 + 1.5 * i, 5.33, -.034, 1.445, 1.55, [left, 441, left + 77, 505]);
  }
  for (let i = 0; i < 5; i++) {
    const left = 762 + i * 83;
    panel(-.75 + 1.5 * i, 6.81, -.034, 1.445, 1.35, [left, 385, left + 81, 435]);
  }
  // Crops are pane-specific, preserving the different occupants and lights.
  const sourceX = [[416, 548], [582, 717], [936, 1083], [1118, 1265]];
  [-7.15, -3.6, 3.6, 7.15].forEach((x, i) => {
    const [left, right] = sourceX[i];
    panel(x, 10.54, .039, 2.84, 2.63, [left, 220, right, 324]);
    // Exclude the photograph's external AC unit. The building has a 3D unit.
    panel(x, 13.93, .039, 2.84, 2.63, [left, 83, i === 2 ? 1050 : right, 185]);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

export default function StreetFrontage() {
  const { invalidate } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const geometry = useMemo(frontageGeometry, []);
  useEffect(() => {
    let mounted = true;
    const map = new THREE.TextureLoader().load('/models/nexus-gym/arrival-street.webp', loaded => {
      if (!mounted) return;
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = 4;
      setTexture(loaded);
      invalidate();
    });
    return () => { mounted = false; map.dispose(); };
  }, [invalidate]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return texture && <mesh geometry={geometry}>
    <meshBasicMaterial map={texture} toneMapped={false} />
  </mesh>;
}
