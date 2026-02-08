'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface SuiSealBlockProps {
  protectedMode: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function SuiSealBlock({ protectedMode, onMouseEnter, onMouseLeave }: SuiSealBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`h-full rounded-[2dvh] backdrop-blur-xl border shadow-xl p-8 flex flex-col items-center justify-center group hover:bg-[#F3E8F5] transition-all duration-500 cursor-pointer ${protectedMode
        ? 'border-[#E23FB9] shadow-[0_0_20px_rgba(226,63,185,0.3)]'
        : 'border-white/20'
        } bg-white/10`}
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseEnter?.();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onMouseLeave?.();
      }}
    >
      <motion.div
        className="relative w-24 h-24"
        animate={isHovered ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-lg">
          {/* Outer Ring */}
          <circle
            cx="60"
            cy="60"
            r="55"
            fill="none"
            stroke="white"
            strokeWidth="2"
            opacity="0.6"
            className="group-hover:stroke-[#560C51] transition-colors duration-300"
          />
          {/* Main Seal Body */}
          <motion.circle
            cx="60"
            cy="60"
            r="50"
            className="fill-[#E23FB9] group-hover:fill-[#560C51] transition-colors duration-300"
            opacity="0.9"
            animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          />
          {/* Inner Character/Symbol (Stylized 'Sui') */}
          <path
            d="M 40 40 Q 60 20 80 40 Q 60 60 40 80 Q 60 100 80 80"
            fill="none"
            stroke="white"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.9"
          />

          {/* Text on Curve */}
          <path
            id="curve"
            d="M 25 60 A 35 35 0 0 1 95 60"
            fill="none"
          />
          <text fontSize="10" fill="white" letterSpacing="2">
            <textPath href="#curve" startOffset="50%" textAnchor="middle">
              VERIFIABLE
            </textPath>
          </text>
        </svg>
      </motion.div>
      <p className="text-[1.4dvh] font-light text-center mt-4 text-white/90 group-hover:text-[#560C51] transition-colors duration-300 leading-tight">
        Verifiable on-chain privacy. We use <span className="font-semibold">Sui Seal</span> to encrypt your trade intents.
      </p>
    </div>
  );
}
