'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { sampleGuide, smooth, stairHeight, STAIR, type GuidePose, type TourPlayback } from './gymTourConfig';

import ReceptionOffice from './ReceptionOffice';
let cached: Promise<GLTF> | undefined;
function loadGuide() {
  return cached ??= new GLTFLoader().loadAsync('/models/nexus-gym/ryan-guide.glb').catch(error => { cached = undefined; throw error; });
}
type Props = { active: boolean; motion: TourPlayback };

// Solve a two-bone chain in world space, preserving the model's bind axes.
function createLeg(avatar: THREE.Object3D, side: string) {
  const upper = avatar.getObjectByName(`mixamorig${side}UpLeg`);
  const lower = avatar.getObjectByName(`mixamorig${side}Leg`);
  const foot = avatar.getObjectByName(`mixamorig${side}Foot`);
  if (!upper || !lower || !foot) return null;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  upper.getWorldPosition(a); lower.getWorldPosition(b); foot.getWorldPosition(c);
  const l1 = a.distanceTo(b), l2 = b.distanceTo(c), sole = c.y;
  const restFoot = foot.getWorldQuaternion(new THREE.Quaternion());
  const target = new THREE.Vector3(), direction = new THREE.Vector3(), bend = new THREE.Vector3(), knee = new THREE.Vector3();
  const from = new THREE.Vector3(), to = new THREE.Vector3();
  const turn = new THREE.Quaternion(), world = new THREE.Quaternion(), inverse = new THREE.Quaternion();
  function aim(bone: THREE.Object3D, child: THREE.Object3D, destination: THREE.Vector3) {
    bone.getWorldPosition(a); child.getWorldPosition(b);
    from.subVectors(b, a).normalize(); to.subVectors(destination, a).normalize();
    turn.setFromUnitVectors(from, to); bone.getWorldQuaternion(world).premultiply(turn);
    bone.parent!.getWorldQuaternion(inverse).invert();
    bone.quaternion.copy(inverse.multiply(world));
  }
  return { target(step: number, phase: number, x: number, stair: number) {
    const swing = smooth((phase - .45) / 1.55);
    const next = Math.min(STAIR.count, step + 2);
    const z0 = STAIR.bottomZ - Math.min(step, STAIR.count) * STAIR.run;
    const z1 = STAIR.bottomZ - next * STAIR.run;
    const y0 = stairHeight(step), y1 = stairHeight(next);
    target.set(x, y0 + (y1 - y0) * swing + Math.sin(Math.PI * swing) * .14 + sole, z0 + (z1 - z0) * swing);
    const settle = smooth(stair - 19);
    target.y += (STAIR.landingY + sole - target.y) * settle;
    target.z += (STAIR.bottomZ - STAIR.count * STAIR.run - target.z) * settle;
    upper.getWorldPosition(a);
    const horizontal = (target.x - a.x) ** 2 + (target.z - a.z) ** 2;
    const reach = Math.sqrt(Math.max(.001, (l1 + l2 - .005) ** 2 - horizontal));
    return Math.max(0, a.y - target.y - reach);
  }, place(yaw: THREE.Quaternion) {
    upper.getWorldPosition(a);
    direction.subVectors(target, a);
    const distance = THREE.MathUtils.clamp(direction.length(), .02, l1 + l2 - .001);
    direction.normalize();
    const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
    bend.set(0, 0, -1).addScaledVector(direction, direction.z).normalize();
    knee.copy(a).addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
    aim(upper, lower, knee); aim(lower, foot, target);
    foot.parent!.getWorldQuaternion(inverse).invert();
    foot.quaternion.copy(inverse.multiply(world.copy(restFoot).premultiply(yaw)));
    foot.getWorldPosition(c);
    return c.distanceTo(target);
  } };
}

function AnimatedRyan({ asset, active, motion }: Props & { asset: GLTF }) {
  const root = useRef<THREE.Group>(null);
  const { gl, invalidate } = useThree();
  const elapsed = useRef(0);
  const lastProgress = useRef(0);
  const model = useMemo(() => {
    const avatar = clone(asset.scene);
    const bounds = new THREE.Box3().setFromObject(avatar), center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.74 / (bounds.max.y - bounds.min.y);
    avatar.scale.multiplyScalar(scale);
    avatar.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    avatar.updateMatrixWorld(true);
    const legs = [createLeg(avatar, 'Left'), createLeg(avatar, 'Right')];
    const hips = avatar.getObjectByName('mixamorigHips');
    const hipRest = hips?.position.clone();
    const overrides = ['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'].flatMap(name => {
      const bone = avatar.getObjectByName(`mixamorig${name}`);
      return bone ? [{ bone, position: bone.position.clone(), quaternion: bone.quaternion.clone() }] : [];
    });
    const mixer = new THREE.AnimationMixer(avatar);
    const actions = Object.fromEntries(asset.animations.map(clip => {
      const action = mixer.clipAction(clip); action.play(); action.paused = true;
      return [clip.name, action];
    }));
    return { avatar, mixer, actions, hips, hipRest, legs, overrides };
  }, [asset]);
  const pose = useMemo<GuidePose>(() => ({ position: [0, 0, 0], yaw: 0, stair: -1, walk: 0 }), []);
  const yaw = useMemo(() => new THREE.Quaternion(), []);
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  useEffect(() => {
    gl.domElement.dataset.guideSource = 'ready'; invalidate();
    return () => { model.mixer.stopAllAction(); model.mixer.uncacheRoot(model.avatar); };
  }, [gl, invalidate, model]);
  useEffect(() => { if (!active) elapsed.current = 0; else invalidate(); }, [active, invalidate]);
  useFrame((_, delta) => {
    if (!active || document.hidden || !root.current) return;
    elapsed.current += Math.min(delta, .05);
    const p = motion.progress;
    // PropertyMixer skips unchanged tracks. Restore the unmodified sampled pose
    // first, so procedural foot placement cannot feed back into the next frame.
    for (const state of model.overrides) { state.bone.position.copy(state.position); state.bone.quaternion.copy(state.quaternion); }
    if ((p > .015 && lastProgress.current <= .015) || (p > .94 && lastProgress.current <= .94)) elapsed.current = 0;
    lastProgress.current = p;
    sampleGuide(p, pose);
    root.current.position.fromArray(pose.position); root.current.rotation.y = pose.yaw;
    const wave = model.actions.Wave, walk = model.actions.Walk, idle = model.actions.Idle;
    const receptionPause = smooth((p - .75) / .01) * (1 - smooth((p - .853) / .01));
    const walking = (1 - receptionPause) * smooth((p - .12) / .04) * (1 - smooth((p - .91) / .02));
    const greeting = (p < .12 || p > .94) && elapsed.current < wave.getClip().duration ? 1 : 0;
    wave.setEffectiveWeight(greeting * (1 - walking)); wave.time = Math.min(elapsed.current, wave.getClip().duration - .001);
    walk.setEffectiveWeight(walking); walk.time = pose.walk % walk.getClip().duration;
    idle.setEffectiveWeight((1 - greeting) * (1 - walking)); idle.time = elapsed.current % idle.getClip().duration;
    model.mixer.update(0);
    for (const state of model.overrides) { state.position.copy(state.bone.position); state.quaternion.copy(state.bone.quaternion); }
    // Strip exported root travel; the scene route owns horizontal movement.
    if (model.hips && model.hipRest) { model.hips.position.x = model.hipRest.x; model.hips.position.z = model.hipRest.z; }
    let footError = 0;
    if (pose.stair >= 0) {
      yaw.setFromAxisAngle(axis, pose.yaw);
      let drop = 0;
      for (let i = 0; i < 2; i++) {
        const shifted = pose.stair + i;
        const step = Math.floor(shifted / 2) * 2 - i;
        drop = Math.max(drop, model.legs[i]?.target(step, shifted % 2, STAIR.x + (i === 0 ? -.13 : .13), pose.stair) || 0);
      }
      // Bend at the pelvis when the lower tread would otherwise overextend a leg.
      root.current.position.y -= drop;
      for (const leg of model.legs) footError = Math.max(footError, leg?.place(yaw) || 0);
    }
    gl.domElement.dataset.guideState = pose.stair >= 0 ? 'stairs' : walking > .01 ? 'walking' : greeting ? 'wave' : 'idle';
    gl.domElement.dataset.guidePosition = pose.position.map(v => v.toFixed(3)).join(',');
    gl.domElement.dataset.guideFootError = footError.toFixed(4);
    // The camera schedules walking frames from scroll. Only the greeting
    // needs its own clock; render one more frame to settle into the idle pose.
    if (greeting) invalidate();
  });
  return <group ref={root} dispose={null}>
    <primitive object={model.avatar} dispose={null} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .012, 0]}>
      <circleGeometry args={[.32, 32]} /><meshBasicMaterial color="#111820" transparent opacity={.16} depthWrite={false} />
    </mesh>
  </group>;
}

export default function RyanTourGuide(props: Props) {
  const [asset, setAsset] = useState<GLTF | null>(null);
  const { gl, invalidate } = useThree();
  useEffect(() => {
    let mounted = true;
    gl.domElement.dataset.guideSource = 'loading';
    loadGuide().then(value => { if (mounted) setAsset(value); }).catch(() => { if (mounted) { gl.domElement.dataset.guideSource = 'error'; invalidate(); } });
    return () => { mounted = false; };
  }, [gl, invalidate]);
  return <><ReceptionOffice asset={asset} motion={props.motion} active={props.active} />{asset && <AnimatedRyan {...props} asset={asset} />}</>;
}
