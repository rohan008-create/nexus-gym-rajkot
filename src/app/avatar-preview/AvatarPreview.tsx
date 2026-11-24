'use client';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, useAnimations, useGLTF } from '@react-three/drei';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Box3, Euler, Quaternion, Vector3 } from 'three';
import './preview.css';
import Link from 'next/link';

const RYAN_ANIMATIONS = ['Idle', 'Walk', 'Wave', 'Talk', 'Confident', 'Argue', 'Cheer', 'Laugh', 'Drink', 'Clap', 'Think', 'Shrug', 'Phone'];

function Ryan({ animation }: { animation: string }) {
  const { scene, animations } = useGLTF('/models/avatar-preview/ryan-smart.glb');
  const { avatar, scale, position } = useMemo(() => {
    const avatar = clone(scene);
    const bounds = new Box3().setFromObject(avatar);
    const center = bounds.getCenter(new Vector3());
    const scale = 1.8 / Math.max(bounds.max.y - bounds.min.y, .001);
    return { avatar, scale, position: new Vector3(-center.x * scale, -bounds.min.y * scale, -center.z * scale) };
  }, [scene]);
  const { actions } = useAnimations(animations, avatar);
  useEffect(() => {
    const action = actions[animation];
    action?.reset().fadeIn(.2).play();
    return () => { action?.fadeOut(.2); };
  }, [actions, animation]);
  return <group scale={scale} position={position}><primitive object={avatar} /></group>;
}

function Boy({ follow, dancing }: { follow: boolean; dancing: boolean }) {
  const { scene } = useGLTF('/models/avatar-preview/boy.glb');
  const avatar = useMemo(() => {
    const object = clone(scene);
    const bounds = new Box3().setFromObject(object);
    const center = bounds.getCenter(new Vector3());
    object.position.set(-center.x, -bounds.min.y, -center.z);
    return object;
  }, [scene]);
  const time = useRef(0);
  const bones = useMemo(() => Object.fromEntries([
    'Hips', 'Spine', 'Spine1', 'Spine2', 'Head', 'LeftArm', 'RightArm',
    'LeftForeArm', 'RightForeArm', 'LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg',
  ].flatMap(name => {
    const bone = avatar.getObjectByName(name);
    return bone ? [[name, { bone, rest: bone.quaternion.clone(), position: bone.position.clone(), target: new Quaternion() }]] : [];
  })), [avatar]);
  const offset = useMemo(() => new Quaternion(), []);
  const angles = useMemo(() => new Euler(), []);
  useFrame(({ pointer }, delta) => {
    const step = Math.min(delta, .05);
    if (dancing) time.current += step;
    const beat = time.current * Math.PI * 2 * 1.65;
    const sway = Math.sin(beat), bounce = Math.cos(beat * 2);
    const blend = 1 - Math.exp(-step * 12);
    const pose = (name: string, x = 0, y = 0, z = 0) => {
      const joint = bones[name];
      if (!joint) return;
      offset.setFromEuler(angles.set(x, y, z));
      joint.target.copy(joint.rest).multiply(offset);
      joint.bone.quaternion.slerp(joint.target, blend);
    };
    // Original procedural groove: alternating steps, bent elbows and torso sway.
    pose('Hips', 0, dancing ? sway * .16 : 0, dancing ? sway * .07 : 0);
    pose('Spine', dancing ? .08 : 0, dancing ? -sway * .12 : 0, dancing ? -sway * .1 : 0);
    pose('Spine1', 0, dancing ? sway * .14 : 0);
    pose('Spine2', 0, dancing ? sway * .1 : 0);
    pose('LeftArm', dancing ? .35 + sway * .3 : 0, 0, dancing ? .45 + sway * .35 : 0);
    pose('RightArm', dancing ? .35 - sway * .3 : 0, 0, dancing ? -.45 + sway * .35 : 0);
    pose('LeftForeArm', dancing ? -.3 : 0, dancing ? -.2 : 0, dancing ? -1.1 - sway * .4 : 0);
    pose('RightForeArm', dancing ? -.3 : 0, dancing ? .2 : 0, dancing ? 1.1 - sway * .4 : 0);
    pose('LeftUpLeg', dancing ? -.12 - Math.max(0, sway) * .28 : 0, 0, dancing ? -.06 : 0);
    pose('RightUpLeg', dancing ? -.12 - Math.max(0, -sway) * .28 : 0, 0, dancing ? .06 : 0);
    pose('LeftLeg', dancing ? .18 + Math.max(0, sway) * .35 : 0);
    pose('RightLeg', dancing ? .18 + Math.max(0, -sway) * .35 : 0);
    pose('Head', (follow ? -pointer.y * .2 : 0) + (dancing ? bounce * .06 : 0), (follow ? pointer.x * .45 : 0), dancing ? -sway * .08 : 0);
    const hips = bones.Hips;
    if (hips) {
      hips.bone.position.x += (hips.position.x + (dancing ? sway * .09 : 0) - hips.bone.position.x) * blend;
      hips.bone.position.y += (hips.position.y + (dancing ? -.025 + bounce * .025 : 0) - hips.bone.position.y) * blend;
    }
  });
  return <primitive object={avatar} />;
}

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="avatar-message">Couldn’t open the preview. Refresh the page to try again.</div>
      : this.props.children;
  }
}

export default function AvatarPreview() {
  const [model, setModel] = useState('ryan');
  const [animation, setAnimation] = useState('Idle');
  const [follow, setFollow] = useState(true);
  const [dancing, setDancing] = useState(true);
  const [view, setView] = useState(0);
  return <main className="avatar-preview">
    <header className="avatar-toolbar">
      <div><p>NEXUS / CHARACTER LAB</p><h1>{model === 'ryan' ? 'Ryan preview' : 'Avatar preview'}</h1></div>
      <div className="avatar-actions">
        <select aria-label="Character" value={model} onChange={event => setModel(event.target.value)}>
          <option value="ryan">Ryan smart</option><option value="boy">Original boy</option>
        </select>
        {model === 'ryan' ? <select aria-label="Animation" value={animation} onChange={event => setAnimation(event.target.value)}>
          {RYAN_ANIMATIONS.map(name => <option key={name} value={name}>{name}</option>)}
        </select> : <>
        <button type="button" aria-pressed={dancing} onClick={() => setDancing(value => !value)}>{dancing ? 'Stop dance' : 'Dance'}</button>
        <button type="button" aria-pressed={follow} onClick={() => setFollow(value => !value)}>Mouse follow: {follow ? 'On' : 'Off'}</button>
        </>}
        <button type="button" onClick={() => setView(value => value + 1)}>Reset view</button>
        <Link href="/">Back to website ↗</Link>
      </div>
    </header>
    <div className="avatar-stage">
      <PreviewBoundary>
        <Canvas key={view} dpr={[1, 1.5]} camera={{ position: [0, 1.1, 3.4], fov: 38 }} gl={{ antialias: true }} fallback={<div className="avatar-message">This preview is unavailable in your browser.</div>}>
          <color attach="background" args={['#15191f']} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[3, 5, 4]} intensity={3} />
          <directionalLight position={[-3, 2, -2]} intensity={2} color="#91bcff" />
          <Suspense fallback={<Html center><span className="avatar-loading">Loading character…</span></Html>}>
            {model === 'ryan' ? <Ryan animation={animation} /> : <Boy follow={follow} dancing={dancing} />}
          </Suspense>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.015, 0]}>
            <circleGeometry args={[1.15, 64]} /><meshStandardMaterial color="#252d38" roughness={.9} />
          </mesh>
          <OrbitControls makeDefault target={[0, .95, 0]} minDistance={1.3} maxDistance={6} maxPolarAngle={Math.PI / 2} enablePan={false} />
        </Canvas>
      </PreviewBoundary>
    </div>
    <footer className="avatar-caption">Drag to rotate · Scroll or pinch to zoom <span>{model === 'ryan' ? `Ryan smart · ${animation}` : 'Ready Player Me avatar'} · Preview only</span></footer>
  </main>;
}
