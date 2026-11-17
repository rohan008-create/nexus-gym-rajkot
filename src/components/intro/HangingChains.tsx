import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const WIRE_RADIUS = .018;
const LINK_RADIUS = .058;
const STRAIGHT_HALF = .052;
// Taut spacing: perpendicular links bear against each other's round wire.
const LINK_PITCH = 2 * (STRAIGHT_HALF + LINK_RADIUS - WIRE_RADIUS);
const JUNCTION_Y = -.55; // Lower the swivel and shorten the four bag slings.

/** Stadium centerline: elongated links with constant, circular wire thickness. */
class OvalLink extends THREE.Curve<THREE.Vector3> {
  constructor() { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    const arc = Math.PI * LINK_RADIUS;
    const straight = STRAIGHT_HALF * 2;
    const distance = t * (2 * arc + 2 * straight);
    if (distance < arc) {
      const angle = distance / LINK_RADIUS;
      return target.set(Math.cos(angle) * LINK_RADIUS, STRAIGHT_HALF + Math.sin(angle) * LINK_RADIUS, 0);
    }
    if (distance < arc + straight) return target.set(-LINK_RADIUS, STRAIGHT_HALF - (distance - arc), 0);
    if (distance < 2 * arc + straight) {
      const angle = Math.PI + (distance - arc - straight) / LINK_RADIUS;
      return target.set(Math.cos(angle) * LINK_RADIUS, -STRAIGHT_HALF + Math.sin(angle) * LINK_RADIUS, 0);
    }
    return target.set(LINK_RADIUS, -STRAIGHT_HALF + distance - 2 * arc - straight, 0);
  }
}

function createSteelGrain() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const grain = 211 + Math.sin(y * 19.31) * 9 + Math.sin(x * 1.73 + y * .7) * 3;
    data[i] = data[i + 1] = data[i + 2] = grain; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

type ChainProps = { start: THREE.Vector3; end: THREE.Vector3; geometry: THREE.BufferGeometry; material: THREE.Material; twist?: number; scale?: number };
function Chain({ start, end, geometry, material, twist = 0, scale = 1 }: ChainProps) {
  const matrices = useMemo(() => {
    const direction = end.clone().sub(start);
    const count = Math.ceil(direction.length() / (LINK_PITCH * scale)) + 1;
    const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return Array.from({ length: count }, (_, i) => {
      const roll = twist + (i % 2 ? Math.PI / 2 : 0) + Math.sin(i * 2.17) * .018;
      const rotation = align.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), roll));
      return new THREE.Matrix4().compose(start.clone().lerp(end, i / (count - 1)), rotation, new THREE.Vector3(scale, scale, scale));
    });
  }, [start, end, twist, scale]);
  return <instancedMesh geometry={geometry} material={material} args={[geometry, material, matrices.length]} dispose={null}
    ref={mesh => { if (mesh) { matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix)); mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); } }} />;
}

export default function HangingChains() {
  const assets = useMemo(() => {
    const grain = createSteelGrain();
    const material = new THREE.MeshStandardMaterial({ color: '#a6afb9', metalness: .94, roughness: .27, roughnessMap: grain, bumpMap: grain, bumpScale: .0003, envMapIntensity: 1.2 });
    const dark = new THREE.MeshStandardMaterial({ color: '#252b32', metalness: .85, roughness: .31 });
    const accent = new THREE.MeshStandardMaterial({ color: '#ac1025', metalness: .7, roughness: .27, emissive: '#670715', emissiveIntensity: .2 });
    const link = new THREE.TubeGeometry(new OvalLink(), 48, WIRE_RADIUS, 10, true);
    // Forged snap hook, with a straight safety gate rendered separately.
    const hookPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(.025, .1, 0), new THREE.Vector3(-.035, .105, 0),
      new THREE.Vector3(-.06, .04, 0), new THREE.Vector3(-.06, -.04, 0),
      new THREE.Vector3(-.03, -.085, 0), new THREE.Vector3(.035, -.07, 0),
      new THREE.Vector3(.05, -.015, 0),
    ]);
    const hook = new THREE.TubeGeometry(hookPath, 32, .017, 10, false);
    const gate = new THREE.CylinderGeometry(.008, .008, .119, 8);
    const ring = new THREE.TorusGeometry(.09, .02, 12, 40);
    const slings = Array.from({ length: 4 }, (_, i) => {
      const angle = Math.PI / 4 + i * Math.PI / 2;
      const radial = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      // The original strap rings remain at y=-1.65 relative to the sway pivot.
      return { angle, start: radial.clone().multiplyScalar(.07).setY(JUNCTION_Y - .06), end: radial.clone().multiplyScalar(.57).setY(-1.48), hook: radial.clone().multiplyScalar(.57).setY(-1.65) };
    });
    return { grain, material, dark, accent, link, hook, gate, ring, slings, stemStart: new THREE.Vector3(0, JUNCTION_Y + .65, 0), stemEnd: new THREE.Vector3(0, JUNCTION_Y + .15 + 6.5, 0) };
  }, []);
  useEffect(() => () => { assets.link.dispose(); assets.hook.dispose(); assets.gate.dispose(); assets.ring.dispose(); assets.material.dispose(); assets.dark.dispose(); assets.accent.dispose(); assets.grain.dispose(); }, [assets]);
  return <group>
    {assets.slings.map(({ angle, start, end, hook }, i) => <group key={i}>
      <Chain start={start} end={end} geometry={assets.link} material={assets.material} twist={angle} />
      <group position={hook} rotation={[0, angle + Math.PI / 2, 0]}>
        <mesh geometry={assets.hook} material={assets.material} dispose={null} />
        <mesh position={[.0375, .0425, 0]} rotation={[0, 0, .214]} geometry={assets.gate} material={assets.material} dispose={null} />
      </group>
    </group>)}
    <Chain start={assets.stemStart} end={assets.stemEnd} geometry={assets.link} material={assets.material} twist={Math.PI / 2} scale={1.5} />
    {/* Machined swivel: a hexagonal load hub, red retaining collars and a steel eye. */}
    <group position={[0, JUNCTION_Y + .27, 0]}>
      <mesh material={assets.dark} dispose={null}>
        <cylinderGeometry args={[.115, .14, .32, 6]} />
      </mesh>
      {[-.12, .12].map(y => <mesh key={y} position={[0, y, 0]} material={assets.accent} dispose={null}>
        <cylinderGeometry args={[.126, .126, .035, 32]} />
      </mesh>)}
      <mesh position={[0, .235, 0]} material={assets.material} dispose={null}>
        <torusGeometry args={[.082, .022, 10, 32]} />
      </mesh>
      <mesh position={[0, -.23, 0]} geometry={assets.ring} material={assets.material} dispose={null} />
      <mesh position={[0, 0, .126]} rotation={[Math.PI / 2, 0, 0]} material={assets.material} dispose={null}>
        <cylinderGeometry args={[.04, .04, .025, 6]} />
      </mesh>
    </group>
    {assets.slings.map(({ start, end }, i) => {
      const position = start.clone().lerp(end, .87);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
      return <group key={`coupler-${i}`} position={position} quaternion={quaternion}>
        <mesh material={assets.dark} dispose={null}><cylinderGeometry args={[.047, .047, .19, 8]} /></mesh>
        {[-.065, .065].map(y => <mesh key={y} position={[0, y, 0]} material={assets.accent} dispose={null}>
          <cylinderGeometry args={[.05, .05, .025, 16]} />
        </mesh>)}
      </group>;
    })}
  </group>;
}
