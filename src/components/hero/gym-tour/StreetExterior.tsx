'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { clamp, type TourPlayback } from './gymTourConfig';
import StreetTrees from './StreetTrees';
import StreetFrontage from './StreetFrontage';

let streetSource: Promise<THREE.Group> | undefined;
function loadStreet() {
  streetSource ??= new GLTFLoader().loadAsync('/models/nexus-gym/street.glb')
    .then(asset => asset.scene)
    .catch(error => { streetSource = undefined; throw error; });
  return streetSource;
}

function StreetSurfaces() {
  const { invalidate } = useThree();
  // Match the two road heights in the existing models. The apron is lower
  // than the traffic lane so its painted parking stripes remain visible.
  const roadway = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(175, 1, 1, 3);
    const positions = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const rows = [[4.9, -.054], [8.82, -.054], [8.9, -.029], [27.1, -.029]];
    rows.forEach(([z, y], row) => {
      for (let side = 0; side < 2; side++) {
        const i = row * 2 + side;
        positions.setXYZ(i, positions.getX(i), y, z);
        uv.setY(i, (27.1 - z) / 18.2);
      }
    });
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => roadway.dispose(), [roadway]);
  const [maps, setMaps] = useState<{sky?: THREE.Texture; asphalt?: THREE.Texture}>({});
  useEffect(() => {
    let mounted = true;
    const loader = new THREE.TextureLoader();
    const textures = (['sky', 'asphalt'] as const).map(name => loader.load(
      '/models/nexus-gym/street-' + name + '.webp',
      texture => {
        if (!mounted) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        if (name === 'asphalt') {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(69, 5);
          texture.anisotropy = 4;
        }
        setMaps(old => ({...old, [name]:texture}));
        invalidate();
      }
    ));
    return () => { mounted = false; textures.forEach(texture => texture.dispose()); };
  }, [invalidate]);
  return <>
    {maps.sky && <mesh position={[0,36,-99]}><planeGeometry args={[245,90]}/>
      <meshBasicMaterial map={maps.sky} toneMapped={false} depthWrite={false}/></mesh>}
    {maps.asphalt && <mesh geometry={roadway}>
      <meshStandardMaterial map={maps.asphalt} color="#ffe0d3" roughness={1}/></mesh>}
  </>;
}

function TrafficShadow({ width, depth }: { width: number; depth: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const fade = ctx.createRadialGradient(32,32,4,32,32,32);
    fade.addColorStop(0, 'rgba(17,20,19,.76)');
    fade.addColorStop(.64, 'rgba(25,26,24,.47)');
    fade.addColorStop(1, 'rgba(25,26,24,0)');
    ctx.fillStyle = fade; ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh rotation={[-Math.PI/2,0,0]} position={[-.22,.016,-.16]}>
    <planeGeometry args={[width,depth]}/><meshBasicMaterial map={texture} transparent depthWrite={false}/>
  </mesh>;
}

export default function StreetExterior({ motion }: { motion: TourPlayback }) {
  const { invalidate, size } = useThree();
  const [street, setStreet] = useState<THREE.Group>();
  const autoShadow = useRef<THREE.Group>(null);
  const bikeShadow = useRef<THREE.Group>(null);
  const group = useRef<THREE.Group>(null);
  const traffic = useRef<{rickshaw:THREE.Object3D; scooter:THREE.Object3D}>();
  useEffect(() => {
    let mounted = true;
    loadStreet().then(source => {
      if (!mounted) return;
      const clone = source.clone(true);
      traffic.current = {rickshaw: clone.getObjectByName('Rickshaw')!, scooter: clone.getObjectByName('Scooter')!};
      setStreet(clone);
      invalidate();
    }).catch(() => { /* The existing facade also works without street props. */ });
    return () => { mounted = false; traffic.current = undefined; };
  }, [invalidate]);
  useFrame(() => {
    if(group.current) group.current.visible = motion.progress < .60;
    const cars = traffic.current;
    if (!cars) return;
    const travel = clamp(motion.progress / .115);
    const portrait = size.width < size.height;
    cars.rickshaw.position.set((portrait ? -4.5 : -7.6) + travel * 34, -.032, 9.65);
    cars.scooter.position.set((portrait ? 5.5 : 9.4) + travel * 29, -.032, 10.9);
    autoShadow.current?.position.copy(cars.rickshaw.position);
    bikeShadow.current?.position.copy(cars.scooter.position);
  });
  return <>
    <StreetFrontage />
    <group ref={group}>
    {street && <primitive object={street} dispose={null}/>}
    <StreetSurfaces />
    {street && <>
      <group ref={autoShadow}><TrafficShadow width={3.55} depth={1.8}/></group>
      <group ref={bikeShadow}><TrafficShadow width={2.70} depth={1.0}/></group>
    </>}
    <StreetTrees />
    </group>
  </>;
}
