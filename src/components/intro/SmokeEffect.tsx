import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
const fragment = `
varying vec2 vUv; uniform float time;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(13.2,7.1);a*=.5;}return v;}
void main(){vec2 p=vUv*vec2(6.,3.);vec2 q=vec2(fbm(p+time*.019),fbm(p+vec2(4.1,-time*.025)));float n=fbm(p+q*3.+vec2(time*.014,0.));float edge=smoothstep(0.,.18,vUv.x)*smoothstep(0.,.18,1.-vUv.x)*smoothstep(0.,.25,vUv.y)*smoothstep(0.,.3,1.-vUv.y);float density=smoothstep(.35,.8,n)*edge;gl_FragColor=vec4(mix(vec3(.17,.16,.17),vec3(.26,.025,.035),vUv.x),density*.16);}
`;
export default function SmokeEffect({ animate, layers = 2, detail = 5 }: { animate: boolean; layers?: number; detail?: number }) {
  const shader = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ time: { value: 8 } }), []);
  const fragmentShader = useMemo(() => fragment.replace('i<5', `i<${detail}`), [detail]);
  useFrame((_, delta) => { if (animate && shader.current) shader.current.uniforms.time.value += delta; });
  return <group>{Array.from({ length: layers }, (_, i) => <mesh key={i} position={[i ? .8 : -.8, -1.7 + i * .7, -2.7 - i]} rotation={[0, 0, i * .12]}>
    <planeGeometry args={[10, 4]} /><shaderMaterial ref={i === 0 ? shader : undefined} uniforms={uniforms} vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader={fragmentShader} transparent depthWrite={false} side={THREE.DoubleSide} />
  </mesh>)}</group>;
}
