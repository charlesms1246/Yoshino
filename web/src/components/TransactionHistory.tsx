'use client';

import { useState, useEffect } from 'react';
import type { Transaction } from '@/types';

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Mock data for now - will be replaced with real data
  useEffect(() => {
    // This will be replaced with actual transaction fetching
    setTransactions([]);
  }, []);

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-xl h-fit">
      <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
      
      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-4 text-gray-400">No transactions yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Your activity will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.digest}
              className="bg-gray-900 rounded-lg p-4 hover:bg-gray-850 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-semibold capitalize">{tx.type}</span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    tx.status === 'success'
                      ? 'bg-green-500/20 text-green-400'
                      : tx.status === 'pending'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {tx.status}
                </span>
              </div>
              <p className="text-sm text-gray-400">{tx.amount}</p>
              <p className="text-xs text-gray-500 mt-2 font-mono">
                {tx.digest.slice(0, 20)}...
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
