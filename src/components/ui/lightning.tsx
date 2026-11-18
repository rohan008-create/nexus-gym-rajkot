'use client';
// components/ui/lightning.tsx
// Zero-dependency WebGL2 Lightning Background component for React + TypeScript
import React, { useEffect, useRef, useState } from 'react';

export type LightningPlacement = 'sides' | 'left' | 'center' | 'right';
export type LightningFade = 'none' | 'radial' | 'top' | 'bottom' | 'left' | 'right';

export interface LightningProps {
  amplitude?: number;
  branches?: number;
  cloudColor?: string;
  clouds?: number;
  color?: string;
  fade?: LightningFade;
  fallback?: string;
  frequency?: number;
  glow?: number;
  grain?: number;
  intensity?: number;
  interactive?: boolean;
  opacity?: number;
  paused?: boolean;
  placement?: LightningPlacement;
  quality?: number;
  reach?: number;
  seed?: number;
  speed?: number;
  thickness?: number;
  time?: number;
  surfaceMode?: 'dark' | 'light';
  className?: string;
  children?: React.ReactNode;
}

function parseCssColorToRgb(colorInput: string, isDarkSurface = true): [number, number, number] {
  const trimmed = colorInput.trim().toLowerCase();
  if (trimmed.includes('--foreground')) {
    return isDarkSurface ? [0.98, 0.98, 0.98] : [0.06, 0.06, 0.08];
  }
  if (trimmed.includes('--muted-foreground')) {
    return isDarkSurface ? [0.63, 0.63, 0.68] : [0.44, 0.44, 0.48];
  }
  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ];
  }
  const rgbMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(trimmed);
  if (rgbMatch) {
    return [
      Math.min(255, Number(rgbMatch[1])) / 255,
      Math.min(255, Number(rgbMatch[2])) / 255,
      Math.min(255, Number(rgbMatch[3])) / 255,
    ];
  }
  return [185 / 255, 196 / 255, 1];
}

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_seed;
uniform vec3 u_color;
uniform vec3 u_cloudColor;
uniform float u_amplitude;
uniform int u_branches;
uniform float u_clouds;
uniform float u_frequency;
uniform float u_glow;
uniform float u_intensity;
uniform float u_reach;
uniform float u_thickness;
uniform float u_speed;
uniform float u_grain;
uniform float u_opacity;
uniform int u_placement;
uniform int u_fade;
uniform float u_lightMode;
uniform float u_manualAge;
uniform vec2 u_manualTarget;
uniform float u_manualSeed;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float snoise(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash22(i)), dot(b, hash22(i + o)), dot(c, hash22(i + 1.0)));
  return dot(n, vec3(70.0));
}

float cloudFbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.52;
  mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    sum += amp * snoise(p);
    p = rot * p * 2.04;
    amp *= 0.5;
  }
  return sum * 0.5 + 0.5;
}

vec2 sdSegmentWithT(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return vec2(length(pa - ba * h), h);
}

vec2 boltVertex(int idx, float totalSegs, float startX, float slant, float boltReach, float sId, float amp, float aspect) {
  float t = float(idx) / totalSegs;
  float y = t * boltReach;
  if (idx == 0) return vec2(startX * aspect, 0.0);
  float wander = sin(t * 4.9 + sId * 3.17) * 0.026
               + sin(t * 10.7 + sId * 8.43) * 0.014
               + (hash11(floor(t * 10.0) + sId * 19.3) - 0.5) * 0.018;
  float microJag = (hash11(float(idx) * 13.71 + sId * 41.37) - 0.5) * 0.016;
  float env = smoothstep(0.0, 0.08, t);
  float x = (startX + slant * t + (wander + microJag) * amp * env) * aspect;
  return vec2(x, y);
}

void main() {
  vec2 res = max(u_resolution, vec2(1.0));
  float aspect = res.x / res.y;
  vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
  vec2 p = vec2(uv.x * aspect, uv.y);

  float cloudMask = 0.0;
  if (u_clouds > 0.005) {
    float drift = u_time * max(0.0, u_speed) * 0.055;
    vec2 cUv = vec2(uv.x * aspect * 1.35 + drift + u_seed * 0.37, uv.y * 2.15);
    float f1 = cloudFbm(cUv);
    float f2 = cloudFbm(cUv * 2.2 - vec2(drift * 1.35, 0.25));
    float density = smoothstep(0.24, 0.84, mix(f1, f2, 0.42));
    float depth = mix(0.36, 0.82, clamp(u_clouds, 0.0, 1.0));
    float topBand = 1.0 - smoothstep(0.02, depth, uv.y + (density - 0.5) * 0.28);
    cloudMask = clamp(density * topBand * u_clouds * 1.32, 0.0, 1.0);
  }

  float safeFreq = clamp(u_frequency, 0.15, 3.0);
  float safeSpeed = clamp(u_speed, 0.0, 3.0);
  float period = max(1.5, 3.1 / (safeFreq * max(0.25, safeSpeed * 0.75 + 0.25)));
  float cycleTime = u_time;
  float strikeIdx = floor(cycleTime / period);
  float strikeAge = cycleTime - strikeIdx * period;
  float triggerDelay = (strikeIdx < 0.5) ? 0.0 : hash11(strikeIdx + u_seed * 7.13) * (period * 0.32);
  float autoAge = strikeAge - triggerDelay;

  bool useManual = (u_manualAge >= 0.0 && u_manualAge < 0.85);
  float age = useManual ? u_manualAge : autoAge;
  float sId = useManual ? (u_manualSeed + 50.0 + u_seed * 3.1) : (strikeIdx + u_seed * 19.37 + 1.0);

  float flash = 0.0;
  if (age >= 0.0 && age < 0.85) {
    float rise = smoothstep(0.0, 0.085, age);
    float decay = exp(-max(0.0, age - 0.07) * 4.4);
    flash = rise * decay * step(age, 0.84);
  }

  float startX = 0.5;
  if (useManual) {
    startX = clamp(u_manualTarget.x, 0.06, 0.94);
  } else {
    float rPos = hash11(sId * 11.73);
    if (u_placement == 0) {
      bool rightSide = mod(strikeIdx + floor(u_seed), 2.0) < 0.5;
      startX = rightSide ? mix(0.74, 0.88, rPos) : mix(0.12, 0.26, rPos);
    } else if (u_placement == 1) {
      startX = mix(0.12, 0.34, rPos);
    } else if (u_placement == 2) {
      startX = mix(0.42, 0.58, rPos);
    } else {
      startX = mix(0.66, 0.88, rPos);
    }
  }

  float boltReach = clamp(u_reach, 0.28, 1.0);
  if (useManual) {
    boltReach = clamp(max(u_manualTarget.y, 0.35), 0.28, 1.0);
  }

  float boltCore = 0.0;
  float boltHalo = 0.0;
  float cloudIllum = 0.0;

  if (flash > 0.004) {
    float approxX = startX * aspect;
    float maxSpread = 0.28 * u_amplitude + 0.16;
    float dxApprox = abs(p.x - approxX);
    vec2 illumCenter = vec2(approxX, min(0.28, boltReach * 0.42));
    float dIllum = length((p - illumCenter) * vec2(0.75, 1.15));
    cloudIllum = exp(-dIllum * 2.8) * flash * u_intensity;

    if (dxApprox < maxSpread && uv.y <= boltReach + 0.06) {
      const int MAIN_SEGS = 44;
      const float F_SEGS = 44.0;
      float minDist = 1e5;
      float pxScale = 1.0 / res.y;
      float slant = (hash11(sId * 5.9) - 0.5) * 0.08 * u_amplitude;

      int centerSeg = clamp(int(floor((uv.y / max(boltReach, 0.01)) * F_SEGS)), 1, MAIN_SEGS);
      int segStart = max(1, centerSeg - 4);
      int segEnd = min(MAIN_SEGS, centerSeg + 4);

      vec2 prevPt = boltVertex(segStart - 1, F_SEGS, startX, slant, boltReach, sId, u_amplitude, aspect);
      for (int i = 1; i <= MAIN_SEGS; i++) {
        if (i < segStart || i > segEnd) continue;
        vec2 currPt = boltVertex(i, F_SEGS, startX, slant, boltReach, sId, u_amplitude, aspect);
        vec2 seg = sdSegmentWithT(p, prevPt, currPt);
        minDist = min(minDist, seg.x);
        prevPt = currPt;
      }

      float baseWidth = max(0.65, u_thickness) * pxScale * 0.56;
      float glowScale = max(0.05, u_glow);
      boltCore = exp(-pow(minDist / max(baseWidth, 1e-4), 1.6));
      boltHalo = exp(-minDist / (baseWidth * 7.5 * glowScale + 0.0055)) * 0.52 * glowScale;

      if (u_branches > 0) {
        float branchCore = 0.0;
        float branchHalo = 0.0;
        float bWidth = baseWidth * 0.48;

        for (int b = 0; b < 8; b++) {
          if (b >= u_branches) break;
          float bRand = hash11(sId * 17.9 + float(b) * 13.3);
          int anchorIdx = clamp(6 + int(floor(bRand * 28.0)), 5, 36);
          vec2 bStart = boltVertex(anchorIdx, F_SEGS, startX, slant, boltReach, sId, u_amplitude, aspect);
          float bDir = (mod(float(b) + floor(hash11(sId * 3.7) * 2.0), 2.0) < 0.5) ? -1.0 : 1.0;
          float bSpread = mix(0.05, 0.13, hash11(sId * 19.7 + float(b) * 7.3)) * (0.65 + 0.35 * u_amplitude);
          float bDrop = mix(0.11, 0.26, hash11(sId * 29.3 + float(b) * 11.1)) * boltReach;
          if (uv.y < bStart.y - 0.03 || uv.y > bStart.y + bDrop + 0.03) continue;

          vec2 bPrev = bStart;
          float thisBranchMin = 1e5;
          float thisBranchProg = 0.0;

          for (int j = 1; j <= 8; j++) {
            float bt = float(j) / 8.0;
            float bWander = sin(bt * 4.2 + float(b) * 2.1 + sId) * 0.009 * u_amplitude;
            float bJag = (hash11(sId * 53.0 + float(b) * 17.0 + float(j) * 9.0) - 0.5) * 0.009 * u_amplitude;
            vec2 bCurr = vec2(
              bStart.x + (bDir * bt * bSpread + bWander + bJag) * aspect,
              bStart.y + bt * bDrop
            );
            vec2 seg = sdSegmentWithT(p, bPrev, bCurr);
            if (seg.x < thisBranchMin) {
              thisBranchMin = seg.x;
              thisBranchProg = ((float(j - 1) + seg.y) / 8.0);
            }
            bPrev = bCurr;
          }

          float tipTaper = pow(1.0 - smoothstep(0.05, 1.0, thisBranchProg), 1.35);
          float bStrength = mix(0.28, 0.44, hash11(sId * 7.1 + float(b) * 5.3));
          branchCore = max(branchCore, exp(-pow(thisBranchMin / max(bWidth, 1e-4), 1.55)) * bStrength * tipTaper);
          branchHalo = max(branchHalo, exp(-thisBranchMin / (bWidth * 5.5 * glowScale + 0.003)) * (bStrength * 0.45) * glowScale * tipTaper);
        }

        boltCore = max(boltCore, branchCore);
        boltHalo = max(boltHalo, branchHalo);
      }

      float tipFade = 1.0 - smoothstep(boltReach - 0.04, boltReach + 0.01, uv.y);
      boltCore *= tipFade;
      boltHalo *= tipFade;
    }
  }

  float strikeStrength = flash * clamp(u_intensity, 0.0, 2.5);
  vec3 outColor = vec3(0.0);
  float outAlpha = 0.0;

  if (u_lightMode < 0.5) {
    vec3 ambientClouds = u_cloudColor * (cloudMask * 0.52);
    vec3 litClouds = mix(u_cloudColor, u_color, 0.58) * (cloudMask * cloudIllum * 1.25);
    vec3 hotCoreColor = mix(u_color, vec3(1.0), 0.85);
    vec3 boltRgb = hotCoreColor * (boltCore * strikeStrength * 1.65) + u_color * (boltHalo * strikeStrength * 0.95);
    outColor = clamp(ambientClouds + litClouds + boltRgb, 0.0, 1.0);
    outAlpha = clamp(max(cloudMask * 0.72, (boltCore + boltHalo * 0.82) * strikeStrength), 0.0, 1.0);
  } else {
    vec3 slateCloud = mix(vec3(0.28, 0.32, 0.40), u_cloudColor * 0.65, 0.45);
    vec3 inkBolt = u_color * 0.35;
    float boltInk = clamp((boltCore * 0.95 + boltHalo * 0.35) * strikeStrength, 0.0, 1.0);
    float cloudInk = cloudMask * (0.42 + cloudIllum * 0.22);
    outAlpha = clamp(max(cloudInk, boltInk), 0.0, 1.0);
    outColor = mix(slateCloud, inkBolt, clamp(boltInk * 1.25, 0.0, 1.0)) * outAlpha;
  }

  if (u_grain > 0.005) {
    float g = (hash12(gl_FragCoord.xy + fract(u_time * 60.0) * 100.0) - 0.5) * u_grain * 0.14;
    outColor = clamp(outColor + g * outAlpha, 0.0, 1.0);
  }

  float edgeMask = 1.0;
  if (u_fade == 1) {
    float distCenter = length((uv - 0.5) * vec2(1.4, 1.4));
    edgeMask = 1.0 - smoothstep(0.35, 0.88, distCenter);
  } else if (u_fade == 2) {
    edgeMask = smoothstep(0.0, 0.38, uv.y);
  } else if (u_fade == 3) {
    edgeMask = 1.0 - smoothstep(0.58, 1.0, uv.y);
  } else if (u_fade == 4) {
    edgeMask = smoothstep(0.0, 0.35, uv.x);
  } else if (u_fade == 5) {
    edgeMask = 1.0 - smoothstep(0.65, 1.0, uv.x);
  }

  float mask = edgeMask * clamp(u_opacity, 0.0, 1.0);
  fragColor = vec4(outColor * mask, outAlpha * mask);
}`;

const PLACEMENT_INDEX: Record<LightningPlacement, number> = {
  sides: 0,
  left: 1,
  center: 2,
  right: 3,
};

const FADE_INDEX: Record<LightningFade, number> = {
  none: 0,
  radial: 1,
  top: 2,
  bottom: 3,
  left: 4,
  right: 5,
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export const Lightning: React.FC<LightningProps> = ({
  amplitude = 1,
  branches = 5,
  cloudColor = '#5a648f',
  clouds = 0.7,
  color = '#b9c4ff',
  fade = 'none',
  fallback,
  frequency = 1,
  glow = 1,
  grain = 0,
  intensity = 1,
  interactive = true,
  opacity = 1,
  paused = false,
  placement = 'sides',
  quality,
  reach = 1,
  seed = 0,
  speed = 1,
  thickness = 2,
  time,
  surfaceMode = 'dark',
  className = '',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const propsRef = useRef({
    amplitude, branches, cloudColor, clouds, color, fade, frequency, glow,
    grain, intensity, interactive, opacity, paused, placement, quality,
    reach, seed, speed, thickness, time, surfaceMode,
  });

  propsRef.current = {
    amplitude, branches, cloudColor, clouds, color, fade, frequency, glow,
    grain, intensity, interactive, opacity, paused, placement, quality,
    reach, seed, speed, thickness, time, surfaceMode,
  };

  const manualStrikeRef = useRef({
    triggeredAtMs: -1,
    targetX: 0.5,
    targetY: 0.9,
    seed: 1,
    lastClickMs: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext('webgl2', {
      alpha: true, antialias: false, depth: false, stencil: false,
      powerPreference: 'high-performance', premultipliedAlpha: true,
    });
    if (!gl) { setWebglFailed(true); return; }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) { if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs); setWebglFailed(true); return; }

    const program = gl.createProgram();
    if (!program) { gl.deleteShader(vs); gl.deleteShader(fs); setWebglFailed(true); return; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
      setWebglFailed(true); return;
    }

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const posLoc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      time: gl.getUniformLocation(program, 'u_time'),
      seed: gl.getUniformLocation(program, 'u_seed'),
      color: gl.getUniformLocation(program, 'u_color'),
      cloudColor: gl.getUniformLocation(program, 'u_cloudColor'),
      amplitude: gl.getUniformLocation(program, 'u_amplitude'),
      branches: gl.getUniformLocation(program, 'u_branches'),
      clouds: gl.getUniformLocation(program, 'u_clouds'),
      frequency: gl.getUniformLocation(program, 'u_frequency'),
      glow: gl.getUniformLocation(program, 'u_glow'),
      intensity: gl.getUniformLocation(program, 'u_intensity'),
      reach: gl.getUniformLocation(program, 'u_reach'),
      thickness: gl.getUniformLocation(program, 'u_thickness'),
      speed: gl.getUniformLocation(program, 'u_speed'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      opacity: gl.getUniformLocation(program, 'u_opacity'),
      placement: gl.getUniformLocation(program, 'u_placement'),
      fade: gl.getUniformLocation(program, 'u_fade'),
      lightMode: gl.getUniformLocation(program, 'u_lightMode'),
      manualAge: gl.getUniformLocation(program, 'u_manualAge'),
      manualTarget: gl.getUniformLocation(program, 'u_manualTarget'),
      manualSeed: gl.getUniformLocation(program, 'u_manualSeed'),
    };

    let widthPx = 1;
    let heightPx = 1;
    const syncSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25) * Math.max(.25, Math.min(1, propsRef.current.quality ?? 1));
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (w !== widthPx || h !== heightPx) {
        widthPx = w; heightPx = h;
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(container);
    syncSize();

    // Lightning colors are static props; parse them once instead of allocating
    // arrays and re-running regular expressions on every 30 fps draw.
    const colorCache = new Map<string, [number, number, number]>();
    const parseColor = (value: string, dark: boolean) => {
      const key = value + '|' + dark;
      let parsed = colorCache.get(key);
      if (!parsed) { parsed = parseCssColorToRgb(value, dark); colorCache.set(key, parsed); }
      return parsed;
    };

    let animId = 0;
    let lastNow = performance.now();
    let simTime = 0.09;
    let lastDraw = -Infinity;
    let drawn = false;
    const contextLost = (event: Event) => { event.preventDefault(); setWebglFailed(true); cancelAnimationFrame(animId); };
    canvas.addEventListener('webglcontextlost', contextLost);

    const loop = (now: number) => {
      const p = propsRef.current;
      // Decorative lightning needs only 30fps. Avoid layout reads on every frame.
      animId = requestAnimationFrame(loop);
      if (document.hidden || (p.paused && drawn)) { lastNow = now; return; }
      if (now - lastDraw < 1000 / 30) return;
      lastDraw = now;
      drawn = true;
      const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;
      if (!p.paused && p.time === undefined) simTime += dt;

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      const isDark = p.surfaceMode !== 'light';
      const [cr, cg, cb] = parseColor(p.color, isDark);
      const [ccr, ccg, ccb] = parseColor(p.cloudColor, isDark);
      const manual = manualStrikeRef.current;
      const manualAge = manual.triggeredAtMs >= 0 ? (now - manual.triggeredAtMs) / 1000 : -1;

      gl.uniform2f(u.resolution, widthPx, heightPx);
      gl.uniform1f(u.time, p.time ?? simTime);
      gl.uniform1f(u.seed, p.seed);
      gl.uniform3f(u.color, cr, cg, cb);
      gl.uniform3f(u.cloudColor, ccr, ccg, ccb);
      gl.uniform1f(u.amplitude, p.amplitude);
      gl.uniform1i(u.branches, Math.round(p.branches));
      gl.uniform1f(u.clouds, p.clouds);
      gl.uniform1f(u.frequency, p.frequency);
      gl.uniform1f(u.glow, p.glow);
      gl.uniform1f(u.intensity, p.intensity);
      gl.uniform1f(u.reach, p.reach);
      gl.uniform1f(u.thickness, p.thickness);
      gl.uniform1f(u.speed, p.speed);
      gl.uniform1f(u.grain, p.grain);
      gl.uniform1f(u.opacity, p.opacity);
      gl.uniform1i(u.placement, PLACEMENT_INDEX[p.placement]);
      gl.uniform1i(u.fade, FADE_INDEX[p.fade]);
      gl.uniform1f(u.lightMode, isDark ? 0 : 1);
      gl.uniform1f(u.manualAge, manualAge);
      gl.uniform2f(u.manualTarget, manual.targetX, manual.targetY);
      gl.uniform1f(u.manualSeed, manual.seed);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', contextLost);
      gl.deleteBuffer(quadBuffer); gl.deleteVertexArray(vao);
      gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || paused) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, label')) return;
    const now = performance.now();
    const manual = manualStrikeRef.current;
    if (now - manual.lastClickMs < 950) return;
    const rect = e.currentTarget.getBoundingClientRect();
    manual.lastClickMs = now;
    manual.triggeredAtMs = now - 60;
    manual.targetX = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / Math.max(1, rect.width)));
    manual.targetY = Math.max(reach * 0.65, Math.max(0.35, Math.min(1.0, (e.clientY - rect.top) / Math.max(1, rect.height))));
    manual.seed += 2.71;
  };

  return (
    <div
      ref={containerRef}
      data-slot="lightning"
      onPointerDown={handlePointerDown}
      className={`relative overflow-hidden ${className}`}
    >
      {webglFailed ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: fallback ?? 'radial-gradient(ellipse at 50% 0%, rgba(90,100,143,0.32), transparent 65%)' }}
        />
      ) : (
        <canvas ref={canvasRef} data-lightning-canvas aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full block" />
      )}
      {children ? <div className="relative z-10 h-full w-full">{children}</div> : null}
    </div>
  );
};

