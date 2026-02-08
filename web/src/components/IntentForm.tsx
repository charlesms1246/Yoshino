'use client';

import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useSubmitIntent } from '@/hooks/useSubmitIntent';

export function IntentForm() {
  const account = useCurrentAccount();
  const { submitIntent, isSubmitting, error } = useSubmitIntent();
  
  const [amount, setAmount] = useState('');
  const [isBid, setIsBid] = useState(true);
  const [minPrice, setMinPrice] = useState('');
  
  // New advanced fields
  const [strategy, setStrategy] = useState<'Instant' | 'Limit' | 'TWAP'>('Instant');
  const [expiryDuration, setExpiryDuration] = useState('10'); // minutes
  const [allowPartialFill, setAllowPartialFill] = useState(true);
  const [optimizeForPrice, setOptimizeForPrice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account || !amount || !minPrice) return;
    
    // Calculate expiry timestamp
    const expiresAt = Date.now() + (parseInt(expiryDuration) * 60 * 1000);
    
    await submitIntent({
      user: account.address,
      amount: parseFloat(amount),
      isBid,
      minPrice: parseFloat(minPrice),
      asset: 'SUI',
      // New fields
      expires_at: expiresAt,
      limit_price: strategy === 'Limit' ? minPrice : '0',
      strategy: strategy === 'TWAP' ? 'TWAP' : 'Standard',
      allow_partial_fill: allowPartialFill,
      max_gas_fee_contribution: '1000000', // 1 USDC default
    });
    
    // Reset form
    setAmount('');
    setMinPrice('');
  };

  if (!account) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
      <h2 className="text-xl font-bold mb-4">Submit Protected Intent</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Trade Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsBid(true)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                isBid 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setIsBid(false)}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                !isBid 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              Sell
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium mb-2">
            Amount (SUI)
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yoshino-purple"
            required
          />
        </div>

        <div>
          <label htmlFor="minPrice" className="block text-sm font-medium mb-2">
            {strategy === 'Limit' ? 'Limit Price' : 'Min Price'}
          </label>
          <input
            id="minPrice"
            type="number"
            step="0.01"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yoshino-purple"
            required
          />
        </div>

        {/* Execution Strategy */}
        <div>
          <label className="block text-sm font-medium mb-2">Execution Strategy</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as any)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yoshino-purple"
          >
            <option value="Instant">Instant (Market) - Execute immediately</option>
            <option value="Limit">Limit Target - Only if price is better</option>
            <option value="TWAP">TWAP (DCA) - Split trade over time</option>
          </select>
        </div>

        {/* Time Constraints */}
        <div>
          <label htmlFor="expiry" className="block text-sm font-medium mb-2">
            Intent Expiry (TTL)
          </label>
          <select
            id="expiry"
            value={expiryDuration}
            onChange={(e) => setExpiryDuration(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yoshino-purple"
          >
            <option value="10">10 Minutes (Standard)</option>
            <option value="60">1 Hour</option>
            <option value="1440">24 Hours</option>
          </select>
        </div>

        {/* Advanced Options */}
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Allow Partial Fills</label>
            <button
              type="button"
              onClick={() => setAllowPartialFill(!allowPartialFill)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                allowPartialFill ? 'bg-yoshino-purple' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  allowPartialFill ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Optimize for Price (Slower)
            </label>
            <button
              type="button"
              onClick={() => setOptimizeForPrice(!optimizeForPrice)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                optimizeForPrice ? 'bg-yoshino-purple' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  optimizeForPrice ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-500 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !amount || !minPrice}
          className="w-full bg-yoshino-purple hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Protected Intent'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          🔒 Your intent is encrypted with Sui Seal before submission
        </p>
      </form>
    </div>
  );
}
