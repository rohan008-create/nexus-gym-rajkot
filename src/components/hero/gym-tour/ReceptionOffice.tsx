'use client';
import { Suspense, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { smooth, type TourPlayback } from './gymTourConfig';

function DeskHost({ asset, motion }: { asset: GLTF; motion: TourPlayback }) {
  const rig = useMemo(() => {
    const avatar = clone(asset.scene);
    const bounds = new THREE.Box3().setFromObject(avatar);
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.74 / (bounds.max.y - bounds.min.y);
    avatar.scale.multiplyScalar(scale);
    avatar.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    const direction = new THREE.Vector3(), goal = new THREE.Vector3();
    const start = new THREE.Vector3(), rotation = new THREE.Quaternion(), parent = new THREE.Quaternion();
    function limb(side: string, from: string, to: string) {
      const bone = avatar.getObjectByName('mixamorig' + side + from)!;
      const child = avatar.getObjectByName('mixamorig' + side + to)!;
      const rest = bone.quaternion.clone();
      return (x: number, y: number, z: number) => {
        bone.quaternion.copy(rest);
        bone.getWorldPosition(start);
        child.getWorldPosition(direction).sub(start).normalize();
        rotation.setFromUnitVectors(direction, goal.set(x,y,z).normalize());
        bone.getWorldQuaternion(parent).premultiply(rotation);
        bone.quaternion.copy(bone.parent!.getWorldQuaternion(rotation).invert().multiply(parent));
      };
    }
    const sides = ['Left','Right'].map((side,i) => ({
      sign: i === 0 ? 1 : -1, thigh: limb(side,'UpLeg','Leg'), shin: limb(side,'Leg','Foot'),
      arm: limb(side,'Arm','ForeArm'), forearm: limb(side,'ForeArm','Hand'),
      hand: limb(side,'Hand','HandMiddle1'), wrist: avatar.getObjectByName('mixamorig'+side+'Hand')!,
      index: avatar.getObjectByName('mixamorig'+side+'HandIndex1')!, pinky: avatar.getObjectByName('mixamorig'+side+'HandPinky1')!
    }));
    return {avatar,sides, across: new THREE.Vector3(), point: new THREE.Vector3(), up: new THREE.Vector3(0,1,0), twist: new THREE.Quaternion()};
  }, [asset]);
  const anchor = useRef<THREE.Group>(null);
  const last = useRef(-1);
  useFrame(() => {
    const p = motion.progress;
    if (p < .45 || p === last.current) return;
    last.current = p;
    const stand = smooth((p-.815)/.025), greet = smooth((p-.835)/.02);
    anchor.current!.position.y = 4.51 - .44*(1-stand);
    for (const {sign, thigh, shin, arm, forearm, hand, wrist, index, pinky} of rig.sides) {
      thigh(0,-.1-stand,1-stand); shin(0,-1,0);
      arm(sign*.05,-1+.52*greet,.58+.32*greet);
      forearm(-sign*(.15+.62*greet),.12+.45*greet,.86-.7*greet);
      hand(0,greet+.01,1-greet);
      if (greet > 0) {
        index.getWorldPosition(rig.across).sub(pinky.getWorldPosition(rig.point));
        const angle = Math.atan2(rig.across.x,rig.across.z);
        const q = wrist.parent!.getWorldQuaternion(rig.twist);
        rig.point.copy(rig.up).applyQuaternion(q.invert());
        wrist.quaternion.premultiply(rig.twist.setFromAxisAngle(rig.point,-angle*greet));
      }
    }
  });
  return <group ref={anchor} position={[6.95,4.07,-2.73]}><primitive object={rig.avatar} dispose={null} /></group>;
}

function Block({ at, size, color }: { at: [number,number,number]; size: [number,number,number]; color: string }) {
  return <mesh position={at}><boxGeometry args={size}/><meshStandardMaterial color={color}/></mesh>;
}

function ReceptionFinishes() {
  const [wood, stone, logo] = useLoader(THREE.TextureLoader, [
    '/models/nexus-gym/walnut.webp', '/models/nexus-gym/limestone.webp', '/models/nexus-gym/reception-wordmark.webp'
  ]);
  for (const texture of [wood, stone, logo]) texture.colorSpace = THREE.SRGBColorSpace;
  return <>
    {/* Bookmatched wall panels with recessed shadow joints. */}
    {[5.39,6.52,7.65,8.78].map(x =>
      <mesh key={x} position={[x,1.6,-3.445]}><boxGeometry args={[1.12,3.18,.075]}/><meshStandardMaterial map={wood} roughness={.65}/></mesh>
    )}
    <mesh position={[7.15,2.02,-3.416]}><boxGeometry args={[2.38,1.04,.025]}/><meshStandardMaterial color="#293032" roughness={.68}/></mesh>
    <mesh position={[7.15,2.02,-3.401]}><planeGeometry args={[1.48,.493]}/><meshBasicMaterial map={logo} transparent alphaTest={.05} toneMapped={false}/></mesh>
    <mesh position={[7.15,1.51,-3.404]}><boxGeometry args={[2.31,.014,.009]}/><meshBasicMaterial color="#ffce94"/></mesh>
    <mesh position={[7.24,.82,-2.05]}><boxGeometry args={[1.5,.075,.72]}/><meshStandardMaterial map={stone} roughness={.46}/></mesh>
    <mesh position={[7.24,.42,-2.01]}><boxGeometry args={[1.34,.78,.54]}/><meshStandardMaterial map={wood}/></mesh>
    <mesh position={[7.24,.76,-1.73]}><boxGeometry args={[1.36,.017,.04]}/><meshBasicMaterial color="#ffd8a8"/></mesh>
    <group position={[6.95,.859,-2.21]}>
      <Block at={[0,.01,0]} size={[.42,.02,.27]} color="#84898c"/>
      <Block at={[0,.022,.035]} size={[.365,.004,.128]} color="#252a30"/>
      <Block at={[0,.022,-.077]} size={[.135,.004,.055]} color="#62686d"/>
      <group position={[0,.019,.13]} rotation={[.22,0,0]}>
        <Block at={[0,.135,0]} size={[.42,.27,.012]} color="#32383e"/>
        <mesh position={[0,.137,-.007]} rotation={[0,Math.PI,0]}><planeGeometry args={[.39,.237]}/><meshBasicMaterial color="#658899"/></mesh>
      </group>
    </group>
    <mesh position={[6.44,3.16,-2]}><boxGeometry args={[5.45,.12,3.4]}/><meshStandardMaterial color="#ddd3c1"/></mesh>
    {[4.35,6.9].map(x=><mesh key={x} position={[x,3.084,-2.75]} rotation={[Math.PI/2,0,0]}><circleGeometry args={[.105,20]}/><meshBasicMaterial color="#ffe2b6" side={THREE.DoubleSide}/></mesh>)}
    <pointLight position={[5.45,2.75,-2.95]} color="#ffd4a1" intensity={5} distance={4}/>
    <group position={[8.8,0,-3.1]}>
      <mesh position={[0,.26,0]}><cylinderGeometry args={[.24,.17,.5,24]}/><meshStandardMaterial color="#666760"/></mesh>
      {Array.from({length:11},(_,i)=><group key={i} rotation={[0,i*2.4,0]}><mesh position={[.1,.77+(i%3)*.065,0]} rotation={[0,0,-.32-(i%4)*.11]} scale={[.095,.41,.035]}><sphereGeometry args={[1,8,6]}/><meshStandardMaterial color={i%2?'#36533f':'#506849'}/></mesh></group>)}
    </group>
  </>;
}

function GymFloorDoor({motion}: {motion: TourPlayback}) {
  const tracks = useRef<THREE.Group>(null);
  const centers = [-.84, -1.56, -2.28];
  useFrame(() => {
    const opening = smooth((motion.progress - .839) / .024);
    tracks.current?.children.forEach((panel, i) => {
      panel.position.z = THREE.MathUtils.lerp(centers[i], -3.08, opening);
    });
  });
  return <group position={[3.5,0,0]}>
    <Block at={[0,1.24,-.45]} size={[.14,2.48,.09]} color="#303637"/>
    <Block at={[0,1.24,-2.67]} size={[.14,2.48,.09]} color="#303637"/>
    <Block at={[0,2.45,-1.56]} size={[.16,.12,2.32]} color="#303637"/>
    {[-.12,.12].map(x => <Block key={x} at={[x,1.65,-3.105]} size={[.045,3.3,.88]} color="#394449"/>)}
    <Block at={[0,2.88,-1.56]} size={[.15,.84,2.33]} color="#394449"/>
    <Block at={[0,1.65,.18]} size={[.15,3.3,1.18]} color="#394449"/>
    <group ref={tracks}>
      {centers.map((z,i) => <group key={z} position={[(1-i)*.05,0,z]}>
        <mesh position={[0,1.22,0]}><boxGeometry args={[.015,2.38,.72]}/><meshStandardMaterial color="#92b6b9" transparent opacity={.32} depthWrite={false}/></mesh>
        <Block at={[0,1.22,.35]} size={[.025,2.38,.025]} color="#495357"/>
        <Block at={[0,.09,0]} size={[.025,.1,.72]} color="#495357"/>
        {i === 0 && <Block at={[.025,1.08,.24]} size={[.035,.35,.04]} color="#9fa9a9"/>}
      </group>)}
    </group>
  </group>;
}
export default function ReceptionOffice({asset,motion,active}: {asset: GLTF|null; motion: TourPlayback; active:boolean}) {
  const room = useRef<THREE.Group>(null);
  useFrame(()=>{room.current!.visible = active && motion.progress >= .45;});
  return <group ref={room} visible={false}>
    <group position={[0,4.51,0]}>
      <Block at={[6.41,1.65,-3.54]} size={[5.82,3.3,.12]} color="#344748"/>
      <Block at={[9.2,1.65,-2.57]} size={[.12,3.3,2.4]} color="#435553"/>
      <Suspense fallback={null}><ReceptionFinishes/></Suspense>
      <Block at={[6.95,.45,-2.78]} size={[.49,.1,.5]} color="#34383b"/>
      <Block at={[6.95,.74,-3.03]} size={[.49,.55,.08]} color="#394042"/>
      <Block at={[6.95,.21,-2.78]} size={[.07,.4,.07]} color="#899294"/>
      <Block at={[6.95,.04,-2.78]} size={[.5,.06,.45]} color="#34383b"/>
      <GymFloorDoor motion={motion}/>
    </group>
    {asset && <DeskHost asset={asset} motion={motion}/>}
  </group>;
}
