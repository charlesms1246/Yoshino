'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import DarkForestBlock from './DarkForestBlock';
import AboutBlock from './AboutBlock'; // Replaces SuiSealBlock
import BeautyShotBlock from './BeautyShotBlock';
import InstitutionalBlock from './InstitutionalBlock';
import ProtectedModeBlock from './ProtectedModeBlock';
import FeatureBlock from './FeatureBlock';
import TaglineBlock from './TaglineBlock';
import SignUpBlock from './SignUpBlock';

export default function BentoGrid() {
  // Intro Phases: 'start' -> 'logo-in' -> 'shrinking' -> 'complete'
  const [introPhase, setIntroPhase] = useState<'start' | 'logo-in' | 'shrinking' | 'complete'>('start');
  const [protectedMode, setProtectedMode] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [hoveredContent2, setHoveredContent2] = useState(false);

  useEffect(() => {
    // Phase 1: Background starts visible.
    // Phase 2: Logo fades in after 0.5s
    const timer1 = setTimeout(() => setIntroPhase('logo-in'), 500);

    // Phase 3: Start Shrinking after 2.5s total (2s of logo visibility)
    const timer2 = setTimeout(() => setIntroPhase('shrinking'), 2500);

    // Phase 4: Complete after shrink animation (approx 1.2s transition)
    const timer3 = setTimeout(() => setIntroPhase('complete'), 3700);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  // Helper to calculate delay based on distance from BeautyShot (approx row 2-4, col 4-6)
  // Let's us center point R3, C5 approx.
  const getDelay = (row: number, col: number) => {
    if (introPhase !== 'shrinking' && introPhase !== 'complete') return 0;
    // BeautyShot Center approx
    const centerR = 3;
    const centerC = 5;
    const dist = Math.sqrt(Math.pow(row - centerR, 2) + Math.pow(col - centerC, 2));
    // Base delay 0.8s (after shrink starts) + distance factor
    return 0.4 + (dist * 0.1);
  }

  // Feature Data
  const features = [
    {
      title: 'Encrypted Intents',
      description: "Your trade intentions remain completely hidden from the public mempool until the moment of execution.",
      icon: (
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <rect x="20" y="25" width="20" height="25" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M20 25V18C20 12.477 24.477 8 30 8C35.523 8 40 12.477 40 18V25" stroke="#E23FB9" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="37" r="3" fill="#E23FB9" />
          <path d="M30 40V44" stroke="#E23FB9" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: 'Aggregated Batch Execution',
      description: "Multiple trades are bundled into a single efficient transaction, reducing gas costs and masking individual patterns.",
      icon: (
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <rect x="12" y="12" width="36" height="8" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          <rect x="12" y="24" width="36" height="8" rx="2" stroke="currentColor" strokeWidth="2" opacity="0.8" />
          <rect x="12" y="36" width="36" height="8" rx="2" stroke="#E23FB9" strokeWidth="2" />
          <path d="M25 52H35" stroke="#E23FB9" strokeWidth="2" strokeLinecap="round" />
          <path d="M30 46V52" stroke="#E23FB9" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: 'Atomic settlement on Deepbook',
      description: "Trades settle instantly on Sui's central limit order book, ensuring finality without intermediary risk.",
      icon: (
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <path d="M15 10H45V50H15V10Z" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20H40" stroke="currentColor" strokeWidth="2" opacity="0.5" />
          <path d="M20 30H40" stroke="currentColor" strokeWidth="2" opacity="0.5" />
          <path d="M20 40H30" stroke="currentColor" strokeWidth="2" opacity="0.5" />
          <path d="M50 25L55 30L45 40" stroke="#E23FB9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="50" cy="35" r="12" stroke="#E23FB9" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-[100dvh] w-[100dvw] p-[2dvh] box-border overflow-hidden bg-[#1E051C]"> {/* Dark background restored */}
      <div className="grid grid-cols-6 grid-rows-[0.9fr_1fr_1.1fr_1.1fr_1fr_0.9fr] gap-[1.5dvh] h-full w-full">

        <AnimatePresence mode='popLayout'>
          {introPhase !== 'complete' && introPhase !== 'shrinking' ? (
            // INTRO BLOCK (Full Grid) - Spans consistent with grid
            <motion.div
              key="intro-block"
              className="col-span-6 row-span-6 relative rounded-[2dvh] overflow-hidden shadow-2xl z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }} // Optional fade out if shrinks
            >
              {/* Shared Background */}
              <motion.div
                layoutId="hero-image-container"
                className="absolute inset-0 w-full h-full"
                transition={{ duration: 1.2, ease: [0.43, 0.13, 0.23, 0.96] }}
              >
                <Image
                  src="/bg.png"
                  alt="Yoshino Sanctuary Intro"
                  fill
                  className="object-cover"
                  priority
                />
                {/* Removed Dark Overlay */}

                {/* Logo Fade In & Shared Element */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    layoutId="hero-logo-text"
                    className="w-[60vw] max-w-[600px] relative z-10"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{
                      opacity: introPhase !== 'start' ? 1 : 0,
                      scale: introPhase !== 'start' ? 1 : 0.95
                    }}
                    transition={{ duration: 1.2, ease: [0.43, 0.13, 0.23, 0.96] }}
                  >
                    <img src="/Yoshino.svg" alt="Yoshino" className="w-full h-auto drop-shadow-2xl" />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            // MAIN GRID CONTENT
            <>
              {/* -- DYNAMIC LEFT QUAD -- */}
              <AnimatePresence mode='wait'>
                {hoveredFeature !== null ? (
                  // MERGED FEATURE DESCRIPTION BLOCK
                  <motion.div
                    key="merged-feature"
                    className={`col-span-3 row-span-4 rounded-[2dvh] backdrop-blur-xl border shadow-xl p-8 flex flex-col items-center justify-center bg-white/10 ${protectedMode ? 'border-[#E23FB9] shadow-[0_0_20px_rgba(226,63,185,0.3)]' : 'border-white/20'}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-[#E23FB9] mb-6 scale-150"
                    >
                      {features[hoveredFeature].icon}
                    </motion.div>
                    <h2 className="text-4xl font-serif text-white mb-6 text-center">{features[hoveredFeature].title}</h2>
                    <p className="text-xl font-light text-white/90 text-center max-w-lg leading-relaxed">{features[hoveredFeature].description}</p>
                  </motion.div>
                ) : hoveredContent2 ? (
                  // ABOUT BLOCK HOVER STATE
                  <>
                    <motion.div key="dark-forest-block" className="col-span-2 row-span-2" initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
                      <DarkForestBlock protectedMode={protectedMode} />
                    </motion.div>
                    <motion.div key="about-block" className="col-span-1 row-span-2" initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
                      <AboutBlock protectedMode={protectedMode} onMouseEnter={() => setHoveredContent2(true)} onMouseLeave={() => setHoveredContent2(false)} />
                    </motion.div>
                    <motion.div
                      key="merged-content2"
                      className={`col-span-3 row-span-2 row-start-3 col-start-1 rounded-[2dvh] backdrop-blur-xl border shadow-xl p-8 flex flex-col items-center justify-center bg-white/10 ${protectedMode ? 'border-[#E23FB9] shadow-[0_0_20px_rgba(226,63,185,0.3)]' : 'border-white/20'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <h3 className="text-2xl font-serif text-white mb-3">About Yoshino</h3>
                      <p className="text-base font-light text-white/80 text-center max-w-md">Yoshino leverages Supra Oracles and Sui's DeepBook to provide a privacy-first trading/intent layer.</p>
                    </motion.div>
                  </>
                ) : (
                  // DEFAULT STATE (Reveal with Stagger)
                  <>
                    {/* Dark Forest (2x2) - R1 C1 */}
                    <motion.div
                      key="dark-forest-block"
                      className="col-span-2 row-span-2"
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: getDelay(1, 1), duration: 0.6 }}
                    >
                      <DarkForestBlock protectedMode={protectedMode} />
                    </motion.div>

                    {/* About Block (1x2) - R1 C3 */}
                    <motion.div
                      key="about-block"
                      className="col-span-1 row-span-2"
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: getDelay(1, 3), duration: 0.6 }}
                    >
                      <AboutBlock protectedMode={protectedMode} onMouseEnter={() => setHoveredContent2(true)} onMouseLeave={() => setHoveredContent2(false)} />
                    </motion.div>

                    {/* Institutional (1x2) - R3 C1 */}
                    <motion.div
                      key="inst-default"
                      className="col-span-1 row-span-2 row-start-3 col-start-1"
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: getDelay(3, 1), duration: 0.6 }}
                    >
                      <InstitutionalBlock protectedMode={protectedMode} />
                    </motion.div>

                    {/* Protected Mode (2x2) - R3 C2 */}
                    <motion.div
                      key="pm-default"
                      className="col-span-2 row-span-2 row-start-3 col-start-2"
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: getDelay(3, 2), duration: 0.6 }}
                    >
                      <ProtectedModeBlock protectedMode={protectedMode} setProtectedMode={setProtectedMode} />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* -- ROW 1 RIGHT -- */}
              <motion.div
                className="col-span-2 row-span-1 col-start-4 row-start-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: getDelay(1, 4), duration: 0.6 }}
              >
                <TaglineBlock protectedMode={protectedMode} />
              </motion.div>

              <motion.div
                className="col-span-1 row-span-1 col-start-6 row-start-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: getDelay(1, 6), duration: 0.6 }}
              >
                <SignUpBlock protectedMode={protectedMode} />
              </motion.div>

              {/* -- ROW 2-4 RIGHT (Beauty Shot) -- */}
              {/* This block is the DESTINATION of the layout transition */}
              <motion.div
                className="col-span-3 row-span-3 col-start-4 row-start-2 relative z-40"
                layout // Essential for layoutId logic? Actually layoutId on child helps
              >
                <BeautyShotBlock protectedMode={protectedMode} />
              </motion.div>

              {/* -- ROW 5 FEATURES -- */}
              <motion.div
                className="col-span-2 row-span-2 row-start-5 col-start-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: getDelay(5, 1), duration: 0.6 }}
              >
                <FeatureBlock
                  title={features[0].title} icon={features[0].icon} delay={0} protectedMode={protectedMode}
                  onMouseEnter={() => setHoveredFeature(0)}
                  onMouseLeave={() => setHoveredFeature(null)}
                />
              </motion.div>

              <motion.div
                className="col-span-2 row-span-2 row-start-5 col-start-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: getDelay(5, 3), duration: 0.6 }}
              >
                <FeatureBlock
                  title={features[1].title} icon={features[1].icon} delay={0} protectedMode={protectedMode}
                  onMouseEnter={() => setHoveredFeature(1)}
                  onMouseLeave={() => setHoveredFeature(null)}
                />
              </motion.div>

              <motion.div
                className="col-span-2 row-span-2 row-start-5 col-start-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: getDelay(5, 5), duration: 0.6 }}
              >
                <FeatureBlock
                  title={features[2].title} icon={features[2].icon} delay={0} protectedMode={protectedMode}
                  onMouseEnter={() => setHoveredFeature(2)}
                  onMouseLeave={() => setHoveredFeature(null)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
