import { createContext, useContext, useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { createLeather } from './leather';

export function createBagGeometry() {
  const profile = [new THREE.Vector2(0, -1.58), new THREE.Vector2(.35, -1.57), new THREE.Vector2(.54, -1.5), new THREE.Vector2(.61, -1.38)];
  for (let i = 0; i <= 90; i++) { const y = -1.3 + i / 90 * 2.6; profile.push(new THREE.Vector2(.625 + Math.sin(i * .12) * .006, y)); }
  profile.push(new THREE.Vector2(.59, 1.43), new THREE.Vector2(.48, 1.51), new THREE.Vector2(.25, 1.55), new THREE.Vector2(0, 1.56));
  const g = new THREE.LatheGeometry(profile, 128);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(x, z); const fold = Math.pow(Math.min(1, Math.abs(y) / 1.5), 9); const s = 1 + .004 * Math.sin(a * 13 + y * 8) + .006 * Math.sin(a * 9 + y * 18 + Math.sin(a * 5)) + fold * .028 * Math.sin(a * 31 + y * 4); p.setXYZ(i, x * s, y, z * s); } g.computeVertexNormals(); return g;
}
export function createLogoGeometry() {
  const g = new THREE.PlaneGeometry(1.04, 1.04 / 3, 64, 8); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const angle = p.getX(i) / .635; p.setXYZ(i, Math.sin(angle) * .64, p.getY(i), Math.cos(angle) * .64); } g.computeVertexNormals(); return g;
}
type Surface = { leather: ReturnType<typeof createLeather>; body: THREE.BufferGeometry; logoGeometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; logoMaterial: THREE.MeshStandardMaterial };
const Context = createContext<Surface>(null!);
export function useBagSurface() { return useContext(Context); }
export function BagSurface({ children, logoUrl = '/assets/nexus-logo.png' }: { children: React.ReactNode; logoUrl?: string }) {
  const logo = useTexture(logoUrl); logo.colorSpace = THREE.SRGBColorSpace;
  const value = useMemo(() => {
    const leather = createLeather();
    const material = new THREE.MeshStandardMaterial({ map: leather.map, normalMap: leather.normal, normalScale: new THREE.Vector2(.16, .16), roughnessMap: leather.bump, roughness: .83, metalness: .02 });
    const logoMaterial = new THREE.MeshStandardMaterial({ map: logo, transparent: true, alphaTest: .04, roughness: .65, polygonOffset: true, polygonOffsetFactor: -2, side: THREE.DoubleSide });
    return { leather, material, logoMaterial, body: createBagGeometry(), logoGeometry: createLogoGeometry() };
  }, [logo]);
  useEffect(() => () => { value.body.dispose(); value.logoGeometry.dispose(); value.material.dispose(); value.logoMaterial.dispose(); value.leather.dispose(); }, [value]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
