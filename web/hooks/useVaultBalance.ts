import { useState, useEffect, useCallback } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { CONTRACTS, ASSET_TYPES } from '@/lib/contracts';
import type { VaultBalance } from '@/types';

const DEPOSITS_STORAGE_KEY = 'yoshino_user_deposits';

export function useVaultBalance(address: string) {
  const client = useSuiClient();
  const [balance, setBalance] = useState<VaultBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Manual refresh function
  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Track deposit amount
  const trackDeposit = useCallback((amount: bigint) => {
    if (!address) {
      console.warn('⚠️ Cannot track deposit - no address');
      return;
    }
    
    const storageKey = `${DEPOSITS_STORAGE_KEY}_${address}`;
    const stored = localStorage.getItem(storageKey);
    const currentTotal = stored ? BigInt(stored) : BigInt(0);
    const newTotal = currentTotal + amount;
    
    console.log('💾 Tracking deposit:', {
      address,
      storageKey,
      amount: amount.toString(),
      currentTotal: currentTotal.toString(),
      newTotal: newTotal.toString()
    });
    
    localStorage.setItem(storageKey, newTotal.toString());
    
    // Trigger refresh
    setRefreshKey(prev => prev + 1);
  }, [address]);

  // Expose trackDeposit globally for IntentsForm
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__trackDeposit = trackDeposit;
    }
  }, [trackDeposit]);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get tracked deposits from localStorage
        const storageKey = `${DEPOSITS_STORAGE_KEY}_${address}`;
        const stored = localStorage.getItem(storageKey);
        console.log('📊 Loading balance from localStorage:', { storageKey, stored, address });
        
        const balanceInMist = stored ? BigInt(stored) : BigInt(0);
        const formatted = (Number(balanceInMist) / 1_000_000_000).toFixed(4);
        
        console.log('💰 Balance loaded:', { balanceInMist: balanceInMist.toString(), formatted });
        
        setBalance({ 
          amount: balanceInMist, 
          formatted 
        });
      } catch (err) {
        console.error('Error fetching balance:', err);
        setError('Failed to fetch balance');
        setBalance({ amount: BigInt(0), formatted: '0.0000' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();
    
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [address, client, refreshKey]); // Add refreshKey as dependency

  return { balance, isLoading, error, refresh, trackDeposit };
}



