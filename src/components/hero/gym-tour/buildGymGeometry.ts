import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Part = { geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial };
export function buildGymGeometry() {
  const materials = {
    concrete: new THREE.MeshStandardMaterial({ color: '#c7c1aa', roughness: .95 }),
    frame: new THREE.MeshStandardMaterial({ color: '#20272a', roughness: .55, metalness: .25 }),
    glass: new THREE.MeshStandardMaterial({ color: '#48717b', roughness: .24, metalness: .5 }),
    red: new THREE.MeshStandardMaterial({ color: '#d51f37', roughness: .4, metalness: .15 }),
    floor: new THREE.MeshStandardMaterial({ color: '#414647', roughness: .95 }),
    steel: new THREE.MeshStandardMaterial({ color: '#a5afb1', roughness: .35, metalness: .65 }),
    black: new THREE.MeshStandardMaterial({ color: '#101416', roughness: .62 }),
    light: new THREE.MeshStandardMaterial({ color: '#fff2dc', emissive: '#fff2dc', emissiveIntensity: .6 }),
    street: new THREE.MeshStandardMaterial({ color: '#a4a69d', roughness: 1 }),
  };
  type Key = keyof typeof materials;
  const box = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const matrix = new THREE.Matrix4(), rotation = new THREE.Euler(), quaternion = new THREE.Quaternion();
  const pos = new THREE.Vector3(), scale = new THREE.Vector3();
  function group(build: (add: (key: Key, p: number[], s: number[], r?: number[], round?: boolean) => void) => void): Part[] {
    const buckets: Partial<Record<Key, THREE.BufferGeometry[]>> = {};
    const add = (key: Key, p: number[], s: number[], r = [0, 0, 0], round = false) => {
      pos.set(p[0], p[1], p[2]); scale.set(s[0], s[1], s[2]); rotation.set(r[0], r[1], r[2]); quaternion.setFromEuler(rotation);
      matrix.compose(pos, quaternion, scale);
      (buckets[key] ??= []).push((round ? cylinder : box).clone().applyMatrix4(matrix));
    };
    build(add);
    return Object.entries(buckets).map(([key, geometries]) => {
      const geometry = mergeGeometries(geometries, false)!; geometries.forEach(g => g.dispose());
      geometry.computeBoundingSphere();
      return { geometry, material: materials[key as Key] };
    });
  }
  const exterior = group(add => {
    add('street', [0, -.22, -2], [65, .3, 50]);
    add('concrete', [0, .1, -5], [22, .4, 16]);
    // Recognizable first-floor gym, with the taller beige/glass building above.
    add('concrete', [0, 2, -6], [18, 4, 12]);
    for (let x = -7.4; x < 8; x += 3.7) {
      add('frame', [x, 2, .08], [3.4, 3.1, .2]);
      for (let j = 0; j < 8; j++) add('steel', [x, .7 + j * .36, .22], [3.2, .035, .025]);
    }
    add('frame', [0, 6, -6], [18.5, 4, 12]);
    add('glass', [0, 6.1, .05], [17.8, 2.9, .15]);
    for (let x = -9; x <= 9; x += 3) add('frame', [x, 6, .22], [.13, 3.8, .18]);
    add('frame', [0, 6, .23], [18, .1, .15]);
    add('frame', [0, 7.7, .3], [18.7, .6, .4]);
    add('red', [0, 4.15, .24], [18.7, .08, .4]);
    add('concrete', [0, 11.5, -6], [18, 7, 12]);
    for (let x = -7; x <= 7; x += 3.5) for (const y of [9.8, 13.2]) {
      add('glass', [x, y, .04], [2.65, 2.3, .15]);
      add('concrete', [x, y, .15], [.12, 2.4, .3]);
    }
    add('concrete', [0, 15.15, -6], [18.6, .3, 12.6]);
    // The approach, treads and top landing share the doorway centreline.
    for (let i = 0; i < 20; i++) add('frame', [8.05, .24 + (i + .5) * .21, 8.8 - i * .355], [2.1, .15, .38]);
    add('frame', [8.04, 4.42, 1.7], [2.24, .18, 1.45]);
    for (const x of [7.06, 9.04]) {
      for (let i = 0; i < 20; i += 3) add('steel', [x, .795 + (i + .5) * .21, 8.8 - i * .355], [.05, .95, .05]);
      add('steel', [x, 3.3, 5.35], [.055, .055, 8.4], [.545, 0, 0]);
    }
    // Understated pavement and parking marks establish human scale.
    for (const x of [-10, -6, -2, 2, 6]) add('light', [x, -.04, 7], [.07, .025, 3.6]);
    add('red', [0, 8.1, .28], [18.7, .06, .5]);
  });
  const interior = group(add => {
    add('floor', [0, 4.08, -6], [18.5, .25, 12.5]);
    add('frame', [0, 5.9, -12.1], [18.5, 3.5, .22]);
    add('frame', [-9.15, 5.9, -6], [.22, 3.5, 12.5]);
    add('glass', [9.1, 5.9, -6], [.15, 3.4, 12.2]);
    for (let x = -8; x < 9; x += 2) add('black', [x, 4.23, -6], [.025, .015, 12]);
    for (let z = -1; z > -12; z -= 2) add('black', [0, 4.23, z], [18, .015, .025]);
    // Silver mirror panels are deliberately a cheap surface, not realtime mirrors.
    for (let x = -7.5; x < 0; x += 2.5) add('steel', [x, 5.8, -11.92], [2.35, 2.55, .04]);
    add('red', [0, 7.25, -11.9], [17.8, .09, .06]);
    for (const x of [-7, -1, 5]) add('light', [x, 7.5, -6], [.08, .07, 10]);
    // Strength stations: each repeated unit is baked into material buckets.
    for (const x of [-6, -2.8]) {
      for (const z of [-6, -9]) {
        for (const dx of [-.9, .9]) {
          add('steel', [x + dx, 5.5, z], [.09, 2.55, .09]);
          add('black', [x + dx, 4.3, z], [.6, .12, 1.3]);
        }
        add('red', [x, 6.7, z], [1.9, .1, .1]);
        add('steel', [x, 5.7, z + .15], [2.65, .055, .055]);
        for (const dx of [-1.05, 1.05]) add('black', [x + dx, 5.7, z + .15], [.37, .12, .37], [0, 0, Math.PI / 2], true);
        add('red', [x, 4.8, z + .7], [.6, .18, 1.6]);
        for (const dz of [.15, 1.2]) add('steel', [x, 4.48, z + dz], [.4, .55, .12]);
      }
    }
    // Dumbbell rack down the left wall.
    for (const z of [-3, -4.3, -5.6, -6.9, -8.2]) {
      add('steel', [-8.2, 4.7, z], [.5, .9, .1]);
      for (const y of [4.9, 5.45]) {
        add('frame', [-8.2, y, z], [.65, .08, 1.15]);
        for (const dz of [-.32, .05, .4]) {
          add('steel', [-8.2, y + .16, z + dz], [.5, .05, .05]);
          for (const dx of [-.21, .21]) add('black', [-8.2 + dx, y + .16, z + dz], [.11, .22, .22]);
        }
      }
    }
    // Cardio machines face the windows; screens and angled handles read clearly.
    for (const x of [3.3, 5.6, 7.9]) for (const z of [-5, -9]) {
      add('black', [x, 4.38, z], [1.25, .3, 2.5]);
      add('frame', [x, 4.56, z], [.9, .035, 2]);
      for (const dx of [-.58, .58]) add('steel', [x + dx, 5.1, z - .9], [.065, 1.2, .065], [-.22, 0, 0]);
      add('frame', [x, 5.7, z - 1], [1.2, .12, .4]);
      add('glass', [x, 5.8, z - 1], [.62, .09, .25]);
      add('red', [x, 4.6, z + 1.2], [.95, .06, .05]);
    }
  });
  box.dispose(); cylinder.dispose();
  return { exterior, interior, dispose: () => { [...exterior, ...interior].forEach(p => p.geometry.dispose()); Object.values(materials).forEach(m => m.dispose()); } };
}
