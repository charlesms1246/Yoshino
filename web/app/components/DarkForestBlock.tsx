'use client';

import { motion } from 'framer-motion';

interface DarkForestBlockProps {
  protectedMode: boolean;
}

export default function DarkForestBlock({ protectedMode }: DarkForestBlockProps) {
  return (
    <div className={`h-full rounded-[2dvh] backdrop-blur-xl border shadow-xl p-8 relative overflow-hidden group hover:bg-[#F3E8F5] transition-all duration-500 cursor-pointer ${protectedMode
        ? 'border-[#E23FB9] shadow-[0_0_20px_rgba(226,63,185,0.3)]'
        : 'border-white/20'
      } bg-white/10`}>

      <div className="relative z-10 h-full flex flex-col justify-center">
        <h3 className="text-[2.2dvh] font-serif mb-4 text-white group-hover:text-[#560C51] transition-colors duration-300">
          The Dark Forest
        </h3>
        <p className="text-[1.6dvh] font-light leading-relaxed text-white/80 group-hover:text-[#560C51]/80 transition-colors duration-300">
          Public ledgers expose every order before it executes, leaving you vulnerable to predatory sandwich attacks.
        </p>
      </div>

      {/* Radar Animation Background */}
      <div className="absolute inset-0 z-0 opacity-30 group-hover:opacity-10 transition-opacity duration-300">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40dvh] h-[40dvh] border border-white/10 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25dvh] h-[25dvh] border border-white/10 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[10dvh] h-[10dvh] border border-white/10 rounded-full"></div>

        {/* Sweeping Radar Line */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-[20dvh] h-[20dvh] origin-top-left bg-gradient-to-r from-transparent via-transparent to-white/20"
          style={{ borderRadius: '100% 0 0 0' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}
