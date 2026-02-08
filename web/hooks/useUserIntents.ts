import { useState, useEffect } from 'react';
import { CONTRACTS } from '@/lib/contracts';

export interface UserIntent {
  id: string;
  user: string;
  type: 'Buy' | 'Sell';
  tokenIn: string;
  amountIn: string;
  tokenOut: string;
  amountOut: string;
  price: string;
  status: 'Pending' | 'Settling' | 'Shielded' | 'Filled' | 'Expired';
  timestamp: number;
  txDigest?: string;
}

const STORAGE_KEY = 'yoshino_user_intents';

export function useUserIntents(walletAddress: string | undefined) {
  const [intents, setIntents] = useState<UserIntent[]>([]);

  // Load intents from localStorage
  useEffect(() => {
    if (!walletAddress) {
      setIntents([]);
      return;
    }

    const storageKey = `${STORAGE_KEY}_${walletAddress}`;
    const stored = localStorage.getItem(storageKey);
    console.log('📋 Loading intents from localStorage:', { walletAddress, storageKey, stored });
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('✅ Intents loaded:', parsed);
        setIntents(parsed);
      } catch (e) {
        console.error('Failed to parse stored intents:', e);
        setIntents([]);
      }
    } else {
      console.log('ℹ️ No stored intents found');
    }
  }, [walletAddress]);

  // Save intent
  const addIntent = (intent: Omit<UserIntent, 'id' | 'timestamp'>) => {
    if (!walletAddress) {
      console.warn('⚠️ Cannot add intent - no wallet address');
      return;
    }

    const newIntent: UserIntent = {
      ...intent,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    console.log('💾 Saving intent:', { walletAddress, intent: newIntent });

    const updated = [newIntent, ...intents];
    const storageKey = `${STORAGE_KEY}_${walletAddress}`;
    
    setIntents(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    
    console.log('✅ Intent saved to localStorage:', { storageKey, totalIntents: updated.length });
  };

  // Update intent status
  const updateIntentStatus = (id: string, status: UserIntent['status']) => {
    if (!walletAddress) return;

    const updated = intents.map(intent =>
      intent.id === id ? { ...intent, status } : intent
    );
    setIntents(updated);
    localStorage.setItem(`${STORAGE_KEY}_${walletAddress}`, JSON.stringify(updated));
  };

  // Remove intent
  const removeIntent = (id: string) => {
    if (!walletAddress) return;

    const updated = intents.filter(intent => intent.id !== id);
    setIntents(updated);
    localStorage.setItem(`${STORAGE_KEY}_${walletAddress}`, JSON.stringify(updated));
  };

  // Clear all intents
  const clearIntents = () => {
    if (!walletAddress) return;

    setIntents([]);
    localStorage.removeItem(`${STORAGE_KEY}_${walletAddress}`);
  };

  return {
    intents,
    addIntent,
    updateIntentStatus,
    removeIntent,
    clearIntents,
  };
}
