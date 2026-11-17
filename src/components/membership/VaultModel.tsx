'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MetalBox } from './LockerMaterials';
import { membershipPlans } from './membershipPlans';

type Props = { selected: number | null; reduced: boolean; onSelect: (index: number) => void; onSettled: (index: number | null) => void };
function Disc({ radius, depth, position, color = '#252931' }: { radius: number; depth: number; position: [number, number, number]; color?: string }) {
  return <mesh position={position} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius, radius, depth, 96]} /><meshStandardMaterial color={color} metalness={.85} roughness={.32} /></mesh>;
}
function Ring({ radius, tube, z, color = '#525862', glow = false }: { radius: number; tube: number; z: number; color?: string; glow?: boolean }) {
  return <mesh position={[0, 0, z]}><torusGeometry args={[radius, tube, 10, 128]} /><meshStandardMaterial color={color} metalness={glow ? .2 : .92} roughness={.28} emissive={glow ? color : '#000'} emissiveIntensity={glow ? 2 : 0} /></mesh>;
}
export default function VaultModel({ selected, reduced, onSelect, onSettled }: Props) {
  const door = useRef<THREE.Group>(null), wheel = useRef<THREE.Group>(null), bolts = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const motion = useRef({ plan: null as number | null, progress: 0, reported: null as number | null });
  const [inside, setInside] = useState<number | null>(null);
  const [display, setDisplay] = useState(false);
  const [showDoorLabels, setShowDoorLabels] = useState(true);
  const housing = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-2.55, -2.45); shape.lineTo(2.55, -2.45); shape.lineTo(2.55, 2.45); shape.lineTo(-2.55, 2.45); shape.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, 1.94, 0, Math.PI * 2, true); shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape, { depth: .55, bevelEnabled: true, bevelThickness: .045, bevelSize: .045, bevelSegments: 2, curveSegments: 96 });
  }, []);
  useEffect(() => () => { housing.dispose(); document.body.style.cursor = ''; }, [housing]);
  useFrame((_, delta) => {
    const state = motion.current;
    const same = state.plan === selected;
    if (reduced) { state.plan = selected; state.progress = selected === null ? 0 : 1; }
    else {
      const target = same && selected !== null ? 1 : 0;
      const step = Math.min(delta, .15) / (same ? 1.65 : .8);
      state.progress += Math.sign(target - state.progress) * Math.min(Math.abs(target - state.progress), step);
      if (state.progress === 0 && !same) state.plan = selected;
    }
    if (inside !== state.plan) setInside(state.plan);
    const opening = THREE.MathUtils.smootherstep(state.progress, .3, 1);
    const unlocking = THREE.MathUtils.smootherstep(state.progress, 0, .36);
    if (showDoorLabels !== (opening < .8)) setShowDoorLabels(opening < .8);
    if (door.current) door.current.rotation.y = -opening * 1.85;
    if (wheel.current) wheel.current.rotation.z = -unlocking * Math.PI * 1.4;
    if (bolts.current) bolts.current.scale.setScalar(1 - unlocking * .12);
    if (light.current) light.current.intensity = 4 + opening * 17;
    const shown = state.progress > .98 && state.plan === selected && selected !== null;
    if (shown !== display) setDisplay(shown);
    const settled = shown ? selected : null;
    if (state.reported !== settled) { state.reported = settled; onSettled(settled); }
  });
  const plan = inside === null ? null : membershipPlans[inside];
  return <group name="nexus-vault" position={[0, 2.5, 0]}>
    <mesh geometry={housing} dispose={null} position={[0, 0, -.45]}><meshStandardMaterial color="#15181e" metalness={.78} roughness={.43} /></mesh>
    <MetalBox args={[5.45, .16, 1.75]} position={[0, -2.48, -.05]} color="#242830" metalness={.8} />
    <MetalBox args={[5.7, .12, 2]} position={[0, -2.6, 0]} color="#101217" />
    <Disc radius={1.95} depth={.12} position={[0, 0, -1.08]} color="#0a0c10" />
    <mesh position={[0, 0, -.5]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.92, 1.92, 1.1, 96, 1, true]} /><meshStandardMaterial color="#26212a" metalness={.8} roughness={.4} side={THREE.DoubleSide} /></mesh>
    <Ring radius={1.96} tube={.09} z={.16} /><Ring radius={1.84} tube={.024} z={-.2} color="#ff142b" glow /><Ring radius={1.73} tube={.018} z={-.95} color="#bd0920" glow />
    <pointLight ref={light} position={[0, .6, -.45]} color="#ff0929" intensity={4} distance={5} />
    {[-1, 1].flatMap(x => [-1, 1].map(y => <group key={`${x}:${y}`} position={[x * 2.27, y * 2.14, .18]}><Disc radius={.07} depth={.07} position={[0, 0, 0]} color="#79818c" /><MetalBox args={[.07, .012, .01]} position={[0, 0, .045]} color="#080a0d" /></group>))}
    {[-1.05, 1.05].map(y => <group key={y} position={[-2.04, y, .3]}><MetalBox args={[.5, .5, .45]} color="#323842" metalness={.9} /><mesh><cylinderGeometry args={[.14, .14, .7, 24]} /><meshStandardMaterial color="#6b737f" metalness={.94} roughness={.25} /></mesh></group>)}
    {plan && display && <Html transform center position={[0, 0, -.86]} distanceFactor={5} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}><div className="vault-interior-card"><span>ACCESS GRANTED / {plan.number}</span><img src="/assets/nexus-logo.png" alt="" /><strong>{plan.name.toUpperCase()}</strong><p>{plan.focus}</p><small>YOUR NEXT CHAPTER STARTS HERE.</small></div></Html>}
    <group ref={door} position={[-1.98, 0, .32]} name="vault-hinge">
      <group position={[1.98, 0, 0]} onClick={event => { event.stopPropagation(); onSelect(selected ?? 1); }} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <Disc radius={1.86} depth={.3} position={[0, 0, 0]} color="#242931" /><Disc radius={1.7} depth={.05} position={[0, 0, .18]} color="#171b22" />
        <Ring radius={1.82} tube={.045} z={.17} color="#727b87" /><Ring radius={1.61} tube={.018} z={.218} color="#49515d" /><Ring radius={1.22} tube={.012} z={.219} color="#303742" />
        {Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return <Disc key={i} radius={.047} depth={.035} position={[Math.sin(a) * 1.72, Math.cos(a) * 1.72, .225]} color="#929ba6" />; })}
        <group ref={bolts}>{Array.from({ length: 8 }, (_, i) => <group key={i} rotation={[0, 0, i * Math.PI / 4]}><MetalBox args={[.17, .68, .13]} position={[0, 1.57, -.13]} color="#7a818b" metalness={.96} /></group>)}</group>
        <group position={[0, -.12, .3]}>
          <Disc radius={.23} depth={.33} position={[0, 0, 0]} color="#7c8592" />
          <group ref={wheel} position={[0, 0, .2]} name="vault-wheel">
            <Ring radius={.68} tube={.062} z={0} color="#9aa3b0" />
            {Array.from({ length: 5 }, (_, i) => <group key={i} rotation={[0, 0, i * Math.PI * 2 / 5]}><MetalBox args={[.065, .58, .075]} position={[0, .34, 0]} color="#8e98a6" metalness={.95} radius={.025} /></group>)}
            <Disc radius={.2} depth={.1} position={[0, 0, .07]} color="#333a46" /><Disc radius={.1} depth={.12} position={[0, 0, .12]} color="#d01328" />
          </group>
        </group>
        {showDoorLabels && <Html transform center position={[0, 1.04, .24]} distanceFactor={5} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}><div className="vault-door-brand">NEXUS<span>FITNESS CLUB · EST. RAJKOT</span></div></Html>}
        {showDoorLabels && <Html transform center position={[0, -1.15, .24]} distanceFactor={5} zIndexRange={[3, 0]} style={{ pointerEvents: 'none' }}><div className="vault-door-serial">NX—07 / MEMBERS ACCESS</div></Html>}
      </group>
    </group>
  </group>;
}
