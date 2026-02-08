'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

interface InstitutionalBlockProps {
  protectedMode: boolean;
}

export default function InstitutionalBlock({ protectedMode }: InstitutionalBlockProps) {
  const [successRate, setSuccessRate] = useState(99.9);

  useEffect(() => {
    const interval = setInterval(() => {
      setSuccessRate((prev) => {
        const newRate = 99.7 + Math.random() * 0.3;
        return Math.round(newRate * 10) / 10;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`h-full rounded-[2dvh] backdrop-blur-xl border shadow-xl p-8 flex flex-col justify-center group hover:bg-[#F3E8F5] transition-all duration-500 cursor-pointer ${protectedMode
        ? 'border-[#E23FB9] shadow-[0_0_20px_rgba(226,63,185,0.3)]'
        : 'border-white/20'
      } bg-white/10`}>
      <h3 className="text-[2dvh] font-serif mb-3 text-white group-hover:text-[#560C51] transition-colors duration-300">
        Institutional Execution
      </h3>
      <p className="text-[1.4dvh] font-light mb-6 text-white/80 group-hover:text-[#560C51]/80 transition-colors duration-300 leading-snug">
        Your trades settle atomically via <span className="font-bold">DeepBook V3</span>, ensuring the public market never sees your position.
      </p>

      <div className="bg-white/10 group-hover:bg-white/60 rounded-2xl p-4 border border-white/20 group-hover:border-white/80 transition-all duration-300">
        <p className="text-xs uppercase tracking-wider mb-2 text-white/70 group-hover:text-[#560C51]/70 transition-colors duration-300">
          Success Rate
        </p>
        <motion.div
          key={successRate}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-mono text-[#E23FB9]"
        >
          {successRate}%
        </motion.div>
      </div>
    </div>
  );
}
