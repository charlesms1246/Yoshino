'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import IntentsForm, { type ParsedIntent } from '../components/dashboard/IntentsForm';
import ChatInput from '../components/dashboard/ChatInput';
import AIChatInterface from '../components/dashboard/AIChatInterface';
import MarketStats from '../components/dashboard/MarketStats';
import PlacedOrders from '../components/dashboard/PlacedOrders';
import BalanceHeader from '../components/dashboard/BalanceHeader';
import PoolSelector from '../components/dashboard/PoolSelector';
import TradeHistory from '../components/dashboard/TradeHistory';
import { PoolProvider } from '@/contexts/PoolContext';

export default function ConsolePage() {
    const [chatMode, setChatMode] = useState(false);
    const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);

    return (
        <PoolProvider>
        <div className="h-screen w-full bg-[#E8F9FD] p-4 font-sans text-[#1A365D] overflow-hidden">
            <div className="grid h-full w-full grid-cols-6 grid-rows-6 gap-4">

                {/* LEFT PANE: Intents & Chat */}
                {/* Intents/Chat: Col 1-2, Row 1-5 (or 1-6 when in chat mode) */}
                <section className={`col-span-2 col-start-1 row-start-1 relative overflow-hidden ${chatMode ? 'row-span-6' : 'row-span-5'}`}>
                    <AnimatePresence mode="wait">
                        {!chatMode ? (
                            <motion.div
                                key="form-view"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="h-full w-full bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-white/50"
                            >
                                <IntentsForm aiParsedIntent={parsedIntent} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="chat-view"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className="h-full w-full bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-sm border border-white/50"
                            >
                                <AIChatInterface 
                                    onBack={() => setChatMode(false)}
                                    onApplyIntent={(intent) => {
                                        setParsedIntent(intent);
                                        setChatMode(false);
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* Chat Input: Col 1-2, Row 6 - Only show when NOT in chat mode */}
                {!chatMode && (
                    <section className="col-span-2 row-span-1 col-start-1 row-start-6 bg-white/80 backdrop-blur-xl rounded-3xl p-4 shadow-md border border-white/60 flex items-center">
                        <ChatInput 
                            onFocus={() => setChatMode(true)} 
                        />
                    </section>
                )}

                {/* MIDDLE PANE: Stats & Orders */}
                {/* Market Stats: Col 3-4, Row 1-2 */}
                <section className="col-span-2 row-span-2 col-start-3 row-start-1 bg-white/40 backdrop-blur-xl rounded-3xl p-6 border border-white/30">
                    <MarketStats />
                </section>

                {/* Placed Orders: Col 3-4, Row 3-6 */}
                <section className="col-span-2 row-span-4 col-start-3 row-start-3 bg-white/40 backdrop-blur-xl rounded-3xl p-6 border border-white/30 relative overflow-hidden">
                    <PlacedOrders />
                </section>

                {/* RIGHT PANE: Balance, Pool, History */}
                {/* Balance: Col 5-6, Row 1 */}
                <header className="col-span-2 row-span-1 col-start-5 row-start-1 bg-white/60 backdrop-blur-xl rounded-3xl p-4 flex items-center justify-between border border-white/50 shadow-sm">
                    <BalanceHeader />
                </header>

                {/* Pool Selector: Col 5-6, Row 2-3 */}
                <section className="col-span-2 row-span-2 col-start-5 row-start-2 bg-white/40 backdrop-blur-xl rounded-3xl p-6 border border-white/30">
                    <PoolSelector />
                </section>

                {/* Trade History: Col 5-6, Row 4-6 */}
                <footer className="col-span-2 row-span-3 col-start-5 row-start-4 bg-white/40 backdrop-blur-xl rounded-3xl p-6 border border-white/30 relative overflow-hidden">
                    <TradeHistory />
                </footer>

            </div>
        </div>
        </PoolProvider>
    );
}
