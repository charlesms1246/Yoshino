'use client';

import { useCurrentAccount } from '@mysten/dapp-kit';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { ASSET_TYPES } from '@/lib/contracts';

export function BalanceDisplay() {
  const account = useCurrentAccount();
  const { balance, isLoading, error } = useVaultBalance(account?.address || '');

  if (!account) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-bold mb-4">Your Shielded Balance</h2>
      
      <div className="space-y-4">
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400 text-sm">SUI</p>
              <p className="text-3xl font-bold mt-1">
                {isLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : error ? (
                  <span className="text-red-500 text-sm">Error loading balance</span>
                ) : (
                  `${balance?.formatted || '0.00'}`
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Asset Type</p>
              <p className="text-xs font-mono mt-1 text-gray-500">
                {ASSET_TYPES.SUI.slice(0, 20)}...
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex-1 bg-yoshino-purple hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors">
            Deposit
          </button>
          <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors">
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}
