import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBagSurface } from './BagSurface';
import { fractureGeometry, seededRandom } from './fractureGeometry';

/** Precomputed leather pieces with drag, gravity and a small flexible curl.
 * No collision solver or new geometry is created during the transition.
 */
export default function CinematicLeather({ active, elapsed, transform, mobile, reduced }: {
  active: boolean; elapsed: React.MutableRefObject<number>; transform: THREE.Matrix4; mobile: boolean; reduced: boolean;
}) {
  const surface = useBagSurface();
  const root = useRef<THREE.Group>(null);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const initialized = useRef(false);
  const pieces = useMemo(() => fractureGeometry(surface.body, surface.logoGeometry, 4, 2), [surface]);
  const motion = useMemo(() => pieces.map((piece, i) => {
    const random = seededRandom(783 + i * 93);
    const direction = new THREE.Vector3(piece.center.x, piece.center.y * .22, piece.center.z).normalize();
    const speed = 3.2 + random() * 1.4;
    direction.x = (piece.center.x < 0 ? -1 : 1) * (1.1 + random() * .5);
    return { start: new THREE.Vector3(), velocity: direction.multiplyScalar(speed).add(new THREE.Vector3(0, .8 + random(), 1)),
      spin: new THREE.Vector3((random() - .5) * 2.5, (random() - .5) * 2.5, (random() - .5) * 1.5) };
  }), [pieces]);
  const materials = useMemo(() => {
    const flex = { value: 0 }, time = { value: 0 };
    const outside = surface.material.clone(), logo = surface.logoMaterial.clone();
    const inside = new THREE.MeshStandardMaterial({ color: '#292420', roughness: .98, side: THREE.DoubleSide });
    [outside, inside, logo].forEach(material => {
      material.transparent = true;
      material.forceSinglePass = true;
      material.side = THREE.FrontSide;
      material.onBeforeCompile = shader => {
        shader.uniforms.uLeatherFlex = flex; shader.uniforms.uLeatherTime = time;
        shader.vertexShader = `uniform float uLeatherFlex; uniform float uLeatherTime;\n${shader.vertexShader}`
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            transformed.z += sin(position.y * 7. + position.x * 4. + uLeatherTime * 3.) * uLeatherFlex * (.25 + abs(position.y));`);
      };
      material.customProgramCacheKey = () => 'nexus-flexible-leather-v1';
    });
    return { outside, inside, logo, flex, time, shell: [outside, inside] };
  }, [surface]);
  const baseRotation = useMemo(() => new THREE.Quaternion(), []);
  useEffect(() => () => { pieces.forEach(p => { p.shell.dispose(); p.logo?.dispose(); }); }, [pieces]);
  useEffect(() => () => { materials.outside.dispose(); materials.inside.dispose(); materials.logo.dispose(); }, [materials]);
  useFrame(() => {
    if (!root.current) return;
    const t = Math.max(0, elapsed.current - .15);
    root.current.visible = active && t < (reduced ? .5 : 1.12);
    if (!root.current.visible) return;
    if (!initialized.current) {
      baseRotation.setFromRotationMatrix(transform);
      pieces.forEach((piece, i) => {
        motion[i].start.copy(piece.center).applyMatrix4(transform);
        motion[i].velocity.applyQuaternion(baseRotation);
      });
      initialized.current = true;
    }
    const travel = reduced ? 0 : (1 - Math.exp(-.8 * t)) / .8;
    const fade = 1 - THREE.MathUtils.smoothstep(t, reduced ? .05 : .42, reduced ? .5 : 1.12);
    materials.outside.opacity = materials.inside.opacity = materials.logo.opacity = fade;
    materials.flex.value = reduced ? 0 : THREE.MathUtils.smoothstep(t, 0, .25) * .16;
    materials.time.value = t;
    pieces.forEach((_, i) => {
      const group = groups.current[i]; if (!group) return;
      const data = motion[i];
      group.position.copy(data.start).addScaledVector(data.velocity, travel);
      if (!reduced) group.position.y -= 4.5 * t * t;
      group.quaternion.copy(baseRotation);
      if (!reduced) { group.rotateX(data.spin.x * travel); group.rotateY(data.spin.y * travel); group.rotateZ(data.spin.z * travel); }
    });
  });
  return <group ref={root} visible={false}>{pieces.map((piece, i) => <group key={i} ref={node => { groups.current[i] = node; }}>
    <mesh geometry={piece.shell} material={materials.shell} dispose={null} />
    {piece.logo && <mesh geometry={piece.logo} material={materials.logo} dispose={null} />}
  </group>)}</group>;
}
