'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { fetchTicker, fetchTrades, fetchOrderBook, formatPoolName, formatPriceChange } from '@/lib/deepbook';
import { usePool } from '@/contexts/PoolContext';

interface PoolData {
    id: string;
    displayName: string;
    price: string;
    change: string;
    isPositive: boolean;
    data: { v: number }[];
    bestBid: string;
    bestAsk: string;
    spread: string;
    spreadPercent: string;
}

export default function PoolSelector() {
    const { selectedPool, setSelectedPool } = usePool();
    const [pools, setPools] = useState<PoolData[]>([]);
    const [orderBookDepth, setOrderBookDepth] = useState<number>(5);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPoolsData = async (isInitialLoad = false) => {
            try {
                if (isInitialLoad) {
                    setIsLoading(true);
                }
                setError(null);
                const ticker = await fetchTicker();
                
                if (!ticker || Object.keys(ticker).length === 0) {
                    throw new Error('No ticker data available');
                }
                
                // Use actual testnet pool names: SUI_DBUSDC, DEEP_DBUSDC, DEEP_SUI
                const priorityPools = ['SUI_DBUSDC', 'DEEP_SUI', 'DEEP_DBUSDC', 'WAL_SUI'];
                
                const poolsData = await Promise.all(
                    priorityPools
                        .filter(poolName => ticker[poolName])
                        .map(async (poolName) => {
                            const tickerData = ticker[poolName];
                            
                            // Fetch recent trades for mini chart
                            const trades = await fetchTrades(poolName, { limit: 10 });
                            const chartData = trades.length > 0
                                ? trades.slice(0, 7).reverse().map(trade => ({ v: trade.price }))
                                : [{ v: tickerData.last_price }];
                            
                            // Fetch order book for bid/ask spread
                            const orderBook = await fetchOrderBook(poolName, { level: 2, depth: orderBookDepth });
                            const bestBid = orderBook.bids.length > 0 ? parseFloat(orderBook.bids[0][0]) : 0;
                            const bestAsk = orderBook.asks.length > 0 ? parseFloat(orderBook.asks[0][0]) : 0;
                            const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;
                            const spreadPercent = bestAsk && bestBid ? ((spread / bestBid) * 100) : 0;
                            
                            // Calculate price change (mock if not available)
                            const priceChange = ('price_change_percent_24h' in tickerData) 
                                ? (tickerData as any).price_change_percent_24h 
                                : 0;
                            
                            return {
                                id: poolName,
                                displayName: formatPoolName(poolName),
                                price: tickerData.last_price.toFixed(4),
                                change: formatPriceChange(priceChange),
                                isPositive: priceChange >= 0,
                                data: chartData,
                                bestBid: bestBid.toFixed(4),
                                bestAsk: bestAsk.toFixed(4),
                                spread: spread.toFixed(4),
                                spreadPercent: spreadPercent.toFixed(3)
                            };
                        })
                );
                
                // Only update if data has actually changed
                setPools(prevPools => {
                    const newPools = poolsData.filter(pool => pool !== null);
                    // Compare stringified version to detect actual changes
                    if (JSON.stringify(prevPools) === JSON.stringify(newPools)) {
                        return prevPools; // Return same reference to prevent re-render
                    }
                    return newPools;
                });
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to fetch pool data:', error);
                setError(error instanceof Error ? error.message : 'Failed to fetch pools');
                setPools([]);
                setIsLoading(false);
            }
        };

        fetchPoolsData(true); // Initial load with loading indicator
        const interval = setInterval(() => fetchPoolsData(false), 3000); // Silent updates

        return () => clearInterval(interval);
    }, [orderBookDepth]);

    const handlePoolSelect = useCallback((poolId: string) => {
        setSelectedPool(poolId);
    }, [setSelectedPool]);

    return (
        <div className="h-full flex flex-col justify-between">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-[#1A365D]">DeepBook Pools</h3>

            </div>
            <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                {isLoading ? (
                    <div className="text-center text-[#1A365D]/60 text-sm py-4">
                        <div className="animate-pulse">Loading pools...</div>
                    </div>
                ) : error ? (
                    <div className="text-center text-red-500 text-xs py-4">
                        Error: {error}
                    </div>
                ) : pools.length === 0 ? (
                    <div className="text-center text-[#1A365D]/60 text-sm py-4">
                        No pools available
                    </div>
                ) : (
                    pools.map((pool) => (
                        <PoolCard 
                            key={pool.id}
                            pool={pool}
                            isSelected={pool.id === selectedPool}
                            onSelect={handlePoolSelect}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// Memoized PoolCard component to prevent unnecessary re-renders
interface PoolCardProps {
    pool: PoolData;
    isSelected: boolean;
    onSelect: (poolId: string) => void;
}

const PoolCard = memo(({ pool, isSelected, onSelect }: PoolCardProps) => {
    const handleClick = useCallback(() => {
        onSelect(pool.id);
    }, [pool.id, onSelect]);

    return (
        <div 
            className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                isSelected 
                    ? 'bg-[#E23FB9]/5 border-[#E23FB9] shadow-sm' 
                    : 'bg-white/30 border-white/40 hover:bg-white/50'
            }`}
            onClick={handleClick}
        >
            <div>
                <div className="text-xs font-bold text-[#1A365D]">{pool.displayName}</div>
                <div className="text-[10px] text-[#1A365D]/60">
                    {pool.price}{' '}
                    <span className={pool.isPositive ? 'text-green-600' : 'text-red-500'}>
                        {pool.change}
                    </span>
                </div>
                <div className="text-[9px] text-[#1A365D]/40 mt-0.5">
                    Bid: {pool.bestBid} | Ask: {pool.bestAsk}
                    <span className="ml-1 text-[#E23FB9]">
                        ({pool.spreadPercent}%)
                    </span>
                </div>
            </div>
            <div className="w-16 h-8" style={{ minHeight: '32px', minWidth: '64px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pool.data}>
                        <Area
                            type="monotone"
                            dataKey="v"
                            stroke={isSelected ? '#E23FB9' : '#94A3B8'}
                            strokeWidth={2}
                            fill="none"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

PoolCard.displayName = 'PoolCard';
