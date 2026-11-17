'use client';
import dynamic from 'next/dynamic';
const Hero = dynamic(() => import('../../components/hero/HeroSection'), { ssr: false });
export default function HeroPreview() { return <Hero onReplayIntro={() => { location.href = '/'; }} />; }
