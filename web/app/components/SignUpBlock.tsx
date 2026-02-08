'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface SignUpBlockProps {
    protectedMode: boolean;
}

export default function SignUpBlock({ protectedMode }: SignUpBlockProps) {
    return (
        <Link href="/console" className="h-full w-full flex items-center justify-center">
            <div className={`h-full w-full rounded-[2dvh] bg-[#E8F9FD]/10 backdrop-blur-md border shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform group hover:shadow-[0_0_20px_rgba(232,249,253,0.4)] ${protectedMode
                ? 'border-[#E23FB9] shadow-[0_0_20px_rgba(226,63,185,0.3)]'
                : 'border-[#E8F9FD]/30'
                }`}>
                <motion.span
                    className="text-white font-semibold text-[2dvh] tracking-wide"
                    whileHover={{ scale: 1.1 }}
                >
                    Get Started
                </motion.span>
            </div>
        </Link>
    );
}
