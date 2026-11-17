import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { createSuspension, stepSuspension } from './suspensionMotion';
import { createStrap, updateStrap } from './strapGeometry';

export default function HangingRope({ pivot, reduced, active, elapsed }: {
  pivot: React.RefObject<THREE.Group>; reduced: boolean; active: boolean; elapsed: React.MutableRefObject<number>;
}) {
  const source = useTexture('/assets/trainers/nexus-lanyard-strap.png');
  const assets = useMemo(() => {
    // Reuse the stitched black/red Nexus webbing from the trainer badges.
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!; ctx.translate(128, 0); ctx.rotate(Math.PI / 2);
    ctx.drawImage(source.image, 0, 0, 1024, 128);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4;
    const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .8, metalness: .03,
      side: THREE.FrontSide, transparent: true });
    const sim = createSuspension(new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 2.76, 0));
    const main = createStrap(48, .21, 7.24), curve = new THREE.CatmullRomCurve3(sim.nodes);
    const slings = Array.from({ length: 4 }, (_, i) => {
      const angle = Math.PI / 4 + i * Math.PI / 2;
      return { ...createStrap(12, .105, 1.32), local: new THREE.Vector3(Math.sin(angle) * .57, -1.65, Math.cos(angle) * .57),
        end: new THREE.Vector3(), curve: new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3()) };
    });
    return { texture, material, sim, main, curve, slings, end: new THREE.Vector3(), local: new THREE.Vector3(0, -.44, 0),
      fixedAcross: new THREE.Vector3(1, 0, 0), bagAcross: new THREE.Vector3(), rotation: new THREE.Quaternion() };
  }, [source]);
  useEffect(() => () => {
    assets.main.geometry.dispose(); assets.slings.forEach(s => s.geometry.dispose());
    assets.texture.dispose(); assets.material.dispose();
  }, [assets]);
  useFrame(({ clock }, delta) => {
    if (!pivot.current) return;
    pivot.current.updateWorldMatrix(true, false);
    assets.end.copy(assets.local).applyMatrix4(pivot.current.matrixWorld);
    stepSuspension(assets.sim, assets.end, delta, clock.elapsedTime, reduced);
    assets.material.opacity = active ? 1 - THREE.MathUtils.smoothstep(elapsed.current, .45, 1.15) : 1;
    const stretch = Math.pow(Math.max(1, assets.sim.anchor.distanceTo(assets.end) / 7.24), .35);
    pivot.current.getWorldQuaternion(assets.rotation);
    assets.bagAcross.set(1, 0, 0).applyQuaternion(assets.rotation);
    updateStrap(assets.main, assets.curve, assets.fixedAcross, assets.bagAcross, stretch, true);
    assets.slings.forEach(s => {
      s.end.copy(s.local).applyMatrix4(pivot.current!.matrixWorld);
      s.curve.v1.copy(assets.end); s.curve.v2.copy(s.end);
      updateStrap(s, s.curve, assets.main.side, assets.bagAcross, stretch);
    });
  });
  return <group name="AnchoredElasticSuspension">
    <mesh name="FixedTopNexusStrap" geometry={assets.main.geometry} material={assets.material} frustumCulled={false} dispose={null} />
    {assets.slings.map((s, i) => <mesh key={i} name={`ElasticBagSling${i}`} geometry={s.geometry} material={assets.material} frustumCulled={false} dispose={null} />)}
  </group>;
}
