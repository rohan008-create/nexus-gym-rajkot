'use client';

import { Component, useEffect, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import ProductModel from './ProductModel';
import type { Product } from './products';

class PreviewBoundary extends Component<{ children: ReactNode; onFailure: () => void }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function PreviewStatus({ onReady, onFailure }: { onReady: () => void; onFailure: () => void }) {
  const canvas = useThree(state => state.gl.domElement);
  const callbacks = useRef({ onReady, onFailure });
  callbacks.current = { onReady, onFailure };
  const drawn = useRef(false);
  const frame = useRef(0);

  useFrame(() => {
    if (drawn.current) return;
    drawn.current = true;
    frame.current = requestAnimationFrame(() => callbacks.current.onReady());
  });

  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      callbacks.current.onFailure();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => {
      cancelAnimationFrame(frame.current);
      canvas.removeEventListener('webglcontextlost', lost);
    };
  }, [canvas]);

  return null;
}

export default function ProductScene({ product, angle, onReady, onFailure }: {
  product: Product;
  angle: number;
  onReady: () => void;
  onFailure: () => void;
}) {
  return <PreviewBoundary onFailure={onFailure}>
    <Canvas className="ps-model-canvas" aria-hidden="true" frameloop="demand" dpr={[1, 1.5]}
      camera={{ position: [0, .54, 4.8], fov: 32 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}>
      <ambientLight intensity={.55} />
      <hemisphereLight args={['#fffbf4', '#9aabc8', 1.1]} />
      <directionalLight position={[3, 4, 5]} intensity={2.3} color="#fff6ea" />
      <directionalLight position={[-3, 1, -2]} intensity={1.9} color="#c7dcff" />
      <ProductModel key={product.id} product={product} angle={angle} />
      <PreviewStatus onReady={onReady} onFailure={onFailure} />
    </Canvas>
  </PreviewBoundary>;
}
