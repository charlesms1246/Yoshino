/**
 * Test Helper Utilities
 * Provides encryption, API interactions, and contract helpers
 */

import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { TestEnvironment } from './setup.js';

/**
 * User intent structure
 */
export interface UserIntent {
  user: string;
  amount: number;
  isBid: boolean;
  minPrice: number;
  asset: 'BASE' | 'QUOTE';
}

/**
 * Encrypt intent using Sui Seal SDK
 * Note: This is a placeholder - actual implementation requires Seal SDK
 */
export async function encryptIntent(intent: UserIntent): Promise<string> {
  // TODO: Implement actual Seal encryption
  // For now, return base64-encoded JSON
  const json = JSON.stringify(intent);
  return Buffer.from(json).toString('base64');
}

/**
 * Submit encrypted intent to resolver API
 */
export async function submitIntent(
  encryptedData: string,
  userAddress: string,
  resolverUrl: string = 'http://localhost:3000'
): Promise<boolean> {
  try {
    const response = await fetch(`${resolverUrl}/api/intents/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: userAddress,
        encryptedData,
      }),
    });
    
    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Failed to submit intent:', error);
    return false;
  }
}

/**
 * Get queue status from resolver
 */
export async function getQueueStatus(resolverUrl: string = 'http://localhost:3000') {
  try {
    const response = await fetch(`${resolverUrl}/api/intents/queue`);
    return await response.json();
  } catch (error) {
    console.error('Failed to get queue status:', error);
    return null;
  }
}

/**
 * Deposit to vault
 */
export async function depositToVault(
  env: TestEnvironment,
  user: Ed25519Keypair,
  amount: number,
  coinType: string = '0x2::sui::SUI'
): Promise<void> {
  const contracts = env.getContracts();
  const tx = new Transaction();
  
  // Get vault ID based on coin type
  const vaultId = coinType === '0x2::sui::SUI' 
    ? contracts.vaultBaseId 
    : contracts.vaultQuoteId;
  
  // Split coins for deposit
  const coin = tx.splitCoins(tx.gas, [amount]);
  
  // Call deposit function
  tx.moveCall({
    target: `${contracts.packageId}::shielded_pool::deposit`,
    arguments: [
      tx.object(vaultId),
      coin,
    ],
    typeArguments: [coinType],
  });
  
  await env.signAndExecute(tx, user);
}

/**
 * Withdraw from vault
 */
export async function withdrawFromVault(
  env: TestEnvironment,
  user: Ed25519Keypair,
  amount: number,
  coinType: string = '0x2::sui::SUI'
): Promise<void> {
  const contracts = env.getContracts();
  const tx = new Transaction();
  
  // Get vault ID based on coin type
  const vaultId = coinType === '0x2::sui::SUI' 
    ? contracts.vaultBaseId 
    : contracts.vaultQuoteId;
  
  // Call withdraw function
  tx.moveCall({
    target: `${contracts.packageId}::shielded_pool::withdraw`,
    arguments: [
      tx.object(vaultId),
      tx.pure.u64(amount),
    ],
    typeArguments: [coinType],
  });
  
  await env.signAndExecute(tx, user);
}

/**
 * Query vault balance for user
 */
export async function queryVaultBalance(
  env: TestEnvironment,
  userAddress: string,
  coinType: string = '0x2::sui::SUI'
): Promise<number> {
  const contracts = env.getContracts();
  const tx = new Transaction();
  
  // Get vault ID based on coin type
  const vaultId = coinType === '0x2::sui::SUI' 
    ? contracts.vaultBaseId 
    : contracts.vaultQuoteId;
  
  try {
    // Query balance
    const result = await env.client.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: userAddress,
    });
    
    // Parse result (this is simplified - actual parsing depends on return format)
    return 0; // Placeholder
  } catch (error) {
    console.error('Failed to query vault balance:', error);
    return 0;
  }
}

/**
 * Create random intent for testing
 */
export function createRandomIntent(userAddress: string): UserIntent {
  return {
    user: userAddress,
    amount: Math.floor(Math.random() * 1000000) + 100000, // 100k-1.1M
    isBid: Math.random() > 0.5,
    minPrice: Math.floor(Math.random() * 200) + 50, // 50-250
    asset: Math.random() > 0.5 ? 'BASE' : 'QUOTE',
  };
}

/**
 * Wait for batch execution
 * Polls queue until it's empty or timeout
 */
export async function waitForBatchExecution(
  timeout: number = 15000,
  resolverUrl: string = 'http://localhost:3000'
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const status = await getQueueStatus(resolverUrl);
    
    if (status && status.pendingIntents === 0) {
      return true;
    }
    
    // Wait 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

/**
 * Check if resolver is running
 */
export async function isResolverRunning(resolverUrl: string = 'http://localhost:3000'): Promise<boolean> {
  try {
    const response = await fetch(`${resolverUrl}/status`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Format SUI amount from MIST
 */
export function formatSui(mist: bigint | number): string {
  const amount = typeof mist === 'bigint' ? Number(mist) : mist;
  return (amount / 1_000_000_000).toFixed(4);
}

/**
 * Parse SUI amount to MIST
 */
export function parseSui(sui: number): number {
  return Math.floor(sui * 1_000_000_000);
}
