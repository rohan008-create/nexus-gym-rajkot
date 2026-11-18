'use client';
import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const EXTERIOR_URL = '/models/nexus-gym/exterior.glb';
// One fixed optional asset, shared across route changes/replay. Clones below
// share its immutable geometry/materials; individual mounts never dispose it.
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
  const clone = useMemo(() => asset?.scene.clone(true), [asset]);
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
