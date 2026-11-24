import { createProductFactory } from './productModels';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { gymProducts, type Product } from '../products';
import { TOUR_STOPS } from './navigation';

export interface ProductPlacement { product: Product; object: THREE.Group; position: THREE.Vector3 }
export function buildEnvironment(mobile: boolean, invalidate: () => void) {
  const room = new THREE.Group();
  const textures: THREE.Texture[] = [];
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const mat = (color: string, roughness = .5, metalness = .1) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness }); materials.add(material); return material;
  };
  const black = mat('#27292d', .72), olive = mat('#42454d', .64), stone = mat('#eef0ee', .46), metal = mat('#85888d', .28, .58);
  const warm = new THREE.MeshBasicMaterial({ color: '#f4dbc3', toneMapped: false }); materials.add(warm);
  const routeMaterial = new THREE.MeshBasicMaterial({ color: '#cf625e', toneMapped: false }); materials.add(routeMaterial);
  const boxGeo = new THREE.BoxGeometry(1, 1, 1); geometries.add(boxGeo);
  const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, mobile ? 24 : 48); geometries.add(cylinderGeo);
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent = room) {
    geometries.add(geometry); const object = new THREE.Mesh(geometry, material); parent.add(object); return object;
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, parent = room) {
    const object = mesh(boxGeo, material, parent); object.position.set(x, y, z); object.scale.set(w, h, d); object.receiveShadow = true; return object;
  }
  function cylinder(x: number, y: number, z: number, radius: number, height: number, material: THREE.Material, parent = room) {
    const object = mesh(cylinderGeo, material, parent); object.position.set(x, y, z); object.scale.set(radius, height, radius); return object;
  }
  function textureCanvas(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    draw(canvas.getContext('2d')!); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture); return texture;
  }
  let seed = 42;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const floorTexture = textureCanvas(512, 512, ctx => {
    ctx.fillStyle = '#cac8c3'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4400; i++) {
      ctx.fillStyle = ['#b4b1ac', '#e1dfd8', '#c1beb8', '#d7d4ce'][i % 4];
      ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, .3 + random() * .85, .2 + random() * .6, random() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#a39f99';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 512, 512);
  });
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; floorTexture.repeat.set(5, 7);
  const floorMat = mat('#e8e6e0', .68, .03); floorMat.map = floorTexture; floorMat.bumpMap = floorTexture; floorMat.bumpScale = .006;
  box(0, -.1, 0, 12, .2, 18, floorMat);
  box(-6, 3, 0, .2, 6, 18, black); box(6, 3, 0, .2, 6, 18, black);
  box(0, 3, -8, 12, 6, .2, black); box(0, 6, 0, 12, .15, 18, black);
  [-5.85, 5.85].forEach(x => box(x, .05, 0, .035, .035, 17, warm));
  box(0, .05, -7.85, 12, .035, .035, warm);

  function arch(width: number, height: number) {
    const radius = width / 2, shoulder = height - radius;
    const shape = new THREE.Shape(); shape.moveTo(-radius, 0); shape.lineTo(radius, 0); shape.lineTo(radius, shoulder);
    shape.absarc(0, shoulder, radius, 0, Math.PI, false); shape.lineTo(-radius, 0); return shape;
  }
  const shell = new THREE.ExtrudeGeometry(arch(2.65, 4.8), { depth: .12, bevelEnabled: false, curveSegments: 24 });
  const archPoints = [new THREE.Vector3(-1.325, .85, .25), new THREE.Vector3(-1.325, 4.325, .25)];
  for (let i = 0; i <= 32; i++) { const a = Math.PI - i / 32 * Math.PI; archPoints.push(new THREE.Vector3(Math.cos(a) * 1.325, 4.325 + Math.sin(a) * 1.325, .25)); }
  archPoints.push(new THREE.Vector3(1.325, .85, .25));
  const archLight = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 64, .014, 5, false);
  const shelfProducts: { product: Product; position: [number, number, number]; rotation: number }[] = [];
  function shelf(x: number, z: number, rotation: number) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = rotation; room.add(group);
    const back = mesh(shell, olive, group); back.position.y = .85;
    mesh(archLight, warm, group);
    box(0, .57, .36, 2.65, 1.14, .75, olive, group);
    box(0, .58, .755, .018, .96, .018, metal, group);
    [-.13, .13].forEach(x => box(x, .72, .77, .045, .14, .025, metal, group));
    for (let row = 0; row < 3; row++) {
      const y = 1.18 + row * .86;
      box(0, y, .43, 2.52, .08, .82, stone, group); box(0, y - .055, .83, 2.45, .025, .025, warm, group);
      const count = mobile ? 2 : 3;
      for (let i = 0; i < count; i++) {
        const px = -.94 + i * 1.88 / (count - 1);
        const local = new THREE.Vector3(px, y + .05, .51).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
        const category = x < 0 ? 'Supplements' : z < 0 ? 'Accessories' : 'Nutrition';
        const collection = gymProducts.filter(product => product.category === category);
        shelfProducts.push({ product: collection[(row * count + i) % collection.length], position: [x + local.x, local.y, z + local.z], rotation });
      }
    }

  }
  [-3.8, 0, 3.8].forEach(z => { shelf(-5.85, z, Math.PI / 2); shelf(5.85, z, -Math.PI / 2); });

  // Back-wall signature is original typography, not a modified official logo.
  const signTexture = textureCanvas(1024, 1024, ctx => {
    ctx.fillStyle = '#222329'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f5f1e8';
    ctx.font = '900 155px Arial'; ctx.fillText('NEXUS', 512, 387);
    ctx.font = '600 30px Arial'; ctx.fillText('F I T N E S S   C L U B', 512, 454);
    ctx.fillStyle = '#be4c4d'; ctx.fillRect(455, 505, 114, 5);
    ctx.fillStyle = '#ddd9d2';
    ctx.font = '600 38px Arial'; ctx.fillText('PRODUCT STUDIO', 512, 585);
  });
  const signMat = new THREE.MeshStandardMaterial({ map: signTexture, emissiveMap: signTexture, emissive: '#E8DDC8', emissiveIntensity: .28 }); materials.add(signMat);
  const sign = mesh(new THREE.ShapeGeometry(arch(4.7, 5.1)), signMat); sign.position.set(0, .15, -7.82);
  // Shape UVs are world units: explicitly normalize for legible sign artwork.
  const uv = sign.geometry.getAttribute('uv'); const pos = sign.geometry.getAttribute('position');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 2.35) / 4.7, pos.getY(i) / 5.1);
  const backOutline: THREE.Vector3[] = [new THREE.Vector3(-2.35, 0, -7.75), new THREE.Vector3(-2.35, 2.9, -7.75)];
  for (let i = 0; i <= 48; i++) { const a = Math.PI - i / 48 * Math.PI; backOutline.push(new THREE.Vector3(Math.cos(a) * 2.35, 2.9 + Math.sin(a) * 2.35, -7.75)); }
  backOutline.push(new THREE.Vector3(2.35, 0, -7.75));
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(backOutline), 80, .02, 6, false), warm);
  const islandOlive = mat('#672928', .45), islandRibs = mat('#422326', .42);
  const displayStone = mat('#f1efea', .43, .04);
  const shadowTexture = textureCanvas(128, 128, ctx => {
    const gradient = ctx.createRadialGradient(64, 64, 25, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(14, 15, 18, .58)');
    gradient.addColorStop(1, 'rgba(14, 15, 18, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  });
  const contactMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  materials.add(contactMaterial);
  const contact = mesh(new THREE.PlaneGeometry(5, 4.7), contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = .008;
  cylinder(0, .64, 0, 1.65, 1.22, islandOlive);
  for (let i = 0; i < (mobile ? 64 : 100); i++) {
    const angle = i / (mobile ? 64 : 100) * Math.PI * 2;
    cylinder(Math.cos(angle) * 1.66, .64, Math.sin(angle) * 1.66, .026, 1.16, islandRibs);
  }
  cylinder(0, 1.3, 0, 1.78, .12, displayStone); cylinder(0, 1.22, 0, 1.71, .025, metal);
  cylinder(0, 1.52, -.45, .64, .36, displayStone);
  const ring = mesh(new THREE.TorusGeometry(2.1, .065, 8, 96), metal); ring.rotation.x = Math.PI / 2; ring.position.set(0, 4.85, 0);
  const ringGlow = mesh(new THREE.TorusGeometry(2.1, .033, 8, 96), warm); ringGlow.rotation.x = Math.PI / 2; ringGlow.position.set(0, 4.8, 0);
  [-1.5, 1.5].forEach(x => box(x, 5.43, 0, .018, 1.1, .018, metal));
  const islandLight = new THREE.PointLight('#f4eee3', 26, 9, 2); islandLight.position.set(0, 4.3, 0); room.add(islandLight);
  const key = new THREE.SpotLight('#fff4e8', 106, 18, .74, .82, 1.65);
  key.position.set(-2.8, 5.5, 4.5); key.target.position.set(0, 1.2, 0);
  key.castShadow = !mobile; key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias = .025; room.add(key, key.target);
  const rim = new THREE.PointLight('#cedcf0', 17, 8, 2); rim.position.set(3.5, 3.8, -2.8); room.add(rim);
  const fill = new THREE.HemisphereLight('#f4f6fc', '#8a8f9c', 1.65);
  room.add(fill);
  [-4.2, 4.2].forEach(x => {
    box(x, 5.85, 0, .08, .08, 14, metal);
    [-4, 0, 4].forEach(z => { cylinder(x, 5.7, z, .14, .22, black); cylinder(x, 5.57, z, .1, .015, warm); });
  });
  const placements: ProductPlacement[] = [];
  const productFactory = createProductFactory(mobile, invalidate);
  function productModel(product: Product, position: [number, number, number], scale = 1) {
    const group = productFactory.create(product); group.position.set(...position); group.scale.setScalar(scale); room.add(group);
    placements.push({ product, object: group, position: group.position.clone().add(new THREE.Vector3(0, group.userData.height * scale / 2, 0)) });
    return group;
  }
  shelfProducts.forEach(({product, position, rotation}) => { productModel(product, position).rotation.y = rotation; });
  gymProducts.filter(product => ['whey', 'isolate', 'creatine', 'shaker', 'peanut', 'bar', 'electrolytes', 'gainer'].includes(product.id)).forEach((p, i) => {
    // Staggered display keeps front labels facing the entrance instead of hiding half the collection in a ring.
    const positions: [number, number, number][] = [[-1.14, 1.37, .65], [-.38, 1.37, 1.05], [.38, 1.37, 1.05], [1.14, 1.37, .65], [-.96, 1.37, -.38], [-.32, 1.73, -.45], [.32, 1.73, -.45], [.96, 1.37, -.38]];
    productModel(p, positions[i], 1.35);
  });
  // Batch fixed architecture by material. Interactive product groups stay separate for raycasting.
  room.updateMatrixWorld(true);
  const staticMeshes = new Map<THREE.Material, { source: THREE.Mesh; geometry: THREE.BufferGeometry }[]>();
  room.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || Array.isArray(object.material) || object.userData.productId) return;
    if (!staticMeshes.has(object.material)) staticMeshes.set(object.material, []);
    const copy = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    staticMeshes.get(object.material)!.push({ source: object, geometry: copy.applyMatrix4(object.matrixWorld) });
  });
  staticMeshes.forEach((entries, material) => {
    const merged = mergeGeometries(entries.map(entry => entry.geometry));
    if (merged) { entries.forEach(entry => entry.source.removeFromParent()); const batch = mesh(merged, material); batch.receiveShadow = true; batch.castShadow = material !== warm && material !== contactMaterial; }
    entries.forEach(entry => entry.geometry.dispose());
  });
  const navigationPoints = TOUR_STOPS.map((stop, index) => {
    const ring = mesh(new THREE.RingGeometry(.18, .204, 32), routeMaterial);
    ring.rotation.x = -Math.PI / 2; ring.position.set(stop.position[0], .015, stop.position[2]);
    ring.userData.tourStop = index; return ring;
  });

  return {
    room, placements, navigationPoints,
    setTheme(dark: boolean) {
      black.color.set(dark ? '#34363e' : '#efeee9');
      olive.color.set(dark ? '#484b55' : '#dad6ce');
      stone.color.set(dark ? '#898c95' : '#f1f0eb');
      floorMat.color.set(dark ? '#85858a' : '#e3ded6');
      islandOlive.color.set(dark ? '#682d33' : '#8a3538');
      islandRibs.color.set(dark ? '#54262b' : '#6d2c2f');
      fill.intensity = dark ? 1.48 : 1.8;
    },
    dispose() {
      productFactory.dispose();
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    },
  };
}
