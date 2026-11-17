'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Html, useTexture } from '@react-three/drei';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MembershipPlan } from './membershipPlans';
import { MetalBox } from './LockerMaterials';

export const LOCKER_POSITIONS = [-3.05, 0, 3.05];
export const DOOR_ANGLE = -110 * Math.PI / 180;

function FittedMembershipDisplay({ plan, index, door, onEnquire }: { plan: MembershipPlan; index: number; door: React.RefObject<THREE.Group>; onEnquire: (plan: string) => void }) {
  const { camera, size } = useThree();
  const fit = useRef<HTMLDivElement>(null);
  const vectors = useMemo(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], []);
  useFrame(() => {
    if (!fit.current) return;
    const [center, right, down, world] = vectors;
    world.set(LOCKER_POSITIONS[index], 2.1, -.48);
    const distance = world.distanceTo(camera.position);
    const factor = size.height * .0045 / (2 * Math.tan((camera as THREE.PerspectiveCamera).fov * Math.PI / 360) * distance);
    center.copy(world).project(camera);
    right.copy(world); right.x += .774; right.project(camera);
    down.copy(world); down.y -= 1.458; down.project(camera);
    const a = (right.x - center.x) * size.width / (344 * factor);
    const b = -(right.y - center.y) * size.height / (344 * factor);
    const c = (down.x - center.x) * size.width / (648 * factor);
    const d = -(down.y - center.y) * size.height / (648 * factor);
    fit.current.style.transform = `matrix(${a},${b},${c},${d},0,0)`;
  });
  return <Html center distanceFactor={size.height * .0045} position={[0, 2.1, -.48]} occlude={[door]} zIndexRange={[30, 20]} wrapperClass="locker-mounted-html"><div ref={fit} style={{ width: 344, height: 648, transformOrigin: 'center' }}><MembershipDisplay plan={plan} onEnquire={onEnquire} /></div></Html>;
}

function MembershipDisplay({ plan, onEnquire }: { plan: MembershipPlan; onEnquire: (plan: string) => void }) {
  return <div className="locker-mounted-display" onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
    <img src="/assets/nexus-logo.png" alt="Nexus Fitness Club" width={470} height={125} />
    <p className="locker-display-demo">{plan.number} / DEMO MEMBERSHIP</p>
    <h3>{plan.name.toUpperCase()}<span>MEMBERSHIP</span></h3>
    <p className="locker-display-description">{plan.description}</p>
    <ul>{plan.benefits.length ? plan.benefits.slice(0, 3).map(benefit => <li key={benefit}>{benefit}</li>) : <li>Benefits to be confirmed</li>}<li>Duration: {plan.duration || 'to be confirmed'}</li></ul>
    <p className="locker-display-price">{plan.price || 'Enquire for pricing'}</p>
    <button type="button" aria-label={`Enquire about ${plan.name} membership inside locker`} onClick={() => onEnquire(plan.name)}>ENQUIRE NOW <span aria-hidden>↗</span></button>
  </div>;
}

function Screw({ position }: { position: [number, number, number] }) {
  return <group position={position}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.017, .017, .008, 10]} /><meshStandardMaterial color="#555961" metalness={.8} roughness={.38} /></mesh><mesh position={[0, 0, .006]} rotation={[0, 0, .4]}><boxGeometry args={[.02, .003, .003]} /><meshBasicMaterial color="#121316" /></mesh></group>;
}

export default function LockerModel({ plan, index, mobile, selected, open, showDisplay, reduced, onSelect, onEnquire, reportAngle }: { plan: MembershipPlan; index: number; mobile: boolean; selected: boolean; open: boolean; showDisplay: boolean; reduced: boolean; onSelect: () => void; onEnquire: (plan: string) => void; reportAngle: (index: number, angle: number) => void }) {
  const spacious = useThree(state => state.size.width >= 1000);
  const pivot = useRef<THREE.Group>(null);
  const led = useRef<THREE.PointLight>(null);
  const diffuser = useRef<THREE.MeshStandardMaterial>(null);
  const lock = useRef<THREE.MeshStandardMaterial>(null);
  const progress = useRef({ from: 0, to: 0, elapsed: 2 });
  const flash = useRef(10);
  const [hovered, setHovered] = useState(false);
  const sourceTextures = useTexture([`/assets/membership/${plan.id}-door.png`, `/assets/membership/${plan.id}-interior.png`]);
  const [doorTexture, insideTexture] = useMemo(() => sourceTextures.map(texture => texture.clone()), [sourceTextures[0], sourceTextures[1]]);
  useEffect(() => { [doorTexture, insideTexture].forEach(texture => { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; texture.needsUpdate = true; }); return () => { doorTexture.dispose(); insideTexture.dispose(); }; }, [doorTexture, insideTexture]);
  useEffect(() => { if (selected) flash.current = 0; }, [selected]);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  useFrame((_, delta) => {
    if (!pivot.current) return;
    const dt = Math.min(delta, .05);
    const target = open ? DOOR_ANGLE : 0;
    const motion = progress.current;
    if (motion.to !== target) { motion.from = pivot.current.rotation.y; motion.to = target; motion.elapsed = 0; }
    motion.elapsed += dt;
    const t = Math.min(1, motion.elapsed / (reduced ? .12 : 1.15));
    const ease = t * t * t * (t * (t * 6 - 15) + 10);
    pivot.current.rotation.y = THREE.MathUtils.lerp(motion.from, motion.to, ease);
    reportAngle(index, pivot.current.rotation.y);
    flash.current += dt;
    if (led.current) led.current.intensity = THREE.MathUtils.damp(led.current.intensity, open ? 2 : .025, 5, dt);
    if (diffuser.current) diffuser.current.emissiveIntensity = THREE.MathUtils.damp(diffuser.current.emissiveIntensity, open ? 2 : .1, 5, dt);
    if (lock.current) lock.current.emissiveIntensity = THREE.MathUtils.damp(lock.current.emissiveIntensity, flash.current < .2 ? 4 : hovered ? 1.2 : selected ? .6 : .15, 16, dt);
  });
  const pointerOver = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; };
  const pointerOut = () => { setHovered(false); document.body.style.cursor = ''; };
  return <group name={`locker-${plan.id}`} position={[mobile ? 0 : LOCKER_POSITIONS[index], 0, 0]} onClick={event => { event.stopPropagation(); onSelect(); }} onPointerOver={pointerOver} onPointerOut={pointerOut}>
    {/* Folded steel cabinet: identical 2.04 × 4.06 × 1.32 dimensions for every plan. */}
    <MetalBox args={[2.04, 3.96, .045]} position={[0, 2.08, -.64]} />
    {[-.995, .995].map(x => <MetalBox key={x} args={[.045, 3.96, 1.32]} position={[x, 2.08, 0]} />)}
    {[.12, 4.04].map(y => <MetalBox key={y} args={[2.04, .055, 1.32]} position={[0, y, 0]} />)}
    {/* Interior returns and shadow seams make the depth legible without SSAO. */}
    {[-.947, .947].map(x => <MetalBox key={x} args={[.026, 3.72, 1.18]} position={[x, 2.08, -.015]} color="#101114" roughness={.63} />)}
    <MetalBox args={[1.86, .035, 1.2]} position={[0, .19, -.015]} color="#15161a" roughness={.64} />
    <MetalBox args={[1.86, .04, .12]} position={[0, .245, .52]} color="#303238" metalness={.65} roughness={.4} />
    {[-.944, .944].map(x => <MetalBox key={x} args={[.043, 3.86, .08]} position={[x, 2.08, .665]} color={hovered ? '#48242b' : '#303238'} metalness={.65} roughness={.38} />)}
    {[.174, 3.984].map(y => <MetalBox key={y} args={[1.93, .043, .08]} position={[0, y, .665]} color="#303238" metalness={.65} roughness={.38} />)}
    {[-.918, .918].map(x => <MetalBox key={x} args={[.018, 3.77, .018]} position={[x, 2.08, .65]} color="#050506" metalness={.05} roughness={.95} radius={.005} />)}
    {[-.79, .79].flatMap(x => [-.44, .44].map(z => <group key={`${x}${z}`} position={[x, .06, z]}><mesh><cylinderGeometry args={[.055, .065, .11, 12]} /><meshStandardMaterial color="#303238" metalness={.8} roughness={.4} /></mesh><MetalBox args={[.13, .026, .13]} position={[0, -.05, 0]} color="#080809" /></group>))}
    <MetalBox args={[1.65, 3.12, .055]} position={[0, 2.1, -.55]} color="#08090b" roughness={.68} />
    <MetalBox args={[1.58, 3.04, .028]} position={[0, 2.1, -.511]} color="#101114" metalness={.1} roughness={.65} />
    {[.79, -.79].flatMap(x => [.61, 3.59].map(y => <Screw key={`${x}${y}`} position={[x, y, -.486]} />))}
    <mesh position={[0, 2.1, -.493]}><planeGeometry args={[1.5, 2.92]} /><meshBasicMaterial map={insideTexture} transparent toneMapped={false} /></mesh>
    {!mobile && spacious && showDisplay && <FittedMembershipDisplay plan={plan} index={index} door={pivot} onEnquire={onEnquire} />}
    <MetalBox args={[1.54, .055, .19]} position={[0, 3.81, -.06]} color="#25262b" />
    <mesh position={[0, 3.785, -.04]} rotation={[.4, 0, 0]}><boxGeometry args={[1.41, .022, .09]} /><meshStandardMaterial ref={diffuser} color="#f5b6b8" emissive="#ff2433" emissiveIntensity={.1} roughness={.7} /></mesh>
    <pointLight ref={led} position={[0, 3.62, .03]} color="#e50914" intensity={.025} distance={3.5} decay={2} />
    <mesh position={[0, .045, .13]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.17, 48]} /><meshBasicMaterial color="#e50914" transparent opacity={selected ? .1 : index === 1 ? .035 : .015} depthWrite={false} /></mesh>
    {/* Static mounting leaves are screwed to the frame; barrels share the door pivot. */}
    {[-1.44, 1.44].map(y => <group key={y} position={[-.925, y + 2.08, .695]}><MetalBox args={[.095, .24, .018]} color="#303238" metalness={.8} roughness={.35} /><Screw position={[.023, .08, .015]} /><Screw position={[.023, -.08, .015]} /></group>)}
    <group ref={pivot} name={`locker-${plan.id}-door`} position={[-.904, 2.08, .704]}>
      <MetalBox args={[1.808, 3.72, .065]} position={[.904, 0, 0]} color="#101114" metalness={.25} roughness={.57} radius={.015} />
      <MetalBox args={[1.718, 3.63, .018]} position={[.904, 0, .034]} color="#101114" metalness={.22} roughness={.61} radius={.006} />
      <MetalBox args={[1.72, 3.58, .025]} position={[.904, 0, -.044]} color="#18191d" roughness={.65} />
      <mesh position={[.904, 0, .045]}><planeGeometry args={[1.68, 3.36]} /><meshStandardMaterial map={doorTexture} transparent metalness={.06} roughness={.65} polygonOffset polygonOffsetFactor={-1} /></mesh>
      {[1.43, 1.29, 1.15, -1.32, -1.46, -1.6].map(y => <group key={y} position={[.904, y, .049]}><MetalBox args={[.81, .055, .007]} color="#030304" metalness={0} roughness={1} radius={.006} /><MetalBox args={[.79, .014, .022]} position={[0, .029, .004]} color="#303238" metalness={.65} roughness={.43} radius={.005} /><MetalBox args={[.77, .01, .01]} position={[0, -.023, .002]} color="#18191d" radius={.004} /></group>)}
      <MetalBox args={[.14, .61, .022]} position={[1.611, -.2, .068]} color="#22242a" metalness={.6} roughness={.44} />
      {[-.4, -.03].map(y => <MetalBox key={y} args={[.04, .04, .095]} position={[1.611, y, .11]} color="#555961" metalness={.86} roughness={.32} radius={.009} />)}
      <MetalBox args={[.044, .41, .047]} position={[1.611, -.215, .17]} color="#555961" metalness={.86} roughness={.32} radius={.019} />
      <MetalBox args={[.16, .27, .047]} position={[1.611, .35, .083]} color="#0a0b0e" metalness={.2} roughness={.63} />
      {[0, 1, 2].flatMap(row => [0, 1, 2].map(col => <mesh key={`${row}${col}`} position={[1.567 + col * .044, .42 - row * .045, .11]}><circleGeometry args={[.009, 8]} /><meshStandardMaterial color="#737780" emissive="#737780" emissiveIntensity={hovered ? .3 : .05} /></mesh>))}
      <mesh position={[1.611, .268, .112]}><sphereGeometry args={[.014, 10, 8]} /><meshStandardMaterial ref={lock} color="#ff2433" emissive="#e50914" emissiveIntensity={.15} /></mesh>
      {[-1.44, 1.44].map(y => <group key={y} position={[0, y, -.004]}><MetalBox args={[.1, .24, .018]} position={[.065, 0, -.016]} color="#303238" metalness={.8} roughness={.35} /><Screw position={[.09, .08, -.002]} /><Screw position={[.09, -.08, -.002]} />{[-.075, 0, .075].map(dy => <mesh key={dy} position={[0, dy, 0]}><cylinderGeometry args={[.027, .027, .069, 12]} /><meshStandardMaterial color="#555961" metalness={.85} roughness={.34} /></mesh>)}</group>)}
      {[-.72, .72].map(x => <MetalBox key={x} args={[.024, 3.3, .045]} position={[x + .904, 0, -.07]} color="#18191d" />)}
    </group>
  </group>;
}
