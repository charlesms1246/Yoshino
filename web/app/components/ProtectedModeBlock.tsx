'use client';

import { motion } from 'framer-motion';

interface ProtectedModeBlockProps {
  protectedMode: boolean;
  setProtectedMode: (mode: boolean) => void;
}

export default function ProtectedModeBlock({
  protectedMode,
  setProtectedMode,
}: ProtectedModeBlockProps) {
  return (
    <div className={`h-full rounded-[2dvh] backdrop-blur-xl border shadow-xl p-8 flex flex-col items-center justify-center group transition-all duration-500 hover:shadow-[0_0_30px_rgba(226,63,185,0.3)] ${protectedMode
      ? 'border-[#E23FB9] shadow-[0_0_20px_rgba(226,63,185,0.3)]'
      : 'border-white/20'
      } ${
      /* subtle Daybreak Blue gradient behind */
      'bg-gradient-to-br from-white/10 to-[#E8F9FD]/10 hover:bg-[#F3E8F5]'
      }`}>
      <h3 className="text-3xl font-serif mb-6 text-center text-white group-hover:text-[#560C51] transition-colors duration-300">
        Protected Mode
      </h3>

      {/* Toggle Switch */}
      <motion.button
        onClick={() => setProtectedMode(!protectedMode)}
        className="relative w-32 h-16 rounded-full border-2 cursor-pointer transition-all duration-300"
        style={{
          backgroundColor: protectedMode ? '#E23FB9' : 'rgba(255, 255, 255, 0.1)',
          borderColor: protectedMode ? '#E23FB9' : 'rgba(255, 255, 255, 0.5)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute top-1 w-12 h-12 rounded-full shadow-lg"
          style={{
            backgroundColor: '#FFFFFF',
          }}
          animate={{
            left: protectedMode ? 'calc(100% - 52px)' : '4px',
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        />
      </motion.button>

      <motion.p
        className="mt-6 text-lg font-light text-center transition-colors duration-300"
        style={{ color: protectedMode ? '#E23FB9' : 'currentColor' }}
        // Note: currentColor will inherit from the parent text color (white -> dark purple)
        animate={{
          scale: protectedMode ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 0.5,
        }}
      >
        {protectedMode ? '🛡️ Active' : 'Inactive'}
      </motion.p>

      {/* Description */}
      <p className="mt-4 text-[1.4dvh] font-light text-center max-w-xs text-white/80 group-hover:text-[#560C51]/80 transition-colors duration-300 leading-snug">
        Activate institutional-grade execution. Express your intent, and let the system handle the complexity.
      </p>

      {/* Status Indicator */}
      {protectedMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 flex items-center gap-2"
        >
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: '#E23FB9' }}
            animate={{
              opacity: [1, 0.5, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
          <span className="text-xs font-light" style={{ color: '#E23FB9' }}>
            All transactions encrypted
          </span>
        </motion.div>
      )}
    </div>
  );
}
