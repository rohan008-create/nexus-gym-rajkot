import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';

// Ray-marched density, advected through 3D space. No smoke textures or sprites.
const fragment = `
varying vec2 vUv;
uniform float time;
uniform float aspect;
float hash(vec3 p) {
  p=fract(p*.1031);p+=dot(p,p.yzx+33.33);
  return fract((p.x+p.y)*p.z);
}
float noise(vec3 p) {
  vec3 i=floor(p), f=fract(p); vec3 u=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),u.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),u.x),u.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),u.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),u.x),u.y),u.z);
}
float fbm(vec3 p) {
  float n=0., amplitude=.57;
  for(int i=0;i<3;i++){n+=noise(p)*amplitude;p=p*2.07+vec3(8.1,3.7,5.2);amplitude*=.48;}
  return n;
}
float density(vec3 p) {
  vec3 drift=vec3(time*.17,-time*.23,time*.075);
  float curl=fbm(p*.73+drift*.55);
  vec3 q=p+vec3(curl*2.,sin(p.x*1.3+time*.22)*.34,curl*1.3);
  float cloud=fbm(q*1.85+drift);
  float billow=fbm(q*.88-drift*.6);
  float roof=.45+billow*2.7;
  float heightMask=smoothstep(-.3,.1,p.y)*(1.-smoothstep(roof*.48,roof,p.y));
  float bank=exp(-p.x*p.x*.018)*exp(-p.z*p.z*.17);
  float plumes=.55+exp(-pow((p.x+2.)*.65,2.))+exp(-pow((p.x-1.8)*.7,2.));
  return smoothstep(.4,.66,cloud)*heightMask*bank*plumes*2.3;
}
void main(){
  if(vUv.y>.88 || vUv.y<.025){gl_FragColor=vec4(0.);return;}
  vec3 origin=vec3((vUv.x-.5)*aspect*3.2,(vUv.y-.13)*3.2,-2.5);
  vec3 ray=normalize(vec3((vUv.x-.5)*.08,.025,1.));
  float transmittance=1.;vec3 light=vec3(0.);
  const float stepSize=5./float(STEPS);
  for(int i=0;i<STEPS;i++){
    vec3 p=origin+ray*(float(i)+.5)*stepSize;
    float d=density(p);
    if(d>.003){
      float extinction=1.-exp(-d*stepSize*1.35);
      float redLight=exp(-p.x*p.x*.12)*(.7+.3*exp(-p.z*p.z));
      float edge=pow(clamp(1.-d*.7,0.,1.),2.);
      vec3 scattering=mix(vec3(.19,.18,.205),vec3(.86,.045,.095),redLight*.8)*exp(-d*.3);
      scattering+=vec3(.3,.14,.16)*edge*.55;
      light+=transmittance*extinction*scattering;
      transmittance*=1.-extinction;
      if(transmittance<.035)break;
    }
  }
  float frameFade=smoothstep(.035,.24,vUv.y)*(1.-smoothstep(.72,.88,vUv.y));
  float alpha=(1.-transmittance)*smoothstep(0.,.1,vUv.x)*smoothstep(0.,.1,1.-vUv.x)*frameFade;
  gl_FragColor=vec4(light/max(1.-transmittance,.001),alpha*.84);
}
`;
export default function SmokeEffect({ animate }: { animate: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const { size, camera, viewport, gl } = useThree();
  const uniforms = useMemo(() => ({ time: { value: 12 }, aspect: { value: 1 } }), []);
  const shader = useMemo(() => fragment.replaceAll('STEPS', size.width < 700 ? '12' : '20'), [size.width < 700]);
  // Smoke is soft: ray-march at half CSS resolution, independent of device DPR.
  // The bag, typography and tearing sheets retain the canvas's full resolution.
  const buffer = useFBO(Math.max(1, Math.ceil(size.width * .5)), Math.max(1, Math.ceil(size.height * .65 * .5)), {
    depthBuffer: false, stencilBuffer: false, type: THREE.UnsignedByteType,
  });
  const pass = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ uniforms, fragmentShader: shader,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      depthTest: false, depthWrite: false, toneMapped: false });
    scene.add(new THREE.Mesh(geometry, material));
    return { scene, camera, geometry, material };
  }, [shader, uniforms]);
  useEffect(() => () => { pass.geometry.dispose(); pass.material.dispose(); }, [pass]);
  const displayUniforms = useMemo(() => ({ smoke: { value: buffer.texture } }), [buffer]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, delta) => {
    if (animate) uniforms.time.value += Math.min(delta, .08);
    if (!mesh.current) return;
    // Place one volume behind the bag, covering the lower part of the view.
    target.copy(camera.position).add(offset.set(0, 0, -16).applyQuaternion(camera.quaternion));
    const view = viewport.getCurrentViewport(camera, target);
    mesh.current.position.copy(target).add(offset.set(0, -view.height*.17, 0).applyQuaternion(camera.quaternion));
    mesh.current.quaternion.copy(camera.quaternion);
    mesh.current.scale.set(view.width, view.height*.65, 1);
    uniforms.aspect.value = view.width/(view.height*.65);
    const previousTarget = gl.getRenderTarget();
    try {
      gl.setRenderTarget(buffer);
      gl.render(pass.scene, pass.camera);
    } finally {
      gl.setRenderTarget(previousTarget);
    }
  }, -1);
  return <mesh ref={mesh} name="ProceduralSmokeVolume" renderOrder={1} userData={{ procedural: true, steps: size.width < 700 ? 12 : 20 }}>
    <planeGeometry args={[1, 1]} /><shaderMaterial uniforms={displayUniforms} vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader="varying vec2 vUv;uniform sampler2D smoke;void main(){gl_FragColor=texture2D(smoke,vUv);}" transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
  </mesh>;
}
