'use client';

import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Independent roadside planting positions preserve parallax as the camera
// leaves its establishing shot and approaches the stairs.
const planting = [
  // x, z, crown width, tree height, yaw
  [-18, 2.4, 7.8, 8.8, .05],
  [-19.7, -7.6, 10.5, 11.2, -.24],
  [-18.9, -19, 8.8, 9.3, .26],
  [-19.6, -31, 10.2, 10.7, -.17],
  [-11.3, -27.5, 7.4, 8.1, .28],
  [-18.5, -44, 10.1, 10.8, .16],
  [14.4, .15, 9.6, 10.6, -.16],
  [22.1, -6, 12.4, 11.4, -.35],
  [13.4, -21, 8.1, 8.7, -.4],
  [24, -23, 13.8, 12.5, -.13],
  // Overhanging crown on the far pavement, high above the sight line.
  [-11.5, 18.5, 7, 12, .28],
] as const;

function plantTrees(aspect: number, texture: THREE.Texture) {
  const quad = new THREE.PlaneGeometry(1, 1);
  quad.translate(0, .5, 0);
  const leaves = new THREE.MeshBasicMaterial({
    map: texture, alphaTest: .45, side: THREE.DoubleSide, toneMapped: false,
  });
  const shade = new THREE.MeshBasicMaterial({
    map: texture, color: '#201d19', transparent: true, opacity: .26,
    depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2,
  });
  const crowns = new THREE.InstancedMesh(quad, leaves, planting.length);
  const shadows = new THREE.InstancedMesh(quad, shade, planting.length);
  const dummy = new THREE.Object3D();
  planting.forEach(([x, z, width, height, yaw], i) => {
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, yaw + (i % 2 ? Math.PI : 0), 0);
    dummy.scale.set(width * Math.min(1.1, Math.max(.9, aspect)), height, 1);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
    crowns.setColorAt(i, new THREE.Color().setRGB(1 - (i % 3) * .055, 1 - (i % 4) * .023, .93 + (i % 3) * .025));
    // Flatten the same perforated canopy down-sun for an inexpensive static
    // shadow; interior gaps transmit light between the branches.
    dummy.position.set(x, -.025, z);
    dummy.rotation.set(-Math.PI / 2, 0, .68, 'XYZ');
    dummy.scale.set(width, height * .78, 1);
    dummy.updateMatrix();
    shadows.setMatrixAt(i, dummy.matrix);
  });
  crowns.computeBoundingSphere();
  shadows.computeBoundingSphere();
  return { crowns, shadows, dispose() {
    crowns.dispose(); shadows.dispose(); quad.dispose(); leaves.dispose(); shade.dispose();
  } };
}

export default function StreetTrees() {
  const { invalidate } = useThree();
  const group = useMemo(() => new THREE.Group(), []);
  useEffect(() => {
    let active = true;
    let trees: ReturnType<typeof plantTrees> | undefined;
    const texture = new THREE.TextureLoader().load('/models/nexus-gym/roadside-neem.webp', map => {
      if (!active) return;
      map.colorSpace = THREE.SRGBColorSpace;
      trees = plantTrees(map.image.width / map.image.height, map);
      group.add(trees.crowns, trees.shadows);
      invalidate();
    });
    return () => {
      active = false;
      group.clear();
      trees?.dispose();
      texture.dispose();
    };
  }, [group, invalidate]);
  return <primitive object={group} dispose={null} />;
}
