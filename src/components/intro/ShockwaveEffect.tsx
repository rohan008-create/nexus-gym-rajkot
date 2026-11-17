import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
export default function ShockwaveEffect({ elapsed, reduced, active = true, cinematic = false }: { elapsed: React.MutableRefObject<number>; reduced: boolean; active?: boolean; cinematic?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null), flash = useRef<THREE.Mesh>(null), light = useRef<THREE.PointLight>(null);
  const uniforms = useMemo(() => ({ opacity: { value: 0 } }), []);
  useFrame(() => {
    const t = elapsed.current, blast = Math.max(0, t - .15);
    if (!mesh.current || !flash.current || !light.current) return;
    if (!active) { mesh.current.visible = flash.current.visible = false; light.current.intensity = 0; return; }
    flash.current.visible = true;
    const strength = reduced ? .15 : cinematic ? .22 : 1;
    mesh.current.visible = !cinematic && t > .15 && t < 1;
    mesh.current.scale.setScalar(.65 + blast * 11);
    uniforms.opacity.value = strength * Math.max(0, .25 * (1 - blast / .8));
    flash.current.scale.setScalar(.12 + blast * 3);
    (flash.current.material as THREE.MeshBasicMaterial).opacity = strength * (t > .15 ? Math.max(0, .6 * (1 - blast / .16)) : t * .4);
    light.current.intensity = strength * (t < .15 ? t * 50 : Math.max(0, 80 * (1 - blast / .3)));
  });
  return <group>
    <mesh ref={mesh}><sphereGeometry args={[1, 36, 24]} /><shaderMaterial uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending}
      forceSinglePass vertexShader="varying vec3 vNormal;varying vec3 vView;varying vec3 vPos;void main(){vPos=position;vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=normalize(-p.xyz);gl_Position=projectionMatrix*p;}"
      fragmentShader="varying vec3 vNormal;varying vec3 vView;varying vec3 vPos;uniform float opacity;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),3.);float ripple=.8+.2*sin(vPos.y*45.+vPos.x*18.);gl_FragColor=vec4(.85,.045,.025,rim*opacity*ripple);}" /></mesh>
    <mesh ref={flash}><sphereGeometry args={[1, 20, 16]} /><meshBasicMaterial color="#ffb7a3" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
    <pointLight ref={light} color={cinematic ? '#ffd2b5' : '#ff301b'} distance={8} intensity={0} />
  </group>;
}
