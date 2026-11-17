import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRandom } from './fractureGeometry';

export default function InternalFilling({ elapsed, transform, mobile, reduced, active = true, cinematic = false }: { elapsed: React.MutableRefObject<number>; transform: THREE.Matrix4; mobile: boolean; reduced: boolean; active?: boolean; cinematic?: boolean }) {
  const root = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = cinematic ? (reduced ? 12 : mobile ? 32 : 56) : reduced ? 45 : mobile ? 110 : 200;
  const dust = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const random = seededRandom(9143);
    return Array.from({ length: count }, () => {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * .45;
      return { start: new THREE.Vector3(Math.sin(angle) * radius, (random() - .5) * 2.6, Math.cos(angle) * radius), velocity: new THREE.Vector3(Math.sin(angle) * (2 + random() * 5), 1 + random() * 5, Math.cos(angle) * (2 + random() * 5)), spin: new THREE.Vector3(random() * 10, random() * 10, random() * 10), scale: .025 + Math.pow(random(), 3) * .15, color: new THREE.Color().setHSL(.07, .06, .12 + random() * .38), light: random() > .7 };
    });
  }, [count]);
  const geometry = useMemo(() => {
    // Bent, irregular textile scrap; never cube/confetti geometry.
    const g = new THREE.PlaneGeometry(1, .65, 3, 2), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 8 + p.getY(i) * 3) * .14);
    g.computeVertexNormals(); return g;
  }, []);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const world = useMemo(() => data.map(() => ({ start: new THREE.Vector3(), velocity: new THREE.Vector3() })), [data]);
  const initialized = useRef(false);
  useEffect(() => { data.forEach((d, i) => mesh.current?.setColorAt(i, d.color)); if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true; }, [data]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const rotation = useMemo(() => new THREE.Quaternion(), []);
  useFrame(() => {
    const t = Math.max(0, elapsed.current - .15);
    if (!mesh.current || !dust.current || !root.current) return;
    root.current.visible = active;
    if (!active) return;
    if (!initialized.current) {
      rotation.setFromRotationMatrix(transform);
      data.forEach((d, i) => { world[i].start.copy(d.start).applyMatrix4(transform); world[i].velocity.copy(d.velocity).applyQuaternion(rotation).multiplyScalar(cinematic ? .55 : 1); });
      initialized.current = true;
    }
    data.forEach((d, i) => {
      const { start, velocity } = world[i];
      const drag = d.light ? .7 : .2, travel = (1 - Math.exp(-drag * t)) / drag;
      dummy.position.copy(start).addScaledVector(velocity, travel); dummy.position.y -= (d.light ? 2.7 : 6.5) * t * t;
      dummy.rotation.set(d.spin.x * t * .5, d.spin.y * t * .5, d.spin.z * t * .5); const scale = d.scale * (cinematic ? .55 : 1); dummy.scale.set(scale, scale * .6, scale); dummy.updateMatrix(); mesh.current!.setMatrixAt(i, dummy.matrix);
      positions[i * 3] = start.x + velocity.x * t * .6; positions[i * 3 + 1] = start.y + velocity.y * t * .5 - t * t * .8; positions[i * 3 + 2] = start.z + velocity.z * t * .6;
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    (mesh.current.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - Math.max(0, t - 1.7));
    dust.current.geometry.attributes.position.needsUpdate = true;
    (dust.current.material as THREE.PointsMaterial).opacity = Math.max(0, .25 * (1 - t / 2.6));
  });
  return <group ref={root} visible={active}>
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}><meshStandardMaterial side={THREE.DoubleSide} roughness={1} transparent forceSinglePass /></instancedMesh>
    <points ref={dust} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#99918c" size={.026} transparent depthWrite={false} sizeAttenuation /></points>
  </group>;
}
