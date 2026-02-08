/**
 * Batch Executor Module - Simplified for Phase 1
 * Constructs and executes Programmable Transaction Blocks for batch settlements
 */

import { Transaction } from '@mysten/sui/transactions';
import { suiClient } from '../sui/client.js';
import { CONFIG } from '../config.js';
import { UserIntent, BatchExecution } from '../types.js';

/**
 * BatchExecutor handles PTB construction and execution for batched settlements
 */
export class BatchExecutor {
  /**
   * Execute a batch of settlements on-chain via settle_batch
   * Handles TWAP splitting, limit price validation, and partial fills
   * @param intents - Array of decrypted user intents
   * @returns Batch execution result with transaction digest
   */
  async executeBatch(intents: UserIntent[]): Promise<BatchExecution> {
    console.log(`Processing batch of ${intents.length} intents`);
    
    if (intents.length === 0) {
      throw new Error('Cannot execute empty batch');
    }

    try {
      // Process TWAP intents (split large trades over time)
      const processedIntents = await this.processTWAPIntents(intents);
      
      // Filter by limit price
      const validIntents = await this.filterByLimitPrice(processedIntents);
      
      if (validIntents.length === 0) {
        console.log('⚠️  No valid intents after limit price filtering');
        throw new Error('All intents filtered out by limit price');
      }

      // Build Programmable Transaction Block
      const tx = await this.buildBatchTransaction(validIntents);
      
      // Sign and execute transaction
      console.log('Signing and executing transaction...');
      const result = await suiClient.signAndExecuteTransaction(tx);
      
      console.log(`Batch executed: ${result.digest}`);
      
      // Calculate stats (use amount_in instead of deprecated amount)
      const totalVolume = validIntents.reduce((sum, i) => sum + Number(i.amount_in), 0);
      
      return {
        batchId: result.digest,
        trades: validIntents,
        totalVolume,
        executedAt: Date.now(),
        txDigest: result.digest,
      };
    } catch (error) {
      console.error('Batch execution failed:', error);
      throw new Error(`Batch execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Process TWAP (Time-Weighted Average Price) intents
   * Splits large trades into smaller chunks over time
   * @param intents - Array of user intents
   * @returns Processed intents (may be split into smaller trades)
   */
  private async processTWAPIntents(intents: UserIntent[]): Promise<UserIntent[]> {
    const processed: UserIntent[] = [];
    const now = Date.now();
    
    for (const intent of intents) {
      if (intent.strategy === 'TWAP') {
        // Calculate time remaining until expiry
        const timeRemaining = intent.expires_at - now;
        
        if (timeRemaining <= 0) {
          console.log(`⏱️  TWAP intent from ${intent.user} already expired`);
          continue;
        }
        
        // For hackathon demo: split into 3 equal parts
        // Production would track progress in database
        const chunkSize = intent.amount_in / 3n;
        const chunk: UserIntent = {
          ...intent,
          amount_in: chunkSize,
          amount_in_total: intent.amount_in,
          amount_filled: 0n,
          status: 'PARTIAL',
        };
        
        console.log(`📊 TWAP: Split ${intent.amount_in} into chunk of ${chunkSize}`);
        processed.push(chunk);
      } else {
        // Standard execution - process full amount
        processed.push({
          ...intent,
          amount_in_total: intent.amount_in,
          amount_filled: 0n,
          status: 'OPEN',
        });
      }
    }
    
    return processed;
  }
  
  /**
   * Filter intents by limit price
   * Checks current market price against user's limit price
   * @param intents - Array of user intents
   * @returns Intents that pass limit price check
   */
  private async filterByLimitPrice(intents: UserIntent[]): Promise<UserIntent[]> {
    // TODO: Query DeepBook for current market price
    // For now, pass all intents (market orders)
    
    const filtered: UserIntent[] = [];
    
    for (const intent of intents) {
      if (intent.limit_price === 0n) {
        // Market order - always pass
        filtered.push(intent);
        continue;
      }
      
      // TODO: Implement actual price checking
      // const marketPrice = await this.getMarketPrice(intent.token_in, intent.token_out);
      // const isBuy = intent.token_out.includes('SUI');
      //
      // if (isBuy && marketPrice <= intent.limit_price) {
      //   filtered.push(intent);
      // } else if (!isBuy && marketPrice >= intent.limit_price) {
      //   filtered.push(intent);
      // } else {
      //   console.log(`💰 Intent from ${intent.user} skipped: limit price not met`);
      // }
      
      // For demo: accept all limit orders
      console.log(`💰 Limit order from ${intent.user}: ${intent.limit_price} (demo: accepted)`);
      filtered.push(intent);
    }
    
    return filtered;
  }
  
  /**
   * Build the Programmable Transaction Block for batch settlement
   * Uses the new settle_batch function for atomic batch processing
   * @param intents - Array of decrypted user intents
   * @returns Transaction instance ready for signing
   */
  private async buildBatchTransaction(intents: UserIntent[]): Promise<Transaction> {
    const tx = new Transaction();
    
    // Set gas budget (30M MIST = 0.03 SUI for batch settlement)
    tx.setGasBudget(30_000_000);
    
    console.log('Building PTB for settle_batch...');

    // 1. Reference SolverCap (owned by resolver)
    const solverCap = tx.object(CONFIG.sui.solverCapId);
    console.log(`  SolverCap: ${CONFIG.sui.solverCapId}`);
    
    // 2. Reference YoshinoState (shared object)
    const yoshinoStateId = process.env.YOSHINO_STATE_ID || CONFIG.sui.vaultBaseId;
    const yoshinoState = tx.object(yoshinoStateId);
    console.log(`  YoshinoState: ${yoshinoStateId}`);
    
    // 3. Build recipients and amounts vectors
    const recipients = intents.map(i => i.user);
    const amounts = intents.map(i => Number(i.amount_in)); // Convert BigInt to number for PTB
    
    console.log(`  Batch: ${recipients.length} users`);
    console.log(`  Total amount: ${amounts.reduce((a, b) => a + b, 0)} MIST`);
    
    // 4. Call settle_batch function
    tx.moveCall({
      target: `${CONFIG.sui.packageId}::shielded_pool::settle_batch`,
      typeArguments: ['0x2::sui::SUI'], // Settle SUI
      arguments: [
        solverCap,
        yoshinoState,
        tx.pure.vector('address', recipients),
        tx.pure.vector('u64', amounts),
      ],
    });
    
    console.log('PTB construction complete');
    
    return tx;
  }

  /**
   * Estimate gas cost for a batch
   * @param intents - Array of user intents
   * @returns Estimated gas cost in MIST
   */
  async estimateGas(intents: UserIntent[]): Promise<number> {
    try {
      const tx = await this.buildBatchTransaction(intents);
      
      // Dry run to estimate gas
      const dryRunResult = await suiClient.dryRunTransaction(tx);
      
      if ('effects' in dryRunResult && dryRunResult.effects.gasUsed) {
        const gasUsed = dryRunResult.effects.gasUsed;
        const computationCost = Number(gasUsed.computationCost || 0);
        const storageCost = Number(gasUsed.storageCost || 0);
        const storageRebate = Number(gasUsed.storageRebate || 0);
        
        const totalCost = computationCost + storageCost - storageRebate;
        console.log(`Gas estimate: ${totalCost} MIST (${totalCost / 1_000_000_000} SUI)`);
        return totalCost;
      }
      
      // Fallback estimate: 10M MIST per batch
      return 10_000_000;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      // Return conservative estimate
      return 10_000_000;
    }
  }
}

/**
 * Singleton instance of BatchExecutor
 */
export const batchExecutor = new BatchExecutor();
