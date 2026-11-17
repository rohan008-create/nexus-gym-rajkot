'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MembershipPlan } from './membershipPlans';
import { MetalBox } from './LockerMaterials';

export const POD_POSITIONS = [-3.15, 0, 3.15];
export const POD_OPEN = 1;
type Props = { plan: MembershipPlan; index: number; mobile: boolean; selected: boolean; open: boolean; showDisplay: boolean; reduced: boolean; onSelect: () => void; onEnquire: (plan: string) => void; reportAngle: (index: number, value: number) => void };

function labelTexture(title: string, subtitle: string, screen = false) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = screen ? 896 : 192;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#090b10'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = '#565c65'; c.lineWidth = 3; c.strokeRect(8, 8, 496, canvas.height - 16);
  c.textAlign = 'center'; c.fillStyle = '#f3f3f5'; c.font = 'italic bold 65px Arial'; c.fillText(title, 256, screen ? 290 : 100);
  c.fillStyle = '#ef243a'; c.font = 'bold 23px Arial'; c.fillText(subtitle, 256, screen ? 350 : 145);
  if (screen) {
    c.fillStyle = '#aaaeb8'; c.font = '20px Arial'; c.fillText('YOUR NEXT CHAPTER', 256, 455);
    c.fillStyle = '#e50922'; c.fillRect(56, 680, 400, 90);
    c.fillStyle = '#fff'; c.font = 'bold 25px Arial'; c.fillText('ENQUIRE NOW', 256, 736);
    c.font = 'italic bold 35px Arial'; c.fillText('NEXUS', 256, 125);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4; return texture;
}

export default function PodModel({ plan, index, mobile, selected, open, showDisplay, reduced, onSelect, onEnquire, reportAngle }: Props) {
  const height = useThree(state => state.size.height);
  const left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null);
  const value = useRef(0);
  const [hovered, setHovered] = useState(false);
  const assets = useMemo(() => {
    const profile = [[0, .18], [.72, .18], [.91, .27], [.98, .48], [.98, 3.36], [.95, 3.59], [.82, 3.85], [.54, 4.03], [0, 4.12]].map(([r, y]) => new THREE.Vector2(r, y));
    const curve = new THREE.SplineCurve(profile);
    const points = curve.getPoints(90);
    return {
      rear: new THREE.LatheGeometry(points, 64, Math.PI / 2, Math.PI),
      left: new THREE.LatheGeometry(points, 48, -Math.PI / 2, Math.PI / 2),
      right: new THREE.LatheGeometry(points, 48, 0, Math.PI / 2),
      stripeLeft: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-.91, 2.73, .39), new THREE.Vector3(-.81, 2.65, .57), new THREE.Vector3(-.7, 2.58, .7)]), 16, .025, 6, false),
      stripeRight: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(.91, 2.73, .39), new THREE.Vector3(.81, 2.65, .57), new THREE.Vector3(.7, 2.58, .7)]), 16, .025, 6, false),
      name: labelTexture(plan.name.toUpperCase(), `${plan.number} / MEMBERSHIP`),
      logo: labelTexture('NEXUS', 'FITNESS CLUB'),
      screen: labelTexture(plan.name.toUpperCase(), 'MEMBERSHIP', true),
    };
  }, [plan]);
  useEffect(() => () => { Object.values(assets).forEach(asset => asset.dispose()); document.body.style.cursor = ''; }, [assets]);
  useFrame((_, delta) => {
    value.current = reduced ? (open ? 1 : 0) : THREE.MathUtils.damp(value.current, open ? 1 : 0, 5.2, Math.min(delta, .05));
    if (Math.abs(value.current - (open ? 1 : 0)) < .001) value.current = open ? 1 : 0;
    if (left.current && right.current) {
      left.current.position.x = -.77 * value.current; right.current.position.x = .77 * value.current;
      left.current.position.z = right.current.position.z = .1 * value.current;
      left.current.rotation.y = -.16 * value.current; right.current.rotation.y = .16 * value.current;
    }
    reportAngle(index, value.current);
  });
  const metal = index === 2 ? '#555b64' : index === 1 ? '#363b44' : '#292e36';
  const glow = selected ? 1.6 : hovered ? 1.2 : .8;
  const seam = (x: number, y: number, z: number, height: number) => <mesh position={[x, y, z]}><boxGeometry args={[.018, height, .018]} /><meshStandardMaterial color="#d60915" emissive="#ff0011" emissiveIntensity={glow} toneMapped={false} /></mesh>;
  return <group name={`pod-${plan.id}`} position={[mobile ? 0 : POD_POSITIONS[index], 0, 0]} onClick={event => { event.stopPropagation(); onSelect(); }} onPointerOver={event => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}>
    {/* Separate curved shell leaves slide on the machined base tracks. */}
    <mesh geometry={assets.rear} dispose={null}><meshStandardMaterial color={metal} metalness={.88} roughness={.3} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, .13, 0]}><cylinderGeometry args={[1.07, 1.12, .2, 96]} /><meshStandardMaterial color="#171b23" metalness={.85} roughness={.25} /></mesh>
    {[.2, .28].map(y => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.035, .016, 8, 96]} /><meshStandardMaterial color="#d60915" emissive="#ff0011" emissiveIntensity={glow} toneMapped={false} /></mesh>)}
    <mesh position={[0, .018, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.2, 1.23, 96]} /><meshBasicMaterial color="#f51130" transparent opacity={selected ? .8 : .28} /></mesh>
    <MetalBox args={[1.74, 3.12, .14]} position={[0, 2.05, .08]} color="#11151c" metalness={.75} roughness={.35} radius={.07} />
    <mesh position={[0, 2.05, .16]}><planeGeometry args={[1.55, 2.84]} /><meshBasicMaterial map={showDisplay ? null : assets.screen} color={showDisplay ? '#090b10' : '#ffffff'} toneMapped={false} /></mesh>
    {[-.83, .83].map(x => <group key={x}>{seam(x, 2.05, .21, 2.96)}</group>)}
    {[.52, 3.58].map(y => <mesh key={y} position={[0, y, .29]}><boxGeometry args={[1.4, .035, .045]} /><meshStandardMaterial color="#ffbac4" emissive="#ff1035" emissiveIntensity={selected ? 5 : .8} toneMapped={false} /></mesh>)}
    <pointLight position={[0, 2.9, .7]} color="#ff153a" intensity={selected ? 3 : .15} distance={3} />
    {showDisplay && <Html center position={[0, 2.05, .23]} distanceFactor={height * .00445} zIndexRange={[15, 10]} wrapperClass="pod-mounted-html">
      <div className="locker-mounted-display pod-display" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <img src="/assets/nexus-logo.png" alt="Nexus Fitness Club" width={470} height={125} />
        <p className="locker-display-demo">{plan.number} / MEMBERSHIP</p>
        <h3>{plan.name.toUpperCase()}<span>YOUR NEXT LEVEL.</span></h3>
        <p className="locker-display-description">{plan.description}</p>
        <ul><li>{plan.focus}</li><li>Details confirmed by the club</li></ul>
        <p className="locker-display-price">{plan.price || 'Enquire for pricing'}</p>
        <button aria-label={`Enquire about ${plan.name} membership inside pod`} onClick={() => onEnquire(plan.name)}>ENQUIRE NOW <span aria-hidden>↗</span></button>
      </div>
    </Html>}
    {[-1, 1].map(side => <group ref={side === -1 ? left : right} key={side} name={`pod-${plan.id}-${side === -1 ? 'left' : 'right'}-panel`}>
      <mesh geometry={side === -1 ? assets.left : assets.right} dispose={null}><meshPhysicalMaterial color={metal} metalness={.9} roughness={.28} clearcoat={.25} clearcoatRoughness={.35} side={THREE.DoubleSide} /></mesh>
      {seam(side * .014, 2, .99, 2.85)}
      <MetalBox args={[.045, 2.55, .06]} position={[side * .71, 1.78, .69]} color="#12151b" metalness={.85} roughness={.26} />
      <mesh geometry={side === -1 ? assets.stripeLeft : assets.stripeRight} dispose={null}><meshStandardMaterial color="#e00927" metalness={.65} roughness={.28} /></mesh>
      {[.65, 3.24].map(y => <mesh key={y} position={[side * .69, y, .73]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.035, .035, .016, 6]} /><meshStandardMaterial color="#9297a1" metalness={.95} roughness={.22} /></mesh>)}
      {side === -1 && <mesh position={[-.32, 3.08, .935]} rotation={[0, -.27, 0]}><planeGeometry args={[.48, .18]} /><meshStandardMaterial map={assets.logo} roughness={.35} metalness={.4} /></mesh>}
    </group>)}
    <group position={[0, .035, 1.29]} rotation={[-Math.PI / 2 + .22, 0, 0]}>
      <mesh><boxGeometry args={[1.42, .48, .045]} /><meshStandardMaterial color="#1b1e25" metalness={.85} roughness={.3} /></mesh>
      <mesh position={[0, 0, .026]}><planeGeometry args={[1.36, .43]} /><meshBasicMaterial map={assets.name} toneMapped={false} /></mesh>
    </group>
  </group>;
}
