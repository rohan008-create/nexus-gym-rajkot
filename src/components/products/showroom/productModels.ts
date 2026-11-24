import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Product } from '../products';
import { applyPackagingArtwork } from '../packagingArtwork';

const colors: Record<string, string> = {
  whey: '#252426', isolate: '#ebe5d7', creatine: '#333135', preworkout: '#752b38',
  peanut: '#9e5a25', gainer: '#302b29', electrolytes: '#becdd9', bar: '#54312e',
  shaker: '#515a65', straps: '#373740', bands: '#853d4b', bag: '#30333b',
};

export function createProductFactory(mobile: boolean, invalidate: () => void) {
  const templates = new Map<string, THREE.Group>();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const pendingArtwork: (() => void)[] = [];
  const segments = mobile ? 18 : 32;
  const cap = new THREE.MeshStandardMaterial({ color: '#25242a', roughness: .64 });
  materials.add(cap);

  function build(product: Product) {
    const group = new THREE.Group();
    group.name = product.name;
    const color = colors[product.id];
    const body = new THREE.MeshStandardMaterial({ color, roughness: .54, metalness: .06 });
    body.userData = { productBody: true, baseColor: color };
    materials.add(body);
    const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, y: number, z = 0) => {
      geometries.add(geometry);
      const object = new THREE.Mesh(geometry, material);
      object.position.set(0, y, z);
      object.castShadow = !mobile;
      object.userData.productId = product.id;
      group.add(object);
      return object;
    };
    const box = (width: number, height: number, depth: number, y: number, z = 0, material = body) =>
      mesh(new THREE.BoxGeometry(width, height, depth), material, y, z);

    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const darkLabel = ['bar', 'bag', 'bands', 'straps', 'gainer', 'shaker', 'preworkout'].includes(product.id);
    ctx.fillStyle = darkLabel ? color : '#eee8dd';
    ctx.fillRect(0, 0, 384, 256);
    ctx.fillStyle = '#ac2838';
    ctx.fillRect(0, 234, 384, 22);
    ctx.fillStyle = darkLabel ? '#faf4ed' : '#242329';
    ctx.textAlign = 'center';
    ctx.font = 'bold 31px Arial';
    ctx.fillText('NEXUS', 192, 75);
    ctx.font = '900 44px Arial';
    const names = product.name.replace(/^Nexus /, '').toUpperCase().split(' ');
    ctx.fillText(names[0], 192, 144, 340);
    ctx.fillText(names.slice(1).join(' '), 192, 195, 340);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    textures.add(texture);
    pendingArtwork.push(applyPackagingArtwork(product.id, canvas, () => {
      texture.needsUpdate = true;
      invalidate();
    }));
    const label = new THREE.MeshStandardMaterial({ map: texture, roughness: .7 });
    materials.add(label);

    let height: number;
    if (['gainer', 'electrolytes', 'bar', 'bag'].includes(product.id)) {
      const bar = product.id === 'bar';
      const bag = product.id === 'bag';
      height = bar ? .15 : bag ? .39 : .61;
      const width = bar ? .51 : bag ? .60 : .36;
      const depth = bag ? .29 : .11;
      const radius = bag ? .055 : bar ? .025 : .036;
      mesh(new RoundedBoxGeometry(width, height, depth, mobile ? 2 : 3, radius), body, height / 2);
      box(width, .035, depth * .78, height - .018, 0, cap);
      mesh(new THREE.PlaneGeometry(width * (bag ? .5 : .88), height * .77), label, height / 2, depth / 2 + .002);
      if (bag) {
        for (const offset of [-.08, .08]) {
          mesh(new THREE.TorusGeometry(.13, .018, 8, 18, Math.PI), cap, height, offset);
        }
        height += .13;
      }
    } else if (product.id === 'bands' || product.id === 'straps') {
      const bands = product.id === 'bands';
      const count = bands ? 3 : 2;
      height = count * .085;
      for (let i = 0; i < count; i++) {
        const loop = mesh(new THREE.TorusGeometry(.14, .034, 8, segments), i % 2 ? cap : body, .055 + i * .085);
        loop.rotation.x = Math.PI / 2;
        loop.scale.x = 1.5;
      }
      if (!bands) box(.26, .024, .12, .023, .12);
      mesh(new THREE.PlaneGeometry(.15, .075), label, height * .57, .175);
    } else {
      const shaker = product.id === 'shaker';
      const tall = product.id === 'whey' || product.id === 'isolate';
      const radius = shaker ? .126 : tall ? .175 : .148;
      const barrel = shaker ? .55 : tall ? .47 : .28;
      const bottom = radius * (shaker ? .82 : .98);
      const silhouette = [[0, 0], [bottom * .94, 0], [bottom, .016],
        [radius, barrel - .026], [radius * .98, barrel], [radius * .87, barrel + .053], [0, barrel + .053]];
      mesh(new THREE.LatheGeometry(silhouette.map(([x, y]) => new THREE.Vector2(x, y)), segments), body, 0);
      const capProfile = [[0, 0], [radius * .87, 0], [radius * .91, .007], [radius * .91, .064],
        [radius * .87, .071], [0, .071]];
      mesh(new THREE.LatheGeometry(capProfile.map(([x, y]) => new THREE.Vector2(x, y)), segments),
        product.id === 'isolate' ? body : cap, barrel + .046);
      if (shaker) box(.10, .035, .11, barrel + .126, .028, cap);
      mesh(new THREE.CylinderGeometry(radius + .001, radius * (shaker ? .88 : 1) + .001, barrel * .74, segments, 1, true, -1.05, 2.1),
        label, barrel * .49);
      height = barrel + (shaker ? .145 : .116);
    }
    group.userData.height = height;
    return group;
  }

  return {
    create(product: Product) {
      if (!templates.has(product.id)) templates.set(product.id, build(product));
      return templates.get(product.id)!.clone(true);
    },
    dispose() {
      pendingArtwork.forEach(cancel => cancel());
      geometries.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      textures.forEach(item => item.dispose());
    },
  };
}
