import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useBagSurface } from './BagSurface';
import { createRiftSheet } from './riftGeometry';
import { createRiftTextures } from './riftTexture';
import { ENTRANCE_ASSETS } from './entranceArtwork';

const vertexShader = `
  attribute float edgeDistance;
  uniform float time; uniform float side; uniform float halfWidth; uniform float halfHeight; uniform float reduced;
  varying vec2 vUv; varying float vEdge; varying float vShade; varying float vCrease;
  void main() {
    vUv = uv; vEdge = edgeDistance;
    float phase = clamp((time - .46 - (side > 0. ? .055 : 0.)) / 1.48, 0., 1.);
    float opening = (.5 - .5 * cos(phase * 3.14159265)) * (1. - reduced);
    float curl = pow(1. - edgeDistance, 1.65) * opening;
    float angle = curl * 2.45;
    vec3 p = position;
    // A continuous sheet bends from the torn edge; its print and creases follow.
    p.x += side * halfWidth * (opening * .88 + sin(angle) * .2);
    p.z += halfWidth * (1. - cos(angle)) * .35 + opening * 1.1;
    p.y += sin(uv.y * 7. + side) * opening * curl * halfHeight * .045;
    vShade = .9 - sin(angle) * .35;
    vCrease = pow(max(0., sin(angle + .25)), 12.);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  }
`;
const fragmentShader = `
  uniform sampler2D page; uniform sampler2D cracks; uniform float time; uniform float aspect; uniform float reduced;
  varying vec2 vUv; varying float vEdge; varying float vShade; varying float vCrease;
  void main() {
    vec3 print = texture2D(page, vUv).rgb;
    float fault = 0.;
    if (time > .23 && time < .95 && reduced < .5) {
      float radius = length((vUv - .5) * vec2(aspect, 1.)) / length(vec2(aspect, 1.) * .5);
      float propagation = smoothstep(radius, radius + .12, (time - .23) * 3.5);
      fault = texture2D(cracks, vUv).r * propagation;
    }
    float flash = smoothstep(.23, .3, time) * (1. - smoothstep(.55, .95, time));
    float edge = (1. - smoothstep(0., .004, vEdge)) * smoothstep(.25, .36, time);
    float rim = edge * (1. - smoothstep(.65, 1.3, time));
    vec3 color = print * vShade + vCrease * vec3(.055, .05, .052);
    if (!gl_FrontFacing) color = vec3(.025, .022, .025) + vCrease * .065;
    color += fault * flash * vec3(.6, .1, .1) * (1. - reduced);
    color += (rim * vec3(.16, .025, .035) + edge * vec3(.055, .05, .052)) * (1. - reduced);
    float alpha = 1. - smoothstep(reduced > .5 ? .25 : 1.95, reduced > .5 ? .8 : 2.25, time);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

/** The front page itself rips open as two connected, curling sheets. */
export default function RiftSurface({ elapsed, active, reduced }: {
  elapsed: React.MutableRefObject<number>; active: boolean; reduced: boolean;
}) {
  const { camera, size } = useThree();
  const { logoMaterial } = useBagSurface();
  const artwork = useTexture(ENTRANCE_ASSETS);
  const root = useRef<THREE.Group>(null);
  const aspect = size.width / size.height;
  const resources = useMemo(() => {
    const height = 2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * 19 * 1.015;
    const width = height * aspect;
    const textures = createRiftTextures(aspect, logoMaterial.map?.image as CanvasImageSource, artwork.map(texture => texture.image as CanvasImageSource));
    const sheets = ([-1, 1] as const).map(side => {
      const geometry = createRiftSheet(width, height, side, size.width < 700);
      const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, side: THREE.DoubleSide,
        transparent: true, forceSinglePass: true, toneMapped: false,
        uniforms: { page: { value: textures.page }, cracks: { value: textures.cracks }, time: { value: 0 },
          side: { value: side }, halfWidth: { value: width / 2 }, halfHeight: { value: height / 2 }, aspect: { value: aspect }, reduced: { value: 0 } } });
      return { side, geometry, material };
    });
    return { textures, sheets };
  }, [camera, aspect, size.width, logoMaterial, artwork]);
  useEffect(() => () => {
    resources.textures.page.dispose(); resources.textures.cracks.dispose();
    resources.sheets.forEach(sheet => { sheet.geometry.dispose(); sheet.material.dispose(); });
  }, [resources]);
  useFrame(() => {
    if (!root.current) return;
    root.current.position.copy(camera.position); root.current.quaternion.copy(camera.quaternion);
    const t = active ? elapsed.current : 0;
    root.current.visible = t < (reduced ? .85 : 2.28);
    resources.sheets.forEach(sheet => {
      sheet.material.uniforms.time.value = t;
      sheet.material.uniforms.reduced.value = reduced ? 1 : 0;
    });
  });
  return <group ref={root}>{resources.sheets.map(sheet => <mesh key={sheet.side} name={sheet.side < 0 ? 'RiftLeftSheet' : 'RiftRightSheet'}
    position={[0, 0, -19]} geometry={sheet.geometry} material={sheet.material} frustumCulled={false} dispose={null} />)}</group>;
}
