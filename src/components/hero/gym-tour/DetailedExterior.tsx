'use client';
import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { openEntrance } from './EntranceArchitecture';
import { raiseGymBand } from './raiseGymBand';

const EXTERIOR_URL = '/models/nexus-gym/exterior.glb';
// Calibrated for the tour's daylight rig. Colors here are material albedos;
// the photograph already includes sun and skylight.
const exteriorFinish: Record<string, string> = {
  'charcoal ACM': '#202226',
  'black frames': '#17191c',
  'deep shadow': '#121112',
  shutters: '#514842',
  'brushed aluminium': '#a1988d',
  'plaster shade': '#ae9e92',
  'cut stone': '#e8d3c6',
  plaster: '#ffe4d4',
  pavement: '#c9aa95',
  asphalt: '#a08883',
  'gym glazing': '#a6c8d4',
  'upper glazing': '#a6c8d4',
  'Nexus red': '#e0121a',
};

function prepareExteriorMaterial(source: THREE.Material) {
  const copy = source.clone();
  if (copy instanceof THREE.MeshStandardMaterial && exteriorFinish[source.name]) {
    copy.color.set(exteriorFinish[source.name]);
    // Keep an edge highlight on the stair nosing without whitening the fascia.
    if (source.name === 'charcoal ACM') copy.envMapIntensity = .35;
    if (source.name === 'brushed aluminium') copy.roughness = .48;
  }
  openEntrance(copy);
  return copy;
}
// One fixed optional asset, shared across route changes/replay. Clones below
// preserve the cached source; the height-adjusted geometry/materials are owned.
let cachedExterior: Promise<GLTF> | undefined;
function loadExterior() {
  if (!cachedExterior) cachedExterior = new GLTFLoader().loadAsync(EXTERIOR_URL).catch(error => {
    cachedExterior = undefined;
    throw error;
  });
  return cachedExterior;
}
export default function DetailedExterior({ fallback }: { fallback: React.ReactNode }) {
  const { gl, invalidate } = useThree();
  const [asset, setAsset] = useState<GLTF | null>(null);
  const prepared = useMemo(() => {
    if (!asset) return null;
    const object = asset.scene.clone(true);
    const materials = new Map<THREE.Material, THREE.Material>();
    const geometries: THREE.BufferGeometry[] = [];
    object.updateWorldMatrix(true, true);
    object.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.receiveShadow = true;
      node.castShadow = !node.name.toLowerCase().includes('glaz');
      node.geometry = node.geometry.clone();
      raiseGymBand(node.geometry, node.matrixWorld, node.name.includes('official_Nexus_logo') ? 'logo' : node.name.includes('warm_lettering') ? 'lettering' : null);
      geometries.push(node.geometry);
      const prepare = (source: THREE.Material) => {
        if (!materials.has(source)) materials.set(source, prepareExteriorMaterial(source));
        return materials.get(source)!;
      };
      node.material = Array.isArray(node.material) ? node.material.map(prepare) : prepare(node.material);
    });
    return { object, materials, geometries };
  }, [asset]);
  const clone = prepared?.object;
  useEffect(() => () => { prepared?.materials.forEach(material => material.dispose()); prepared?.geometries.forEach(geometry => geometry.dispose()); }, [prepared]);
  useEffect(() => {
    let mounted = true;
    loadExterior().then(value => { if (mounted) setAsset(value); }).catch(() => {
      // Decorative upgrade only: the existing procedural facade stays usable.
      // Do not throw an optional network failure into the scene error boundary.
      if (mounted) { gl.domElement.dataset.exteriorSource = 'fallback'; gl.domElement.dataset.exteriorSettled = 'true'; invalidate(); }
    });
    return () => { mounted = false; };
  }, [gl, invalidate]);
  useEffect(() => {
    gl.domElement.dataset.exteriorSource = clone ? 'detailed' : 'fallback';
    if (clone) gl.domElement.dataset.exteriorSettled = 'true';
    invalidate();
  }, [clone, gl, invalidate]);
  return clone ? <primitive object={clone} dispose={null} /> : <>{fallback}</>;
}
