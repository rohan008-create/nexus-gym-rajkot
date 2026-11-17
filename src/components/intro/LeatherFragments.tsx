import { useEffect, useMemo, useRef } from 'react';
import { ConvexHullCollider, RapierRigidBody, RigidBody, interactionGroups } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useBagSurface } from './BagSurface';
import { fractureGeometry, LeatherPiece, seededRandom } from './fractureGeometry';

type Props = { burst: boolean; transform: THREE.Matrix4; fracturedModelUrl?: string; elapsed: React.MutableRefObject<number>; reduced: boolean };
type Piece = LeatherPiece & { authoredMaterial?: THREE.Material | THREE.Material[] };
function Fragment({ piece, index, burst, transform, inner, elapsed, reduced }: { piece: Piece; index: number; inner: THREE.Material } & Props) {
  const ref = useRef<RapierRigidBody>(null);
  const surface = useBagSurface();
  const colliding = useRef(false);
  useFrame(() => { if (burst && !colliding.current && elapsed.current > .38 && ref.current) { ref.current.collider(0).setCollisionGroups(interactionGroups(1, [1])); colliding.current = true; } });
  useEffect(() => {
    const body = ref.current; if (!burst || !body) return;
    const random = seededRandom(935 + index * 67);
    const position = piece.center.clone().applyMatrix4(transform);
    const rotation = new THREE.Quaternion().setFromRotationMatrix(transform);
    body.setTranslation(position, true); body.setRotation(rotation, true);
    // Collider mass changes are deferred by Rapier until a step unless recomputed.
    // Resolve them before applying impulses to avoid tiny default hull masses.
    body.collider(0).setMass(piece.mass);
    body.recomputeMassPropertiesFromColliders();
    const radial = new THREE.Vector3(piece.center.x, piece.center.y * .3, piece.center.z).normalize().applyQuaternion(rotation);
    const speed = (reduced ? .6 : 2.5 + random() * 1.5) / Math.pow(piece.mass + .4, .22);
    const mass = body.mass();
    body.applyImpulse({ x: radial.x * speed * mass, y: (2.7 + radial.y * 2 + random()) * mass, z: radial.z * speed * mass }, true);
    const spin = reduced ? 1 : 6;
    body.setAngvel({ x: (random() - .5) * spin, y: (random() - .5) * spin, z: (random() - .5) * spin }, true);
  }, [burst, transform, piece, index, reduced]);
  return <RigidBody ref={ref} position={piece.center.toArray()} colliders={false} linearDamping={.2} angularDamping={.35} ccd>
    <ConvexHullCollider args={[piece.shell.attributes.position.array as Float32Array]} mass={piece.mass} collisionGroups={interactionGroups(1, [])} friction={.6} restitution={.08} />
    <mesh geometry={piece.shell} material={piece.authoredMaterial ?? [surface.material, inner]} dispose={null} />
    {piece.logo && <mesh geometry={piece.logo} material={surface.logoMaterial} dispose={null} />}
  </RigidBody>;
}
function Pieces({ pieces, burst, transform, elapsed, reduced }: Props & { pieces: Piece[] }) {
  const inner = useMemo(() => new THREE.MeshStandardMaterial({ color: '#302722', roughness: .96, side: THREE.DoubleSide }), []);
  useEffect(() => () => inner.dispose(), [inner]);
  return <group visible={burst}>{pieces.map((piece, i) => <Fragment key={i} piece={piece} index={i} burst={burst} transform={transform} inner={inner} elapsed={elapsed} reduced={reduced} />)}</group>;
}
function AuthoredFragments(props: Props & { fracturedModelUrl: string }) {
  const { scene } = useGLTF(props.fracturedModelUrl);
  const pieces = useMemo(() => {
    scene.updateMatrixWorld(true);
    const output: Piece[] = [];
    scene.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      const shell = node.geometry.clone().applyMatrix4(node.matrixWorld); shell.computeBoundingBox();
      const center = shell.boundingBox!.getCenter(new THREE.Vector3()); shell.translate(-center.x, -center.y, -center.z);
      const size = shell.boundingBox!.getSize(new THREE.Vector3());
      output.push({ shell, center, mass: Math.max(.04, size.x * size.y * 1.9), authoredMaterial: node.material });
    }); return output;
  }, [scene]);
  useEffect(() => () => pieces.forEach(p => p.shell.dispose()), [pieces]);
  return <Pieces {...props} pieces={pieces} />;
}
function ProceduralFragments(props: Props) {
  const surface = useBagSurface();
  const pieces = useMemo(() => fractureGeometry(surface.body, surface.logoGeometry), [surface]);
  useEffect(() => () => pieces.forEach(p => { p.shell.dispose(); p.logo?.dispose(); }), [pieces]);
  return <Pieces {...props} pieces={pieces} />;
}
/** Authored GLB contract: one mesh per shard, original bag coordinates and baked branding. */
export default function LeatherFragments(props: Props) { return props.fracturedModelUrl ? <AuthoredFragments {...props} fracturedModelUrl={props.fracturedModelUrl} /> : <ProceduralFragments {...props} />; }
