'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { clamp, COMPLEX_SETBACK, type TourPlayback } from './gymTourConfig';
import StreetTrees from './StreetTrees';
import StreetFrontage from './StreetFrontage';
import { useNightScene } from './useNightScene';

let streetSource: Promise<THREE.Group> | undefined;
function loadStreet() {
  streetSource ??= new GLTFLoader().loadAsync('/models/nexus-gym/street.glb')
    .then(asset => asset.scene)
    .catch(error => { streetSource = undefined; throw error; });
  return streetSource;
}

function StreetSurfaces() {
  const { invalidate } = useThree();
  const night = useNightScene();
  useEffect(() => { invalidate(); }, [night, invalidate]);
  // Match the two road heights in the existing models. The apron is lower
  // than the traffic lane so its painted parking stripes remain visible.
  const roadway = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(175, 1, 1, 3);
    const positions = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    const rows = [[4.9, -.035], [8.82, -.035], [8.9, -.029], [120, -.029]];
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
      <meshBasicMaterial map={maps.sky} color={night ? '#10182f' : '#ffffff'} toneMapped={false} depthWrite={false}/></mesh>}
    {maps.asphalt && <mesh geometry={roadway} receiveShadow>
      <meshStandardMaterial map={maps.asphalt} color="#a7b0b7" roughness={.96}/></mesh>}
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

export default function StreetExterior({ motion, active }: { motion: TourPlayback; active: boolean }) {
  const { invalidate, gl } = useThree();
  const elapsed = useRef(0);
  const [street, setStreet] = useState<THREE.Group>();
  const autoShadow = useRef<THREE.Group>(null);
  const bikeShadow = useRef<THREE.Group>(null);
  const group = useRef<THREE.Group>(null);
  const traffic = useRef<{rickshaw:THREE.Object3D; scooter:THREE.Object3D} | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    loadStreet().then(source => {
      if (!mounted) return;
      const clone = source.clone(true);
      clone.traverse(node => { if (node instanceof THREE.Mesh) { node.castShadow = true; node.receiveShadow = true; } });
      traffic.current = {rickshaw: clone.getObjectByName('Rickshaw')!, scooter: clone.getObjectByName('Scooter')!};
      setStreet(clone);
      invalidate();
    }).catch(() => { /* The existing facade also works without street props. */ });
    return () => { mounted = false; traffic.current = undefined; };
  }, [invalidate]);
  useFrame((_, delta) => {
    if(group.current) group.current.visible = motion.progress < .60;
    const cars = traffic.current;
    if (!cars || !active || document.hidden || motion.progress >= .60) return;
    if (motion.progress < .12) elapsed.current += Math.min(delta,.1);
    const travel = clamp(motion.progress / .115);
    const autoX = ((elapsed.current * 1.8 + 13) % 48) - 24;
    const bikeX = 24 - ((elapsed.current * 2.8 + 13) % 48);
    cars.rickshaw.position.set(autoX + travel * 48, -.029, 9.1);
    cars.scooter.position.set(bikeX - travel * 48, -.029, 10.5);
    cars.scooter.rotation.y = Math.PI;
    for (const [vehicle, distance] of [[cars.rickshaw, -elapsed.current * 1.8], [cars.scooter, -elapsed.current * 2.8]] as const) {
      vehicle.traverse(node => { if (node.name.startsWith('Wheel_')) node.rotation.z = distance / (node.userData.radius || .3); });
    }
    gl.domElement.dataset.trafficWheelRotation = cars.rickshaw.getObjectByName('Wheel_0')?.rotation.z.toFixed(3) || '0';
    gl.domElement.dataset.streetSource = '3d';
    gl.domElement.dataset.trafficPosition = `${autoX.toFixed(3)},${bikeX.toFixed(3)}`;
    gl.domElement.dataset.trafficTime = elapsed.current.toFixed(3);
    autoShadow.current?.position.copy(cars.rickshaw.position);
    bikeShadow.current?.position.copy(cars.scooter.position);
    if (motion.progress < .12) invalidate();
  });
  return <>
    <group position={[0, 0, -COMPLEX_SETBACK]}><StreetFrontage /></group>
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
