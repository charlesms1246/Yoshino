/**
 * useUserData Hook
 * Fetches user data from backend server
 */

import { useEffect, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';

const RESOLVER_API_URL = process.env.NEXT_PUBLIC_RESOLVER_API || 'http://localhost:3000';

export interface StoredIntent {
  id: string;
  user: string;
  type: 'swap' | 'limit';
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out: string;
  limit_price?: string;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  submitted_at: number;
  executed_at?: number;
  tx_digest?: string;
}

export interface UserData {
  address: string;
  total_deposited: string;
  intents: StoredIntent[];
  last_updated: number;
}

export function useUserData() {
  const account = useCurrentAccount();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user data when account changes
  useEffect(() => {
    if (!account?.address) {
      setUserData(null);
      return;
    }

    fetchUserData();
  }, [account?.address]);

  const fetchUserData = async () => {
    if (!account?.address) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('📊 Fetching user data from backend:', account.address);

      const response = await fetch(`${RESOLVER_API_URL}/api/user/${account.address}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ User data loaded:', {
        deposited: data.total_deposited,
        intents: data.intents.length,
      });

      setUserData(data);
    } catch (err) {
      console.error('❌ Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveIntent = async (intent: Omit<StoredIntent, 'submitted_at'>) => {
    if (!account?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('💾 Saving intent to backend:', intent.id);

      const response = await fetch(`${RESOLVER_API_URL}/api/user/${account.address}/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...intent,
          submitted_at: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save intent');
      }

      // Refresh user data
      await fetchUserData();
      
      console.log('✅ Intent saved successfully');
    } catch (err) {
      console.error('❌ Error saving intent:', err);
      throw err;
    }
  };

  const trackDeposit = async (amount: string) => {
    if (!account?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('💰 Tracking deposit:', amount, 'MIST');

      const response = await fetch(`${RESOLVER_API_URL}/api/user/${account.address}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        throw new Error('Failed to track deposit');
      }

      // Refresh user data
      await fetchUserData();
      
      console.log('✅ Deposit tracked successfully');
    } catch (err) {
      console.error('❌ Error tracking deposit:', err);
      throw err;
    }
  };

  const updateIntentStatus = async (
    intentId: string,
    status: StoredIntent['status'],
    txDigest?: string
  ) => {
    if (!account?.address) return;

    try {
      console.log(`🔄 Updating intent ${intentId} status:`, status);

      const response = await fetch(
        `${RESOLVER_API_URL}/api/user/${account.address}/intent/${intentId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, tx_digest: txDigest }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update intent status');
      }

      // Refresh user data
      await fetchUserData();
      
      console.log('✅ Intent status updated');
    } catch (err) {
      console.error('❌ Error updating intent status:', err);
    }
  };

  const syncFromBlockchain = async () => {
    if (!account?.address) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🔄 Syncing transactions from blockchain...');

      const response = await fetch(
        `${RESOLVER_API_URL}/api/user/${account.address}/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to sync from blockchain');
      }

      const result = await response.json();
      
      console.log('✅ Blockchain sync complete:', result);

      // Refresh user data
      await fetchUserData();

      return result;
    } catch (err) {
      console.error('❌ Error syncing from blockchain:', err);
      throw err;
    }
  };

  return {
    userData,
    isLoading,
    error,
    refetch: fetchUserData,
    saveIntent,
    trackDeposit,
    updateIntentStatus,
    syncFromBlockchain,
  };
}
