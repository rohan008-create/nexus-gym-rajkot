'use client';

import dynamic from 'next/dynamic';
const AvatarPreview = dynamic(() => import('./AvatarPreview'), {
  ssr: false,
  loading: () => <div style={{ padding: 32, color: 'white', background: '#111318', minHeight: '100vh' }}>Loading avatar preview…</div>,
});

export default function Page() { return <AvatarPreview />; }
