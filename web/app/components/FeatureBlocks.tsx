'use client';

import { motion } from 'framer-motion';

export default function FeatureBlocks() {
  const features = [
    {
      title: 'Dashboard',
      icon: (
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <rect x="5" y="5" width="20" height="20" rx="2" stroke="#560C51" strokeWidth="2" />
          <rect x="30" y="5" width="25" height="20" rx="2" stroke="#560C51" strokeWidth="2" />
          <rect x="5" y="30" width="25" height="25" rx="2" stroke="#560C51" strokeWidth="2" />
          <rect x="35" y="30" width="20" height="25" rx="2" stroke="#560C51" strokeWidth="2" />
          <path d="M 10 20 L 20 10" stroke="#E23FB9" strokeWidth="2" />
          <circle cx="45" cy="15" r="3" fill="#E23FB9" />
        </svg>
      ),
      link: '/dashboard',
    },
    {
      title: 'Roadmap & Docs',
      icon: (
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <path
            d="M 15 10 L 45 10 C 48 10 50 12 50 15 L 50 50 C 50 53 48 55 45 55 L 15 55 C 12 55 10 53 10 50 L 10 15 C 10 12 12 10 15 10 Z"
            stroke="#560C51"
            strokeWidth="2"
            fill="rgba(86, 12, 81, 0.05)"
          />
          <line x1="18" y1="20" x2="42" y2="20" stroke="#560C51" strokeWidth="2" />
          <line x1="18" y1="28" x2="42" y2="28" stroke="#560C51" strokeWidth="2" />
          <line x1="18" y1="36" x2="35" y2="36" stroke="#E23FB9" strokeWidth="2" />
          <circle cx="40" cy="43" r="8" fill="#E23FB9" opacity="0.2" />
          <path d="M 37 43 L 39 45 L 43 41" stroke="#E23FB9" strokeWidth="2" fill="none" />
        </svg>
      ),
      link: '/docs',
    },
    {
      title: 'The Solver Network',
      icon: (
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
          <circle cx="30" cy="15" r="5" stroke="#560C51" strokeWidth="2" fill="#E23FB9" opacity="0.3" />
          <circle cx="15" cy="35" r="5" stroke="#560C51" strokeWidth="2" fill="#E23FB9" opacity="0.3" />
          <circle cx="45" cy="35" r="5" stroke="#560C51" strokeWidth="2" fill="#E23FB9" opacity="0.3" />
          <circle cx="30" cy="50" r="5" stroke="#560C51" strokeWidth="2" fill="#E23FB9" opacity="0.3" />
          <line x1="30" y1="20" x2="18" y2="32" stroke="#560C51" strokeWidth="2" />
          <line x1="30" y1="20" x2="42" y2="32" stroke="#560C51" strokeWidth="2" />
          <line x1="18" y1="38" x2="27" y2="47" stroke="#560C51" strokeWidth="2" />
          <line x1="42" y1="38" x2="33" y2="47" stroke="#560C51" strokeWidth="2" />
          <circle cx="30" cy="30" r="3" fill="#E23FB9" />
        </svg>
      ),
      link: '/network',
    },
  ];

  return (
    <div className="h-full grid grid-cols-3 gap-4">
      {features.map((feature, index) => (
        <motion.button
          key={feature.title}
          whileHover={{
            scale: 1.02,
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
          }}
          className="rounded-[2rem] bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl p-6 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-[0_0_20px_rgba(226,63,185,0.1)] cursor-pointer"
          onClick={() => {
            console.log(`Navigate to ${feature.link}`);
          }}
        >
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ duration: 0.3 }}
            className="mb-4"
          >
            {feature.icon}
          </motion.div>
          <h4 className="text-xl font-serif text-center" style={{ color: '#560C51' }}>
            {feature.title}
          </h4>
        </motion.button>
      ))}
    </div>
  );
}
