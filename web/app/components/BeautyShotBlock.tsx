'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface BeautyShotBlockProps {
  protectedMode: boolean;
}

export default function BeautyShotBlock({ protectedMode }: BeautyShotBlockProps) {
  return (
    <div
      className="h-full w-full rounded-[2dvh] overflow-hidden shadow-2xl relative transition-all duration-500"
      style={{
        borderColor: protectedMode ? '#E23FB9' : 'rgba(255, 255, 255, 0.6)',
        borderWidth: '1px',
        boxShadow: protectedMode
          ? '0 0 40px rgba(226, 63, 185, 0.3)'
          : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}
    >
      <div className="relative w-full h-full">
        <motion.div
          layoutId="hero-image-container"
          className="w-full h-full relative"
        >
          <Image
            src="/bg.png"
            alt="Yoshino Sanctuary"
            fill
            className="object-cover"
            priority
          />
          {/* Removed Dark Overlay */}

          {/* Shared Logo Element - Significantly Reduced Size */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <motion.div
              layoutId="hero-logo-text"
              className="w-1/2 relative"
              transition={{ duration: 1.2, ease: [0.43, 0.13, 0.23, 0.96] }}
            >
              <img src="/Yoshino.svg" alt="Yoshino" className="w-full h-auto drop-shadow-2xl" />
            </motion.div>
          </div>
        </motion.div>

        {/* Optional overlay for protected mode tint */}
        <motion.div
          className="absolute inset-0 bg-[#E23FB9] mix-blend-overlay pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: protectedMode ? 0.2 : 0 }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
