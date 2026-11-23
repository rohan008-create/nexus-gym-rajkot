'use client';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Uses the GLB's local floor height; the parent supplies its .31m lift.
export default function InteriorDesign() {
  const design = useMemo(() => {
    const materials = {
      timber: new THREE.MeshStandardMaterial({ color: '#77503b', roughness: .8 }),
      frame: new THREE.MeshStandardMaterial({ color: '#171c20', metalness: .35, roughness: .48 }),
      warm: new THREE.MeshBasicMaterial({ color: '#ffe2b3', toneMapped: false }),
      red: new THREE.MeshBasicMaterial({ color: '#d92236', toneMapped: false }),
      turf: new THREE.MeshStandardMaterial({ color: '#34483e', roughness: 1 }),
      ink: new THREE.MeshBasicMaterial({ color: '#c8c5b8', toneMapped: false }),
    };
    type Key = keyof typeof materials;
    const buckets: Partial<Record<Key, THREE.BufferGeometry[]>> = {};
    const box = (key: Key, x: number, y: number, z: number, w: number, h: number, d: number) => {
      (buckets[key] ??= []).push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
    };
    // Timber wainscot below the slogan and acoustic ribs above the free weights.
    for (let x = .55; x < 8.5; x += .18) box('timber', x, 4.82, -11.82, .065, .55, .035);
    for (let z = -2.5; z > -11.6; z -= .22) box('timber', -8.985, 6.48, z, .04, 1.9, .075);
    box('warm', 4.3, 7.39, -11.74, 7.8, .025, .045);
    box('red', 4.3, 4.48, -11.77, 7.75, .035, .045);
    box('warm', -4.57, 4.45, -11.73, 8.5, .025, .035);
    for (const x of [-8.83, 8.83]) {
      box('frame', x, 7.35, -6.8, .17, .10, 9.8);
      box('warm', x, 7.29, -6.8, .045, .025, 9.7);
    }
    // Floating light frames follow the equipment bays, leaving the entry open.
    for (const x of [-5.9, -2.7, 4.3]) {
      const w = x > 0 ? 4.6 : 2.35;
      for (const z of [-4.3, -10.4]) {
        box('frame', x, 7.28, z, w, .08, .12);
        box('warm', x, 7.232, z, w - .12, .018, .045);
      }
      for (const edge of [-1, 1]) {
        box('frame', x + edge * w / 2, 7.28, -7.35, .12, .08, 6.2);
        box('warm', x + edge * w / 2, 7.232, -7.35, .045, .018, 6.15);
      }
    }
    box('turf', .78, 4.222, -7.8, 1.45, .018, 7.8);
    for (const x of [.08, 1.48]) box('ink', x, 4.235, -7.8, .025, .006, 7.72);
    for (let z = -4.4; z > -11.6; z -= .9) {
      box('ink', .78, 4.235, z, 1.4, .006, .025);
      box('red', .78, 4.24, z - .07, .16, .006, .07);
    }
    const parts = Object.entries(buckets).map(([key, geometries]) => {
      const geometry = mergeGeometries(geometries)!;
      geometries.forEach(g => g.dispose());
      return { geometry, material: materials[key as Key] };
    });
    return { parts, dispose() { parts.forEach(p => p.geometry.dispose()); Object.values(materials).forEach(m => m.dispose()); } };
  }, []);
  useEffect(() => () => design.dispose(), [design]);
  return <group name="Nexus interior finishes" dispose={null}>
    {design.parts.map((part, i) => <mesh key={i} geometry={part.geometry} material={part.material} />)}
    <ZoneSign text="01 / STRENGTH" position={[-4.6, 7.12, -11.71]} />
    <ZoneSign text="02 / CARDIO" position={[4.3, 7.12, -11.7]} />
  </group>;
}

function ZoneSign({ text, position }: { text: string; position: [number, number, number] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#151b1e'; ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = '#e3243e'; ctx.fillRect(28, 36, 6, 56);
    ctx.font = '500 48px Arial'; ctx.fillStyle = '#eee7db'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 530, 68);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position}><planeGeometry args={[3.3, .4125]} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>;
}
