'use client';

import { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchTrades, fetchSummary, formatPriceChange, formatPoolName } from '@/lib/deepbook';
import { createPriceStream, calculatePrice, getStreamFeedIds, HermesPriceUpdate } from '@/lib/pyth';
import { usePool } from '@/contexts/PoolContext';

const initialData = [
    { time: '10:00', value: 400 },
    { time: '11:00', value: 300 },
    { time: '12:00', value: 550 },
    { time: '13:00', value: 450 },
    { time: '14:00', value: 700 },
    { time: '15:00', value: 600 },
];

export default function MarketStats() {
    const { selectedPool } = usePool();
    
    const [chartData, setChartData] = useState(initialData);
    
    // Market stats - will be updated with real data
    const [price, setPrice] = useState('$0.00');
    const [priceChange, setPriceChange] = useState('0.00%');
    const [isPositive, setIsPositive] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isLiveConnected, setIsLiveConnected] = useState(false);

    useEffect(() => {
        // Fetch 24h summary and trades for non-live data
        const fetchStaticData = async () => {
            try {
                const summaryData = await fetchSummary();
                const poolData = summaryData[selectedPool];
                
                if (poolData) {
                    // Update price change
                    const change = poolData.price_change_percent_24h;
                    setIsPositive(change >= 0);
                    setPriceChange(formatPriceChange(change));
                }
                
                // Fetch recent trades for chart
                const now = Date.now();
                const oneHourAgo = now - 60 * 60 * 1000;
                const trades = await fetchTrades(selectedPool, {
                    limit: 20,
                    startTime: Math.floor(oneHourAgo / 1000),
                    endTime: Math.floor(now / 1000),
                });
                
                if (trades.length > 0) {
                    const newChartData = trades.slice(0, 6).reverse().map((trade: any) => ({
                        time: new Date(trade.timestamp).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        }),
                        value: trade.price * 100,
                    }));
                    setChartData(newChartData);
                }
            } catch (error) {
                console.error('Failed to fetch static market data:', error);
            }
        };
        
        fetchStaticData();
        const staticInterval = setInterval(fetchStaticData, 10000); // Refresh every 10s
        
        // Setup SSE stream for live price updates
        const feedIds = getStreamFeedIds(selectedPool);
        let eventSource: EventSource | null = null;
        
        if (feedIds.length > 0) {
            eventSource = createPriceStream(
                feedIds,
                (updates: HermesPriceUpdate[]) => {
                    setIsLiveConnected(true);
                    setLastUpdate(new Date());
                    
                    // Calculate pair price from base/quote feeds
                    if (updates.length >= 2) {
                        const basePrice = calculatePrice(updates[0].price);
                        const quotePrice = calculatePrice(updates[1].price);
                        const pairPrice = basePrice / quotePrice;
                        setPrice(`$${pairPrice.toFixed(4)}`);
                    } else if (updates.length === 1) {
                        const singlePrice = calculatePrice(updates[0].price);
                        setPrice(`$${singlePrice.toFixed(4)}`);
                    }
                },
                () => {
                    setIsLiveConnected(false);
                    console.warn('Hermes SSE connection lost, will retry...');
                }
            );
        }
        
        return () => {
            clearInterval(staticInterval);
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [selectedPool]);

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Market Data Section */}
            <div className="flex-shrink-0">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h2 className="text-sm font-semibold text-[#1A365D]/60 uppercase tracking-wider mb-1 flex items-center gap-2">
                            {formatPoolName(selectedPool)}
                            {isLiveConnected && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 text-[9px] font-bold rounded-full">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                    LIVE
                                </span>
                            )}
                        </h2>
                        <div className="text-3xl font-bold text-[#1A365D]">{price}</div>
                        <div className={`text-xs font-medium flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {priceChange} (24h)
                        </div>
                        {lastUpdate && (
                            <div className="text-[9px] text-[#1A365D]/40 mt-1">
                                Updated: {lastUpdate.toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-16 w-full mt-4" style={{ minHeight: '64px', minWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#E23FB9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#E23FB9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="value" stroke="#E23FB9" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                            <Tooltip cursor={false} contentStyle={{ display: 'none' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
