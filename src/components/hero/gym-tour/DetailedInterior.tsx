'use client';
import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const INTERIOR_URL = '/models/nexus-gym/interior.glb';
// A single optional asset cache. Mounted clones share immutable source resources.
// Never dispose the shared cached geometry/materials from an individual mount.
let cachedInterior: Promise<GLTF> | undefined;
function loadInterior() {
  if (!cachedInterior) cachedInterior = new GLTFLoader().loadAsync(INTERIOR_URL).catch(error => {
    cachedInterior = undefined;
    throw error;
  });
  return cachedInterior;
}
export default function DetailedInterior({ active, fallback }: { active: boolean; fallback: React.ReactNode }) {
  const { gl, invalidate } = useThree();
  const [asset, setAsset] = useState<GLTF | null>(null);
  const clone = useMemo(() => asset?.scene.clone(true), [asset]);
  useEffect(() => {
    if (!active || asset) return;
    let mounted = true;
    // Wait until the hero is interactive; do not parse another GLB during the
    // punching-bag impact. The procedural interior remains immediately usable.
    const timer = setTimeout(() => {
      loadInterior().then(value => { if (mounted) setAsset(value); }).catch(() => {
        if (mounted) { gl.domElement.dataset.interiorSource = 'fallback'; invalidate(); }
      });
    }, 350);
    return () => { mounted = false; clearTimeout(timer); };
  }, [active, asset, gl, invalidate]);
  useEffect(() => {
    gl.domElement.dataset.interiorSource = clone ? 'detailed' : 'fallback';
    invalidate();
  }, [clone, gl, invalidate]);
  return clone ? <primitive object={clone} dispose={null} /> : <>{fallback}</>;
}
