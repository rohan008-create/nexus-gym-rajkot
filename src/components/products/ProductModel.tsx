'use client';

import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { applyPackagingArtwork } from './packagingArtwork';
import { RoundedBox } from '@react-three/drei';
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Product } from './products';

const finishes: Record<string, { body: string; cap: string; label: string; ink: string; accent: string; subtitle: string }> = {
  whey: { body: '#262528', cap: '#181819', label: '#eae1d0', ink: '#221c19', accent: '#9a2029', subtitle: 'CHOCOLATE' },
  isolate: { body: '#ede9df', cap: '#faf7ef', label: '#f4eee1', ink: '#262522', accent: '#626a46', subtitle: 'VANILLA' },
  creatine: { body: '#302e30', cap: '#171717', label: '#ded8cc', ink: '#22201d', accent: '#a74d22', subtitle: 'UNFLAVOURED' },
  preworkout: { body: '#58232b', cap: '#1b1b1c', label: '#66262f', ink: '#fff3e3', accent: '#982133', subtitle: 'BERRY' },
  peanut: { body: '#9e581e', cap: '#201d1b', label: '#ecd6b1', ink: '#322316', accent: '#7a401d', subtitle: 'CRUNCHY' },
  gainer: { body: '#292a2c', cap: '#292a2c', label: '#262426', ink: '#fff0da', accent: '#a66822', subtitle: 'CHOCOLATE' },
  electrolytes: { body: '#d5dfe4', cap: '#d5dfe4', label: '#e6edf1', ink: '#162732', accent: '#3d7091', subtitle: 'CITRUS' },
  bar: { body: '#322123', cap: '#322123', label: '#352529', ink: '#fff4e4', accent: '#a22f39', subtitle: 'COCOA' },
  shaker: { body: '#515355', cap: '#212124', label: '#4d4e51', ink: '#ffffff', accent: '#a21e31', subtitle: '' },
  straps: { body: '#26272a', cap: '#26272a', label: '#74232c', ink: '#fff5e5', accent: '#74232c', subtitle: '' },
  bands: { body: '#64303b', cap: '#232424', label: '#692a35', ink: '#fff4e4', accent: '#692a35', subtitle: '' },
  bag: { body: '#303136', cap: '#222226', label: '#27282b', ink: '#ffffff', accent: '#9f2433', subtitle: '' },
};

function useLabel(product: Product, finish: (typeof finishes)[string]) {
  const [label, setLabel] = useState<CanvasTexture | null>(null);
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = finish.label;
    ctx.fillRect(0, 0, 768, 512);
    ctx.fillStyle = finish.accent;
    ctx.fillRect(0, 488, 768, 24);
    ctx.textAlign = 'center';
    ctx.fillStyle = finish.ink;
    ctx.font = '800 49px Arial';
    ctx.fillText('N E X U S', 384, 118, 620);
    ctx.fillRect(122, 145, 524, 3);
    const words = product.name.replace(/^Nexus /, '').toUpperCase().split(' ');
    const first = words.shift()!;
    ctx.font = '900 83px Arial';
    ctx.fillText(first, 384, words.length ? 258 : 305, 650);
    if (words.length) ctx.fillText(words.join(' '), 384, 349, 650);
    ctx.font = '700 29px Arial';
    ctx.fillText(finish.subtitle, 384, 432, 620);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    setLabel(texture);
    const cancelArtwork = applyPackagingArtwork(product.id, canvas, () => {
      texture.needsUpdate = true;
      invalidate();
    });
    return () => { cancelArtwork(); texture.dispose(); };
  }, [product.id, product.name, finish, invalidate]);
  return label;
}

function Tube({ radius, height, y, color, top = radius }: { radius: number; height: number; y: number; color: string; top?: number }) {
  return <mesh position-y={y}>
    <cylinderGeometry args={[top, radius, height, 48]} />
    <meshStandardMaterial color={color} roughness={.46} metalness={.08} />
  </mesh>;
}

export default function ProductModel({ product, angle }: { product: Product; angle: number }) {
  const finish = finishes[product.id] ?? finishes.whey;
  const label = useLabel(product, finish);
  const large = product.id === 'whey' || product.id === 'isolate';
  const shaker = product.id === 'shaker';
  const pouch = product.id === 'gainer' || product.id === 'electrolytes';
  const bar = product.id === 'bar';
  const bands = product.id === 'bands';
  const straps = product.id === 'straps';
  const bag = product.id === 'bag';
  const radius = large ? .61 : shaker ? .42 : .56;
  const height = large ? 1.35 : shaker ? 1.53 : .89;

  return <group rotation-y={angle}>
    {pouch || bar ? <>
      <RoundedBox args={bar ? [1.77, .55, .26] : [1.24, 1.55, .36]} radius={.12} smoothness={4}>
        <meshStandardMaterial color={finish.body} roughness={.37} metalness={.16} />
      </RoundedBox>
      {label && <mesh position-z={bar ? .131 : .181}>
        <planeGeometry args={bar ? [1.45, .44] : [1.03, 1.29]} />
        <meshStandardMaterial map={label} roughness={.55} />
      </mesh>}
      {(bar ? [-.86, .86] : [-.73, .73]).map(edge =>
        <RoundedBox key={edge} position={bar ? [edge, 0, 0] : [0, edge, 0]}
          args={bar ? [.14, .53, .07] : [1.16, .12, .15]} radius={.026} smoothness={3}>
          <meshStandardMaterial color={finish.cap} roughness={.55} />
        </RoundedBox>
      )}
    </> : bag ? <>
      <RoundedBox args={[1.78, .88, .75]} position-y={-.12} radius={.21} smoothness={5}>
        <meshStandardMaterial color={finish.body} roughness={.85} />
      </RoundedBox>
      <RoundedBox args={[1.15, .45, .18]} position={[0, -.15, .34]} radius={.08} smoothness={4}>
        <meshStandardMaterial color={finish.cap} roughness={.85} />
      </RoundedBox>
      {[-.22, .22].map(z => <mesh key={z} position={[0, .25, z]} scale={[1, .86, 1]}>
        <torusGeometry args={[.42, .045, 10, 36, Math.PI]} />
        <meshStandardMaterial color={finish.cap} roughness={.84} />
      </mesh>)}
      {label && <mesh position={[0, -.17, .435]}>
        <planeGeometry args={[.41, .2]} /><meshStandardMaterial map={label} roughness={.84} />
      </mesh>}
    </> : straps || bands ? (
      (bands ? ['#27282b', '#666466', '#74343f'] : ['#27282b', '#2c2c30']).map((color, index) => {
        const x = bands ? 0 : (index - .5) * .8;
        const y = bands ? (index - 1) * .25 : index * .15;
        return <group key={color} position={[x, y, 0]}>
          <mesh rotation-x={Math.PI / 2} scale={[bands ? 1.4 : .82, .75, bands ? 1.6 : .9]}>
            <torusGeometry args={[.47, .079, 12, 40]} />
            <meshStandardMaterial color={color} roughness={.9} />
          </mesh>
          {straps && <RoundedBox args={[.19, .08, .71]} position={[(index - .5) * -.3, -.33, .25]} rotation-y={(index - .5) * .65}
            radius={.025} smoothness={3}><meshStandardMaterial color={color} roughness={.92} /></RoundedBox>}
          {label && <mesh position={[0, 0, .421]}>
            <planeGeometry args={[.24, .16]} /><meshStandardMaterial map={label} roughness={.86} />
          </mesh>}
        </group>;
      })
    ) : <>
      <Tube radius={radius * (shaker ? .83 : .98)} top={radius} height={height} y={-.05} color={finish.body} />
      <Tube radius={radius} top={radius * (large ? .85 : .96)} height={.13} y={height / 2 + .01} color={finish.body} />
      <Tube radius={radius * (large ? .86 : .98)} height={.19} y={height / 2 + .15} color={finish.cap} />
      <Tube radius={radius * .97} height={.08} y={-height / 2 - .07} color={finish.body} />
      {shaker && <RoundedBox args={[.32, .13, .31]} position={[0, 1.04, .13]} radius={.05} smoothness={4}>
        <meshStandardMaterial color={finish.cap} roughness={.42} />
      </RoundedBox>}
      {label && <mesh position-y={-.05}>
        <cylinderGeometry args={[radius + .004, radius * (shaker ? .88 : .99) + .004, height * .79, 36, 1, true, -.95, 1.9]} />
        <meshStandardMaterial map={label} roughness={.68} />
      </mesh>}
    </>}
  </group>;
}
