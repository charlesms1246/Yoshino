'use client';

import { Wallet, Shield, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { useUserData } from '@/hooks/useUserData';

export default function BalanceHeader() {
    const account = useCurrentAccount();
    const [shielded, setShielded] = useState(true);
    const { userData, isLoading, refetch, syncFromBlockchain } = useUserData();
    const [syncing, setSyncing] = useState(false);

    // Calculate balance from deposited amount
    const balance = userData ? {
        value: BigInt(userData.total_deposited),
        formatted: (Number(userData.total_deposited) / 1_000_000_000).toFixed(4),
    } : null;

    // Expose refetch globally for IntentsForm to call
    useEffect(() => {
        (window as any).__refreshUserData = refetch;
    }, [refetch]);

    // Auto-sync on mount if wallet connected
    useEffect(() => {
        if (account?.address && !userData) {
            handleSync();
        }
    }, [account?.address]);

    const handleSync = async () => {
        if (!account?.address || syncing) return;
        
        setSyncing(true);
        try {
            await syncFromBlockchain();
            console.log('✅ Sync complete!');
        } catch (error) {
            console.error('❌ Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="flex items-center justify-between">
            

            <div className="flex items-center gap-3">
                <button
                    onClick={() => setShielded(!shielded)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                        shielded
                            ? 'bg-[#E23FB9] text-white shadow-lg shadow-[#E23FB9]/20'
                            : 'bg-white text-[#1A365D] shadow-sm'
                    }`}
                >
                    {shielded ? <Shield size={18} /> : <Wallet size={18} />}
                    <span className="font-medium text-sm">
                        {isLoading ? (
                            'Loading...'
                        ) : (
                            shielded ? `Shielded: ${balance?.formatted || '0.0000'} SUI` : 'Public'
                        )}
                    </span>
                </button>
                
                {/* Sync Button */}
                {account && (
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="px-3 py-2 rounded-xl bg-[#E23FB9]/10 text-[#E23FB9] hover:bg-[#E23FB9]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title="Sync transactions from blockchain"
                    >
                        <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                        <span className="text-xs font-medium">{syncing ? 'Syncing...' : 'Sync'}</span>
                    </button>
                )}
                
                <ConnectButton />
            </div>
        </div>
    );
}

