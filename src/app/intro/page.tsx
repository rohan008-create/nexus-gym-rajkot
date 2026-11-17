'use client';
import dynamic from 'next/dynamic';
const Intro = dynamic(() => import('../../components/intro/PunchingBagIntro'), { ssr: false });
export default function IntroPreview() { return <Intro />; }
