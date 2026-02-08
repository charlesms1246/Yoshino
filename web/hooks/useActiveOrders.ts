/**
 * useActiveOrders Hook
 * Fetches active orders from backend
 */

import { useEffect, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { StoredIntent } from './useUserData';

const RESOLVER_API_URL = process.env.NEXT_PUBLIC_RESOLVER_API || 'http://localhost:3001';

export interface ActiveOrder extends StoredIntent {
  timestamp: number;
  amount: string;
}

export function useActiveOrders() {
  const account = useCurrentAccount();
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account?.address) {
      setOrders([]);
      return;
    }

    fetchOrders();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [account?.address]);

  const fetchOrders = async () => {
    if (!account?.address) return;

    setIsLoading(true);
    setError(null);

    try {
      // First sync orders from blockchain
      await syncOrders();
      
      // Then fetch orders
      const response = await fetch(
        `${RESOLVER_API_URL}/api/orders/${account.address}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      
      if (data.success && data.data.orders) {
        setOrders(data.data.orders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const syncOrders = async () => {
    if (!account?.address) return;

    try {
      const response = await fetch(
        `${RESOLVER_API_URL}/api/orders/sync/${account.address}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        console.warn('Failed to sync orders');
      }
    } catch (err) {
      console.warn('Error syncing orders:', err);
    }
  };

  const refreshOrders = () => {
    fetchOrders();
  };

  return {
    orders,
    isLoading,
    error,
    refreshOrders,
  };
}
