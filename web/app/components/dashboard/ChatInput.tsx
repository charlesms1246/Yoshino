'use client';

import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

interface ChatInputProps {
    onFocus: () => void;
}

export default function ChatInput({ onFocus }: ChatInputProps) {
    const [value, setValue] = useState('');

    const handleClick = () => {
        onFocus();
    };

    return (
        <div className="w-full relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E23FB9]">
                <Sparkles size={20} />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onClick={handleClick}
                onFocus={handleClick}
                placeholder="Describe your intent (e.g., 'Swap 500 SUI for USDC if price > 1.5')"
                className="w-full h-12 pl-12 pr-12 bg-[#E8F9FD]/50 rounded-xl border border-[#E8F9FD] focus:outline-none focus:border-[#E23FB9] focus:ring-2 focus:ring-[#E23FB9]/20 transition-all text-[#1A365D] placeholder-[#1A365D]/40 font-medium cursor-pointer"
            />
            <button 
                onClick={handleClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#E23FB9] rounded-lg text-white hover:bg-[#C01A8C] transition-colors shadow-md"
            >
                <Send size={16} />
            </button>
        </div>
    );
}
