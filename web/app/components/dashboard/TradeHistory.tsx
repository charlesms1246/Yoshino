'use client';

import React, { useState, useEffect, memo } from 'react';
import { ExternalLink } from 'lucide-react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { usePool } from '@/contexts/PoolContext';
import { fetchTrades } from '@/lib/deepbook';

interface TradeHistoryItem {
    digest: string;
    type: string;
    amount: string;
    price: string;
    timestamp: string;
}

export default function TradeHistory() {
    const { selectedPool } = usePool();
    const [history, setHistory] = useState<TradeHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchHistory = async (isInitialLoad = false) => {
            try {
                if (isInitialLoad) {
                    setLoading(true);
                }
                
                // Fetch last 10 trades from the selected pool
                const trades = await fetchTrades(selectedPool, { limit: 10 });
                
                if (trades && trades.length > 0) {
                    const formattedTrades: TradeHistoryItem[] = trades.map((trade: any) => ({
                        digest: trade.digest || trade.event_digest || 'N/A',
                        type: trade.type === 'buy' || trade.taker_is_bid ? 'Buy' : 'Sell',
                        amount: (trade.base_volume || 0).toFixed(2),
                        price: (trade.price || 0).toFixed(4),
                        timestamp: new Date(trade.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    }));
                    
                    // Only update if data has changed
                    setHistory(prevHistory => {
                        if (JSON.stringify(prevHistory) === JSON.stringify(formattedTrades)) {
                            return prevHistory; // Prevent re-render if data is the same
                        }
                        return formattedTrades;
                    });
                } else {
                    setHistory([]);
                }
                
                if (isInitialLoad) {
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to fetch trade history:', error);
                setHistory([]);
                if (isInitialLoad) {
                    setLoading(false);
                }
            }
        };

        fetchHistory(true); // Initial load with loading indicator
        const interval = setInterval(() => fetchHistory(false), 3000); // Silent updates
        return () => clearInterval(interval);
    }, [selectedPool]);

    return (
        <div className="h-full flex flex-col">
            <h3 className="font-semibold text-[#1A365D] mb-4">Trade History</h3>
            <div className="flex-1 overflow-y-auto pr-1">
                {loading ? (
                    <div className="text-xs text-[#1A365D]/50 py-4">Loading trades...</div>
                ) : history.length === 0 ? (
                    <div className="text-xs text-[#1A365D]/50 py-4">No recent trades for this pool.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] text-[#1A365D]/40 uppercase tracking-wider border-b border-[#1A365D]/10">
                                <th className="pb-2 font-medium">Type</th>
                                <th className="pb-2 font-medium">Amount</th>
                                <th className="pb-2 font-medium">Price</th>
                                <th className="pb-2 font-medium text-right">Time</th>
                                <th className="pb-2 font-medium text-right">Link</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {history.map((row, idx) => (
                                <tr key={`${row.digest}-${idx}`} className="group hover:bg-white/40 transition-colors">
                                    <td className="py-3 font-medium text-[#1A365D]">
                                        <span className={row.type === 'Buy' ? 'text-green-600 mr-1' : 'text-red-500 mr-1'}>●</span>
                                        {row.type}
                                    </td>
                                    <td className="py-3 text-[#1A365D]/70">{row.amount}</td>
                                    <td className="py-3 text-[#1A365D]/70">${row.price}</td>
                                    <td className="py-3 text-[#1A365D]/70 text-right">{row.timestamp}</td>
                                    <td className="py-3 text-right">
                                        <a 
                                            href={`https://suiscan.xyz/testnet/tx/${row.digest}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#E23FB9] opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <ExternalLink size={12} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
