import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { createRopeMaterial } from './ropeMaterial';
import { RopeGeometry } from './ropeGeometry';
import type { RopeMotion } from './RopeScrollController';

type Props = RopeMotion & { mobile: boolean; reduced: boolean; onReady: () => void };
export default function BattleRopeMesh({ mobile, reduced, progress, pointer, velocity, layout, onReady }: Props) {
  const mesh = useRef<THREE.Mesh>(null), phase = useRef(1.2), amplitude = useRef(1);
  const { gl } = useThree();
  const rope = useMemo(() => new RopeGeometry(mobile), [mobile]);
  const surface = useMemo(() => createRopeMaterial(rope.radius), [rope]);
  const update = useMemo(() => ({ phase: 1.2, progress: 0, amplitude: 1, layout: layout.current }), [layout]);
  const previous = useRef({ phase: -1, progress: -1, amplitude: -1, layout: null as typeof layout.current | null });
  useEffect(() => () => rope.dispose(), [rope]);
  useEffect(() => () => surface.dispose(), [surface]);
  useEffect(() => {
    if (mesh.current) gl.domElement.dataset.ropeId = mesh.current.uuid;
    onReady(); return () => { delete gl.domElement.dataset.ropeId; };
  }, [gl, onReady]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, .05);
    if (!reduced) phase.current += dt * .72;
    velocity.current *= Math.exp(-dt * 4.5);
    const tension = reduced ? 1 : 1 + velocity.current * .3 + (!mobile ? pointer.current.y * .07 : 0);
    amplitude.current = THREE.MathUtils.damp(amplitude.current, tension, 2.8, dt);
    if (Math.abs(amplitude.current - tension) < .00001) amplitude.current = tension;
    if (reduced && previous.current.phase === phase.current && previous.current.progress === progress.current && previous.current.amplitude === amplitude.current && previous.current.layout === layout.current) { surface.pulse.strength.value = 0; return; }
    update.phase = phase.current; update.progress = progress.current; update.amplitude = amplitude.current; update.layout = layout.current;
    rope.update(update);
    previous.current.phase = phase.current; previous.current.progress = progress.current; previous.current.amplitude = amplitude.current; previous.current.layout = layout.current;
    const p = progress.current;
    surface.pulse.position.value = rope.headingArc * p / .72;
    surface.pulse.strength.value = reduced ? 0 : THREE.MathUtils.smoothstep(p, .035, .12) * (1 - THREE.MathUtils.smoothstep(p, .84, .98));
  });
  return <mesh name="NexusBattleRope" ref={mesh} geometry={rope.geometry} material={surface.material} frustumCulled={false} dispose={null} />;
}
