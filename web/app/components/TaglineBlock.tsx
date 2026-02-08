'use client';

import { motion } from 'framer-motion';

interface TaglineBlockProps {
    protectedMode: boolean;
}

export default function TaglineBlock({ protectedMode }: TaglineBlockProps) {
    return (
        <div className={`h-full w-full rounded-[2dvh] backdrop-blur-xl border shadow-lg flex items-center justify-center p-[2dvh] hover:bg-[#F3E8F5] transition-all duration-500 group hover:shadow-[0_0_30px_rgba(226,63,185,0.3)] ${protectedMode
                ? 'border-[#E23FB9] shadow-[0_0_20px_rgba(226,63,185,0.3)]'
                : 'border-white/20'
            } bg-white/10`}>
            <motion.p
                className="text-[1.8dvh] leading-relaxed text-center font-serif italic text-white group-hover:text-[#560C51] transition-colors duration-300"
                initial={{ opacity: 0.8 }}
                whileHover={{ scale: 1.05 }}
            >
                "Intent-Based Shielded Liquidity for Sui"
            </motion.p>
        </div>
    );
}
