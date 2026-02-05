/**
 * Batch Executor Tests
 * Tests for PTB construction and execution logic
 */

import { describe, it, expect } from 'vitest';
import { batchExecutor } from './executor.js';
import { UserIntent } from '../types.js';

describe('BatchExecutor', () => {
  it('should build valid PTB for single trade', async () => {
    const intents: UserIntent[] = [
      {
        user: '0x123',
        amount: 1000,
        isBid: true,
        minPrice: 100,
        asset: 'QUOTE',
      },
    ];
    
    // This test requires localnet with deployed contracts
    // Skip in CI or if environment is not configured
    if (process.env.CI || !process.env.VAULT_BASE_ID) {
      console.log('⏭️  Skipping executor test (requires deployed contracts)');
      return;
    }
    
    const result = await batchExecutor.executeBatch(intents);
    expect(result.txDigest).toBeDefined();
    expect(result.trades.length).toBe(1);
    expect(result.totalVolume).toBe(1000);
  });

  it('should build valid PTB for multiple trades', async () => {
    const intents: UserIntent[] = [
      {
        user: '0x123',
        amount: 1000,
        isBid: true,
        minPrice: 100,
        asset: 'QUOTE',
      },
      {
        user: '0x456',
        amount: 500,
        isBid: false,
        minPrice: 110,
        asset: 'BASE',
      },
    ];
    
    // Skip if environment is not configured
    if (process.env.CI || !process.env.VAULT_BASE_ID) {
      console.log('⏭️  Skipping executor test (requires deployed contracts)');
      return;
    }
    
    const result = await batchExecutor.executeBatch(intents);
    expect(result.txDigest).toBeDefined();
    expect(result.trades.length).toBe(2);
    expect(result.totalVolume).toBe(1500);
  });

  it('should reject empty batch', async () => {
    await expect(batchExecutor.executeBatch([])).rejects.toThrow('Cannot execute empty batch');
  });

  it('should estimate gas for batch', async () => {
    const intents: UserIntent[] = [
      {
        user: '0x123',
        amount: 1000,
        isBid: true,
        minPrice: 100,
        asset: 'QUOTE',
      },
    ];
    
    // Skip if environment is not configured
    if (process.env.CI || !process.env.VAULT_BASE_ID) {
      console.log('⏭️  Skipping gas estimation test (requires deployed contracts)');
      return;
    }
    
    const gasEstimate = await batchExecutor.estimateGas(intents);
    expect(gasEstimate).toBeGreaterThan(0);
    expect(gasEstimate).toBeLessThan(100_000_000); // Less than 0.1 SUI
  });
});
