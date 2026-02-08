'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ParsedIntent {
    token_in: string;
    token_out: string;
    amount_in: string;
    strategy: 'Instant' | 'Limit' | 'TWAP';
    limit_price: string | null;
    duration_hours: number | null;
    patient_execution: boolean;
    allow_partial_fill: boolean;
    max_gas_fee: string;
    slippage_tolerance: string;
}

interface AIChatInterfaceProps {
    onBack: () => void;
    onApplyIntent: (intent: ParsedIntent) => void;
}

export default function AIChatInterface({ onBack, onApplyIntent }: AIChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Hello! I\'m Yoshino AI. Describe your trading intent in natural language, and I\'ll help you create a shielded order. For example: "Swap 500 USDC for SUI immediately" or "DCA 1000 SUI into USDC over 24 hours"',
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isProcessing) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsProcessing(true);

        try {
            // Call AI agent API
            const response = await fetch('/api/agent/parse-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userInput: input.trim() }),
            });

            const data = await response.json();

            if (data.success && data.intent) {
                const intent = data.intent as ParsedIntent;
                setParsedIntent(intent);

                // Assistant response with parsed intent summary
                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `✓ Intent confirmed:\n\n• Swap ${intent.amount_in} ${intent.token_in} → ${intent.token_out}\n• Strategy: ${intent.strategy}${intent.limit_price ? `\n• Limit Price: ${intent.limit_price}` : ''}${intent.duration_hours ? `\n• Duration: ${intent.duration_hours}h` : ''}\n\nApplying to form...`,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, assistantMessage]);

                // Auto-apply after 1 second to let user see the confirmation
                setTimeout(() => {
                    onApplyIntent(intent);
                    onBack();
                }, 1000);
            } else {
                throw new Error(data.error || 'Failed to parse intent');
            }
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Sorry, I couldn't understand that. Please try rephrasing your intent. Example: "Swap 1000 USDC for SUI at market price"`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#1A365D]/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onBack}
                        className="p-2 hover:bg-[#E8F9FD] rounded-lg transition-colors text-[#1A365D]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-[#E23FB9]" size={20} />
                        <h2 className="text-xl font-serif text-[#1A365D]">Yoshino AI</h2>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto pr-2 -mr-2 mb-4">
                <div className="flex flex-col gap-4">
                    <AnimatePresence>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                                        message.role === 'user'
                                            ? 'bg-[#E23FB9] text-white'
                                            : 'bg-[#E8F9FD] text-[#1A365D]'
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                                    <p className={`text-xs mt-1 ${
                                        message.role === 'user' ? 'text-white/70' : 'text-[#1A365D]/50'
                                    }`}>
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex justify-start"
                        >
                            <div className="bg-[#E8F9FD] px-4 py-3 rounded-2xl flex items-center gap-2">
                                <Loader2 className="animate-spin text-[#E23FB9]" size={16} />
                                <span className="text-sm text-[#1A365D]">Analyzing intent...</span>
                            </div>
                        </motion.div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Example prompts */}
            <div className="flex-shrink-0">
                <p className="text-xs text-[#1A365D]/50 mb-2 font-bold uppercase">Quick Examples:</p>
                <div className="flex flex-wrap gap-2">
                    {[
                        "Swap 500 USDC for SUI",
                        "DCA 1000 SUI over 24h",
                        "Buy SUI at 1.5 USDC",
                    ].map((example) => (
                        <button
                            key={example}
                            onClick={() => setInput(example)}
                            disabled={isProcessing}
                            className="text-xs bg-white/60 hover:bg-white border border-[#1A365D]/10 text-[#1A365D] px-3 py-1.5 rounded-lg transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {example}
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Card */}
            <div className="mt-4 flex-shrink-0 bg-white/50 p-4 rounded-2xl border border-white/60 shadow-sm">
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E23FB9]">
                        <Sparkles size={18} />
                    </div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isProcessing}
                        placeholder="Describe your intent (e.g., 'Swap 500 SUI for USDC')"
                        className="w-full h-12 pl-10 pr-12 bg-white rounded-xl border border-transparent focus:outline-none focus:border-[#E23FB9] focus:ring-2 focus:ring-[#E23FB9]/20 transition-all text-[#1A365D] placeholder-[#1A365D]/40 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isProcessing || !input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#E23FB9] rounded-lg text-white hover:bg-[#C01A8C] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        {isProcessing ? (
                            <Loader2 className="animate-spin" size={16} />
                        ) : (
                            <Send size={16} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
