'use client';

import { motion } from 'framer-motion';

export default function AnimatedBackground() {
    return (
        <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden bg-[#020617]">
            {/* Blob 1: Dark Blue */}
            <motion.div
                className="absolute top-[-10%] left-[-10%] w-[50dvw] h-[50dvw] bg-[#1e1b4b] rounded-full mix-blend-screen filter blur-[80px] opacity-40"
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Blob 2: Dark Pink */}
            <motion.div
                className="absolute top-[20%] right-[-10%] w-[40dvw] h-[40dvw] bg-[#831843] rounded-full mix-blend-screen filter blur-[80px] opacity-40"
                animate={{
                    x: [0, -100, 0],
                    y: [0, 100, 0],
                    scale: [1, 1.1, 1],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                }}
            />

            {/* Blob 3: Purple */}
            <motion.div
                className="absolute bottom-[-10%] left-[20%] w-[45dvw] h-[45dvw] bg-[#4c1d95] rounded-full mix-blend-screen filter blur-[80px] opacity-40"
                animate={{
                    x: [0, 50, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.3, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 4,
                }}
            />

            {/* Blob 4: Rose/Red Accent */}
            <motion.div
                className="absolute bottom-[20%] right-[10%] w-[35dvw] h-[35dvw] bg-[#be123c] rounded-full mix-blend-screen filter blur-[80px] opacity-30"
                animate={{
                    x: [0, -50, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 6,
                }}
            />

            {/* Overlay for Texture (Optional noise) */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
        </div>
    );
}
