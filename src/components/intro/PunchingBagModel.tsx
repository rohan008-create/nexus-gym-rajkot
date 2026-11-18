import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as THREE from 'three';
import { useBagSurface } from './BagSurface';
export type BagAsset = { modelUrl?: string; logoUrl?: string };
function ExternalBag({ url }: { url: string }) { const { scene } = useGLTF(url); const clone = useMemo(() => scene.clone(true), [scene]); return <primitive object={clone} />; }
function ProceduralBag({ logoUrl }: { logoUrl: string }) {
  const { leather, body, logoGeometry, logoMaterial } = useBagSurface();
  const materials = useMemo(() => ({
    leather: new THREE.MeshStandardMaterial({ map: leather.map, normalMap: leather.normal, normalScale: new THREE.Vector2(.16, .16), roughnessMap: leather.bump, roughness: .83, metalness: .02 }),
    ring: new THREE.MeshStandardMaterial({ color: '#827164', roughness: .94 }),
    stitch: new THREE.MeshStandardMaterial({ color: '#84756b', roughness: 1 }),
    metal: new THREE.MeshStandardMaterial({ color: '#aeb1ba', metalness: 1, roughness: .22 }),
    rivet: new THREE.MeshStandardMaterial({ color: '#787980', metalness: 1, roughness: .35 }),
  }), [leather]);
  // The stitches, rings and hardware are static relative to the bag. Bake their
  // local transforms into one geometry per material so the assembly costs five
  // draw calls instead of one per tiny mesh. The separate invisible picking
  // volume in BagExplosion still handles interaction, unchanged.
  const decor = useMemo(() => {
    const buckets: Record<string, THREE.BufferGeometry[]> = { leather: [], ring: [], stitch: [], metal: [], rivet: [] };
    const add = (key: string, source: THREE.BufferGeometry, transform: (g: THREE.BufferGeometry) => void) => {
      const geometry = source.clone(); transform(geometry); buckets[key].push(geometry);
    };
    const ring = new THREE.TorusGeometry(.611, .027, 8, 128);
    const fine = new THREE.TorusGeometry(.633, .0035, 5, 128);
    const strap = new THREE.BoxGeometry(.15, .44, .045);
    const stitch = new THREE.BoxGeometry(.004, .012, .003);
    const eye = new THREE.TorusGeometry(.075, .017, 8, 20);
    const rivet = new THREE.CylinderGeometry(.018, .018, .01, 10);
    const back = new THREE.BoxGeometry(.018, 2.7, .013);
    for (const y of [-1.4, 1.35]) {
      add('leather', ring, g => { g.rotateX(Math.PI / 2); g.translate(0, y, 0); });
      for (const d of [-.025, .025]) add('ring', fine, g => { g.rotateX(Math.PI / 2); g.translate(0, y + d, 0); });
    }
    add('leather', back, g => g.translate(0, 0, -.628));
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      add('leather', strap, g => { g.translate(0, 1.27, .61); g.rotateY(a); });
      add('metal', eye, g => { g.translate(0, 1.55, .57); g.rotateY(a); });
      for (const x of [-.049, .049]) for (let j = 0; j < 14; j++) {
        add('stitch', stitch, g => { g.translate(x, 1.09 + j * .026, .635); g.rotateY(a); });
      }
      for (const y of [1.12, 1.33]) add('rivet', rivet, g => { g.rotateX(Math.PI / 2); g.translate(0, y, .638); g.rotateY(a); });
    }
    [ring, fine, strap, stitch, eye, rivet, back].forEach(g => g.dispose());
    const merged: Record<string, THREE.BufferGeometry> = {};
    for (const [key, geometries] of Object.entries(buckets)) {
      merged[key] = mergeGeometries(geometries, false)!;
      geometries.forEach(g => g.dispose());
    }
    return merged;
  }, []);
  useEffect(() => () => {
    Object.values(decor).forEach(g => g.dispose());
    Object.values(materials).forEach(m => m.dispose());
  }, [decor, materials]);
  return <group>
    <mesh geometry={body} material={materials.leather} />
    <mesh geometry={logoGeometry} position={[0, .38, 0]}><primitive object={logoMaterial} attach="material" /></mesh>
    <mesh geometry={decor.leather} material={materials.leather} />
    <mesh geometry={decor.ring} material={materials.ring} />
    <mesh geometry={decor.stitch} material={materials.stitch} />
    <mesh geometry={decor.metal} material={materials.metal} />
    <mesh geometry={decor.rivet} material={materials.rivet} />
  </group>;
}
/** GLB contract: meters, body centered at origin, height 3.14, logo/front facing +Z. */
export default function PunchingBagModel({ modelUrl, logoUrl = '/assets/nexus-logo.png' }: BagAsset) { return modelUrl ? <ExternalBag url={modelUrl} /> : <ProceduralBag logoUrl={logoUrl} />; }
