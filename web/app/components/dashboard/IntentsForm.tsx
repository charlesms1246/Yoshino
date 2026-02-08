'use client';

import { useState, useEffect } from 'react';
import { ArrowRightLeft, ShieldCheck, Zap, Clock, Target, Settings } from 'lucide-react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { CONTRACTS, ASSET_TYPES } from '@/lib/contracts';
import { encryptIntent, submitEncryptedIntent, type IntentData } from '@/lib/seal';
import { useUserData } from '@/hooks/useUserData';

export interface ParsedIntent {
    token_in: string;
    token_out: string;
    amount_in: string;
    strategy: 'Instant' | 'Limit' | 'TWAP';
    limit_price: string | null;
    duration_hours: number | null;
    patient_execution: boolean;
    allow_partial_fill: boolean;
    max_gas_fee: string;
    slippage_tolerance: string;
}

interface IntentsFormProps {
    onDepositSuccess?: () => void; // Callback to refresh balance
    aiParsedIntent?: ParsedIntent | null; // AI-parsed intent to auto-fill form
}

export default function IntentsForm({ onDepositSuccess, aiParsedIntent }: IntentsFormProps = {}) {
    // Wallet and transaction hooks
    const account = useCurrentAccount();
    const { saveIntent, trackDeposit } = useUserData();
    const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
    const suiClient = useSuiClient();
    
    // Available tokens
    const tokens = ['SUI', 'USDC', 'DBUSDC', 'DEEP', 'WAL'];
    
    // Basic trade fields
    const [amountIn, setAmountIn] = useState('');
    const [amountOut, setAmountOut] = useState('');
    const [tokenIn, setTokenIn] = useState('USDC');
    const [tokenOut, setTokenOut] = useState('SUI');
    
    // Advanced constraint fields
    const [executionStrategy, setExecutionStrategy] = useState<'Instant' | 'Limit' | 'TWAP'>('Instant');
    const [expiresAt, setExpiresAt] = useState('');
    const [limitPrice, setLimitPrice] = useState('');
    const [patientExecution, setPatientExecution] = useState(false);
    const [allowPartialFill, setAllowPartialFill] = useState(true);
    const [maxGasFee, setMaxGasFee] = useState('1');
    const [slippageTolerance, setSlippageTolerance] = useState('0.5');
    
    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<string>('');

    // Auto-fill form when AI provides parsed intent
    useEffect(() => {
        if (aiParsedIntent) {
            setTokenIn(aiParsedIntent.token_in);
            setTokenOut(aiParsedIntent.token_out);
            setAmountIn(aiParsedIntent.amount_in);
            setExecutionStrategy(aiParsedIntent.strategy);
            setLimitPrice(aiParsedIntent.limit_price || '');
            setPatientExecution(aiParsedIntent.patient_execution);
            setAllowPartialFill(aiParsedIntent.allow_partial_fill);
            setMaxGasFee(aiParsedIntent.max_gas_fee);
            setSlippageTolerance(aiParsedIntent.slippage_tolerance);
            
            // Set expiry based on duration_hours if provided
            if (aiParsedIntent.duration_hours) {
                const expiryDate = new Date(Date.now() + aiParsedIntent.duration_hours * 60 * 60 * 1000);
                setExpiresAt(expiryDate.toISOString().slice(0, 16));
            }
        }
    }, [aiParsedIntent]);

    // Swap input and output tokens
    const handleSwapTokens = () => {
        const tempToken = tokenIn;
        setTokenIn(tokenOut);
        setTokenOut(tempToken);
        
        const tempAmount = amountIn;
        setAmountIn(amountOut);
        setAmountOut(tempAmount);
    };

    // Calculate expires_at timestamp from datetime input
    const getExpiresAtTimestamp = () => {
        if (!expiresAt) {
            // Default: 1 hour from now
            return Date.now() + 60 * 60 * 1000;
        }
        return new Date(expiresAt).getTime();
    };

    // Convert token symbol to full type path
    const getTokenType = (symbol: string): string => {
        switch (symbol) {
            case 'SUI':
                return ASSET_TYPES.SUI;
            case 'DBUSDC':
            case 'USDC':
                return ASSET_TYPES.DBUSDC;
            default:
                return ASSET_TYPES.SUI; // Default to SUI
        }
    };

    // Handle complete intent submission flow
    const handleSubmit = async () => {
        if (!account?.address) {
            alert('Please connect your wallet first');
            return;
        }

        if (!amountIn || parseFloat(amountIn) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus('Preparing deposit transaction...');

        try {
            // Step 1: Parse amount (convert to MIST - 9 decimals for SUI)
            const amountInNumber = parseFloat(amountIn.replace(/,/g, ''));
            const amountInMist = BigInt(Math.floor(amountInNumber * 1_000_000_000)); // 9 decimals

            // Step 2: Create deposit transaction
            const tx = new Transaction();
            
            // Split coins for deposit amount
            const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
            
            // Call deposit function
            tx.moveCall({
                target: `${CONTRACTS.PACKAGE_ID}::shielded_pool::deposit`,
                typeArguments: [ASSET_TYPES.SUI], // Depositing SUI
                arguments: [
                    tx.object(CONTRACTS.YOSHINO_STATE),
                    coin,
                ],
            });

            setSubmitStatus('Awaiting wallet signature...');

            // Execute deposit transaction
            // Workaround for version mismatch - pass tx directly
            const result = await signAndExecute({ 
                transaction: tx as any  // Type cast to avoid version mismatch
            });
            
            console.log('✅ Deposit successful:', result.digest);
            
            // Track deposit amount via backend
            try {
                await trackDeposit(amountInMist.toString());
                console.log('💰 Deposit tracked on backend');
            } catch (err) {
                console.error('Failed to track deposit:', err);
            }
            
            // Trigger balance refresh via global callback
            if (typeof window !== 'undefined' && (window as any).__refreshUserData) {
                (window as any).__refreshUserData();
            }
            if (onDepositSuccess) {
                onDepositSuccess();
            }
                        setSubmitStatus('Deposit confirmed! Encrypting intent...');

            // Step 3: Build intent data
            const intent: IntentData = {
                nonce: Date.now(),
                user: account.address,
                token_in: getTokenType(tokenIn),
                amount_in: amountInMist,
                token_out: getTokenType(tokenOut),
                expires_at: getExpiresAtTimestamp(),
                limit_price: executionStrategy === 'Limit' && limitPrice ? BigInt(Math.floor(parseFloat(limitPrice) * 1_000_000_000)) : BigInt(0),
                strategy: executionStrategy === 'TWAP' ? 'TWAP' : 'Standard',
                allow_partial_fill: allowPartialFill,
                max_gas_fee_contribution: maxGasFee ? BigInt(Math.floor(parseFloat(maxGasFee) * 1_000_000_000)) : BigInt(0),
            };

            // Step 4: Encrypt intent
            const encryptedData = await encryptIntent(intent);
            
            setSubmitStatus('Submitting to resolver...');

            // Step 5: Submit to resolver backend
            const submitResult = await submitEncryptedIntent(account.address, encryptedData);

            if (submitResult.success) {
                // Save intent to backend
                try {
                    await saveIntent({
                        id: `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        user: account.address,
                        type: tokenIn === 'SUI' ? 'swap' : 'swap',
                        token_in: getTokenType(tokenIn),
                        token_out: getTokenType(tokenOut),
                        amount_in: amountInMist.toString(),
                        amount_out: (BigInt(Math.floor(parseFloat(amountOut) * 1_000_000_000))).toString(),
                        limit_price: executionStrategy === 'Limit' && limitPrice ? (BigInt(Math.floor(parseFloat(limitPrice) * 1_000_000_000))).toString() : undefined,
                        status: 'pending',
                    });
                    console.log('💾 Intent saved to backend');
                } catch (err) {
                    console.error('Failed to save intent:', err);
                }
                                setSubmitStatus(`\u2705 Intent queued! Position: ${submitResult.queuePosition}`);
                setTimeout(() => {
                    setSubmitStatus('');
                    // Reset form
                    setAmountIn('');
                    setAmountOut('');
                }, 3000);
            } else {
                throw new Error(submitResult.error || 'Submission failed');
            }
        } catch (error) {
            console.error('Intent submission error:', error);
            setSubmitStatus('');
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h2 className="text-2xl font-serif text-[#1A365D]">New Intent</h2>
                <div className="flex items-center gap-1 text-[#E23FB9] bg-[#E23FB9]/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck size={14} /> Shielded
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                <div className="flex flex-col gap-4">

                {/* Input Asset */}
                <div className="bg-white/40 p-4 rounded-2xl border border-white/60 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#E23FB9]/20 focus-within:border-[#E23FB9]">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold text-[#1A365D]/50 uppercase">You Pay</label>
                        <span className="text-xs text-[#1A365D]/50">Bal: 12,450 USDC</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <input
                            type="text"
                            value={amountIn}
                            onChange={(e) => setAmountIn(e.target.value)}
                            className="bg-transparent text-3xl font-bold text-[#1A365D] w-1/2 focus:outline-none placeholder-[#1A365D]/20"
                            placeholder="0.00"
                        />
                        <select
                            value={tokenIn}
                            onChange={(e) => setTokenIn(e.target.value)}
                            className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-[#1A365D]/10 font-bold text-[#1A365D] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#E23FB9]/20"
                        >
                            {tokens.map(token => (
                                <option key={token} value={token}>{token}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Swap Icon */}
                <div className="flex justify-center -my-2 relative z-10">
                    <button 
                        onClick={handleSwapTokens}
                        className="bg-white p-2 rounded-xl shadow-md border border-[#1A365D]/10 text-[#1A365D] hover:rotate-180 transition-transform duration-300 hover:shadow-lg active:scale-95"
                    >
                        <ArrowRightLeft size={18} />
                    </button>
                </div>

                {/* Output Asset */}
                <div className="bg-white/40 p-4 rounded-2xl border border-white/60 shadow-sm transition-all focus-within:ring-2 focus-within:ring-[#E23FB9]/20 focus-within:border-[#E23FB9]">
                    <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold text-[#1A365D]/50 uppercase">You Receive (Est.)</label>
                        <span className="text-xs text-[#1A365D]/50">Depth: $4.2M</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <input
                            type="text"
                            value={amountOut}
                            onChange={(e) => setAmountOut(e.target.value)}
                            className="bg-transparent text-3xl font-bold text-[#1A365D] w-1/2 focus:outline-none placeholder-[#1A365D]/20"
                            placeholder="0.00"
                        />
                        <select
                            value={tokenOut}
                            onChange={(e) => setTokenOut(e.target.value)}
                            className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-[#1A365D]/10 font-bold text-[#1A365D] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#E23FB9]/20"
                        >
                            {tokens.map(token => (
                                <option key={token} value={token}>{token}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Advanced Settings Section */}
                <div className="bg-white/40 p-3 rounded-2xl border border-white/60 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Settings size={16} className="text-[#1A365D]" />
                        <h3 className="text-sm font-bold text-[#1A365D] uppercase">Execution Settings</h3>
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* Execution Strategy */}
                        <div>
                            <label className="text-xs font-bold text-[#1A365D]/70 uppercase mb-2 block">Execution Strategy</label>
                            <select
                                value={executionStrategy}
                                onChange={(e) => setExecutionStrategy(e.target.value as 'Instant' | 'Limit' | 'TWAP')}
                                className="w-full bg-white px-3 py-2 rounded-lg border border-[#1A365D]/10 text-[#1A365D] font-medium focus:outline-none focus:ring-2 focus:ring-[#E23FB9]/20"
                            >
                                <option value="Instant">⚡ Instant (Market Order)</option>
                                <option value="Limit">🎯 Limit Target</option>
                                <option value="TWAP">📊 TWAP (Time-Weighted)</option>
                            </select>
                            <p className="text-xs text-[#1A365D]/50 mt-1">
                                {executionStrategy === 'Instant' && 'Execute immediately at best available price'}
                                {executionStrategy === 'Limit' && 'Only trade if price is better than your target'}
                                {executionStrategy === 'TWAP' && 'Split trade over time to reduce market impact'}
                            </p>
                        </div>

                        {/* Limit Price (conditional) */}
                        {executionStrategy === 'Limit' && (
                            <div>
                                <label className="text-xs font-bold text-[#1A365D]/70 uppercase mb-2 flex items-center gap-1">
                                    <Target size={12} /> Limit Price
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={limitPrice}
                                        onChange={(e) => setLimitPrice(e.target.value)}
                                        placeholder="e.g., 1.500000"
                                        className="flex-1 bg-white px-3 py-2 rounded-lg border border-[#1A365D]/10 text-[#1A365D] font-medium focus:outline-none focus:ring-2 focus:ring-[#E23FB9]/20"
                                    />
                                    <span className="text-sm font-bold text-[#1A365D]">{tokenIn}/{tokenOut}</span>
                                </div>
                                <p className="text-xs text-[#1A365D]/50 mt-1">
                                    Buy: Max price you'll pay | Sell: Min price you'll accept
                                </p>
                            </div>
                        )}

                        {/* Intent Expiry */}
                        <div>
                            <label className="text-xs font-bold text-[#1A365D]/70 uppercase mb-2 flex items-center gap-1">
                                <Clock size={12} /> Intent Expiry (TTL)
                            </label>
                            <input
                                type="datetime-local"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                min={new Date().toISOString().slice(0, 16)}
                                className="w-full bg-white px-3 py-2 rounded-lg border border-[#1A365D]/10 text-[#1A365D] font-medium focus:outline-none focus:ring-2 focus:ring-[#E23FB9]/20"
                            />
                            <p className="text-xs text-[#1A365D]/50 mt-1">
                                {expiresAt ? `Expires ${new Date(expiresAt).toLocaleString()}` : 'Default: 1 hour from now'}
                            </p>
                        </div>

                        {/* Patient Execution Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-xs font-bold text-[#1A365D]/70 uppercase">Patient Execution</label>
                                <p className="text-xs text-[#1A365D]/50">Wait for better prices (slower)</p>
                            </div>
                            <button
                                onClick={() => setPatientExecution(!patientExecution)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${patientExecution ? 'bg-[#E23FB9]' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${patientExecution ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        {/* Partial Fill Toggle */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-xs font-bold text-[#1A365D]/70 uppercase">Allow Partial Fills</label>
                                <p className="text-xs text-[#1A365D]/50">Fill order in multiple executions</p>
                            </div>
                            <button
                                onClick={() => setAllowPartialFill(!allowPartialFill)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${allowPartialFill ? 'bg-[#E23FB9]' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${allowPartialFill ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        {/* Max Gas Fee */}
                        <div>
                            <label className="text-xs font-bold text-[#1A365D]/70 uppercase mb-2 block">Max Gas Fee Contribution</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={maxGasFee}
                                    onChange={(e) => setMaxGasFee(e.target.value)}
                                    placeholder="1.0"
                                    className="flex-1 bg-white px-3 py-2 rounded-lg border border-[#1A365D]/10 text-[#1A365D] font-medium focus:outline-none focus:ring-2 focus:ring-[#E23FB9]/20"
                                />
                                <span className="text-sm font-bold text-[#1A365D]">{tokenIn}</span>
                            </div>
                            <p className="text-xs text-[#1A365D]/50 mt-1">Maximum amount deducted for gas fees</p>
                        </div>

                        {/* Slippage Tolerance */}
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-[#1A365D]/70 uppercase">Slippage Tolerance</span>
                            <input
                                type="number"
                                step="0.1"
                                value={slippageTolerance}
                                onChange={(e) => setSlippageTolerance(e.target.value)}
                                className="w-20 bg-white px-2 py-1 rounded-lg border border-[#1A365D]/10 text-[#1A365D] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#E23FB9]/20"
                            />
                        </div>

                        {/* Privacy Level */}
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-[#1A365D]/70 uppercase">Privacy Level</span>
                            <span className="text-[#E23FB9] font-bold flex items-center gap-1 text-sm">
                                <ShieldCheck size={14} /> Max
                            </span>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="mt-3">
                    {submitStatus && (
                        <div className="mb-2 text-xs text-center text-[#1A365D]/70 font-medium animate-pulse">
                            {submitStatus}
                        </div>
                    )}
                    <button 
                        onClick={handleSubmit}
                        disabled={isSubmitting || !account?.address}
                        className="w-full bg-[#E23FB9] hover:bg-[#C01A8C] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#E23FB9]/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing...
                            </>
                        ) : !account?.address ? (
                            'Connect Wallet First'
                        ) : (
                            <>
                                <Zap size={22} fill="currentColor" />
                                Execute Shielded {executionStrategy === 'Instant' ? 'Swap' : executionStrategy === 'Limit' ? 'Limit Order' : 'TWAP Order'}
                            </>
                        )}
                    </button>
                </div>
                </div>
            </div>
        </div>
    );
}
