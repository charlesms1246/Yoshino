'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FeatureBlockProps {
    title: string;
    icon: ReactNode;
    delay: number;
    protectedMode: boolean;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

export default function FeatureBlock({ title, icon, delay, protectedMode, onClick, onMouseEnter, onMouseLeave }: FeatureBlockProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
            className="h-full w-full"
        >
            <motion.button
                whileHover={{
                    scale: 1.02,
                }}
                className={`h-full w-full rounded-[2dvh] backdrop-blur-xl border shadow-xl p-6 relative flex flex-col items-center justify-center transition-all duration-500 cursor-pointer group hover:shadow-[0_0_30px_rgba(226,63,185,0.3)] ${protectedMode
                    ? 'border-[#E23FB9] shadow-[0_0_20px_rgba(226,63,185,0.3)]'
                    : 'border-white/20'
                    } ${
                    /* subtle Daybreak Blue gradient behind */
                    'bg-gradient-to-br from-white/10 to-[#E8F9FD]/10 hover:bg-[#F3E8F5]'
                    }`}

                onClick={onClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <motion.div
                    whileHover={{ rotate: 5, scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                    className="text-white group-hover:text-[#E23FB9] transition-colors duration-300"
                >
                    {icon}
                </motion.div>
                <h4 className="absolute bottom-6 text-[1.8dvh] font-serif font-bold text-white group-hover:text-[#560C51] transition-colors duration-300 w-full text-center px-4">
                    {title}
                </h4>
            </motion.button>
        </motion.div>
    );
}
