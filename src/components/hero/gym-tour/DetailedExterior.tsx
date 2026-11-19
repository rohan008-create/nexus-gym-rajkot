'use client';
import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { openEntrance } from './EntranceArchitecture';
import { raiseGymBand } from './raiseGymBand';

const EXTERIOR_URL = '/models/nexus-gym/exterior.glb';
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
      node.geometry = node.geometry.clone();
      raiseGymBand(node.geometry, node.matrixWorld, node.name.includes('official_Nexus_logo') ? 'logo' : node.name.includes('warm_lettering') ? 'lettering' : null);
      geometries.push(node.geometry);
      const prepare = (source: THREE.Material) => {
        if (!materials.has(source)) { const copy = source.clone(); openEntrance(copy); materials.set(source, copy); }
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
      if (mounted) { gl.domElement.dataset.exteriorSource = 'fallback'; invalidate(); }
    });
    return () => { mounted = false; };
  }, [gl, invalidate]);
  useEffect(() => {
    gl.domElement.dataset.exteriorSource = clone ? 'detailed' : 'fallback';
    invalidate();
  }, [clone, gl, invalidate]);
  return clone ? <primitive object={clone} dispose={null} /> : <>{fallback}</>;
}
