'use client';

import { Clock, CheckCircle2, MoreHorizontal, Shield, RefreshCw } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useActiveOrders } from '@/hooks/useActiveOrders';

function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export default function PlacedOrders() {
    const account = useCurrentAccount();
    const { orders, isLoading, refreshOrders } = useActiveOrders();
    
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#1A365D]">Active Orders</h3>
                <button 
                    onClick={refreshOrders}
                    className="text-[#E23FB9] text-xs font-bold hover:underline flex items-center gap-1"
                    disabled={isLoading}
                >
                    <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {!account ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <Shield size={40} className="text-[#E23FB9]/20 mb-3" />
                        <p className="text-sm text-[#1A365D]/60">Connect wallet to view your orders</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <Clock size={40} className="text-[#E23FB9]/20 mb-3" />
                        <p className="text-sm font-medium text-[#1A365D]">No active orders</p>
                        <p className="text-xs text-[#1A365D]/60 mt-1">Submit an intent to see it here</p>
                    </div>
                ) : (
                    orders.map((intent) => {
                        const amountInSui = (Number(intent.amount_in) / 1_000_000_000).toFixed(4);
                        const amountOutSui = (Number(intent.amount_out) / 1_000_000_000).toFixed(4);
                        const tokenInSymbol = intent.token_in.split('::').pop() || 'SUI';
                        const tokenOutSymbol = intent.token_out.split('::').pop() || 'USDC';
                        
                        return (
                        <div key={intent.id} className="bg-white/40 p-3 rounded-xl border border-white/50 flex items-center justify-between group hover:bg-white/60 transition-colors cursor-pointer">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${intent.type === 'swap' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {intent.type === 'swap' ? 'Swap' : 'Limit'}
                                    </span>
                                    <span className="font-medium text-[#1A365D]">{amountInSui} {tokenInSymbol}</span>
                                    <span className="text-xs text-[#1A365D]/40">→</span>
                                    <span className="font-medium text-[#1A365D]">{amountOutSui} {tokenOutSymbol}</span>
                                </div>
                                <div className="text-xs text-[#1A365D]/60 mt-1">
                                    {intent.limit_price ? `Limit ${(Number(intent.limit_price) / 1_000_000_000).toFixed(4)}` : 'Market'}
                                    {' • '}
                                    {formatTimeAgo(intent.submitted_at)}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1 text-xs font-medium text-[#E23FB9]">
                                    {intent.status === 'pending' && <Clock size={12} className="animate-spin-slow" />}
                                    {intent.status === 'pending' && <Shield size={12} />}
                                    {intent.status === 'executed' && <CheckCircle2 size={12} />}
                                    {intent.status.charAt(0).toUpperCase() + intent.status.slice(1)}
                                </div>
                            </div>
                        </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
