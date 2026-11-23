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
export default function DetailedInterior({ requested, fallback }: { requested: boolean; fallback: React.ReactNode }) {
  const { gl, scene, camera, invalidate } = useThree();
  const [asset, setAsset] = useState<GLTF | null>(null);
  const [prepared, setPrepared] = useState(false);
  const clone = useMemo(() => asset?.scene.clone(true), [asset]);
  useEffect(() => {
    if (!clone) return;
    let mounted = true;
    // Compile against the tour's lights before the doorway reveals this room.
    // Keep the procedural room mounted until the detailed shaders are ready.
    gl.compileAsync(clone, camera, scene).then(() => {
      if (mounted) { setPrepared(true); invalidate(); }
    }).catch(() => {
      // The procedural room remains usable if the optional upgrade fails.
      if (mounted) { gl.domElement.dataset.interiorSource = 'fallback'; gl.domElement.dataset.interiorSettled = 'true'; invalidate(); }
    });
    return () => { mounted = false; };
  }, [clone, camera, gl, scene, invalidate]);
  useEffect(() => {
    if (!requested) return;
    let mounted = true;
    loadInterior().then(value => { if (mounted) setAsset(value); }).catch(() => {
      if (mounted) { gl.domElement.dataset.interiorSource = 'fallback'; gl.domElement.dataset.interiorSettled = 'true'; invalidate(); }
    });
    return () => { mounted = false; };
  }, [requested, gl, invalidate]);
  useEffect(() => {
    gl.domElement.dataset.interiorSource = clone && prepared ? 'detailed' : 'fallback';
    if (clone && prepared) gl.domElement.dataset.interiorSettled = 'true';
    invalidate();
  }, [clone, prepared, gl, invalidate]);
  return clone && prepared ? <primitive object={clone} dispose={null} /> : <>{fallback}</>;
}
