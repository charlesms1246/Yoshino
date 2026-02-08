'use client';

import AnimatedBackground from './components/AnimatedBackground';
import BentoGrid from './components/BentoGrid';

export default function Home() {
  return (
    <div className="h-screen w-screen overflow-hidden relative">
      <AnimatedBackground />
      <BentoGrid />
    </div>
  );
}
