import * as THREE from 'three';

/** Seamless crossed plaits and fine nylon filaments; all maps are generated locally. */
export function createRopeMaterial(radius: number) {
  const size = 512, height = new Float32Array(size * size);
  const color = new Uint8Array(size * size * 4), normal = new Uint8Array(size * size * 4), rough = new Uint8Array(size * size * 4);
  const tau = Math.PI * 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const a = (u * 8 + v * 8) * tau, b = (u * 8 - v * 8) * tau;
    const over = Math.sin(a) * Math.sin(b);
    const strand = Math.max(0, Math.cos(over > 0 ? a : b));
    const filament = Math.sin((over > 0 ? a : b) * 11) * .5 + .5;
    const noise = Math.sin(x * 97.13 + y * 51.77) * Math.cos(x * 13.71 - y * 83.19);
    height[y * size + x] = .28 + strand * .46 + filament * .055 + noise * .015;
    const i = (y * size + x) * 4;
    const sector = Math.floor(u * 8) % 8;
    const thread = (sector === 1 || sector === 5) && Math.sin(a * 4) > .92;
    const shade = 24 + strand * 14 + filament * 5 + noise * 3;
    color[i] = thread ? 65 + shade * .3 : shade; color[i + 1] = thread ? 10 + shade * .2 : shade * 1.02; color[i + 2] = thread ? 17 + shade * .2 : shade * 1.08; color[i + 3] = 255;
    rough[i] = rough[i + 1] = rough[i + 2] = 205 + filament * 25 - strand * 14; rough[i + 3] = 255;
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4, h = height[y * size + x];
    const dx = (height[y * size + (x + 1) % size] - h) * 3;
    const dy = (height[((y + 1) % size) * size + x] - h) * 3;
    const length = Math.sqrt(dx * dx + dy * dy + 1);
    normal[i] = (1 - dx / length) * 127.5; normal[i + 1] = (1 - dy / length) * 127.5; normal[i + 2] = (1 + 1 / length) * 127.5; normal[i + 3] = 255;
  }
  const texture = (data: typeof color) => {
    const map = new THREE.DataTexture(data, size, size); map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1, 1); map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearMipmapLinearFilter; map.generateMipmaps = true; map.anisotropy = 8; map.needsUpdate = true; return map;
  };
  const map = texture(color), normalMap = texture(normal), roughnessMap = texture(rough);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(.5, .5), roughnessMap, roughness: .96, metalness: .01, envMapIntensity: 1.2 });
  const pulse = { position: { value: 0 }, strength: { value: 0 } };
  material.onBeforeCompile = shader => {
    shader.uniforms.uPulseAt = pulse.position; shader.uniforms.uPulseStrength = pulse.strength;
    shader.vertexShader = `varying float vRopeArc;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>\nvRopeArc = uv.y * ${(Math.PI * 2 * radius).toFixed(8)};`);
    shader.fragmentShader = `varying float vRopeArc; uniform float uPulseAt; uniform float uPulseStrength;\n${shader.fragmentShader}`.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat ropePulse = exp(-pow((vRopeArc-uPulseAt)/0.32,2.0))*uPulseStrength; totalEmissiveRadiance += vec3(0.45,0.006,0.012)*ropePulse;');
  };
  material.customProgramCacheKey = () => `nexus-rope-pulse-${radius}`;
  return { material, pulse, dispose: () => { material.dispose(); map.dispose(); normalMap.dispose(); roughnessMap.dispose(); } };
}
