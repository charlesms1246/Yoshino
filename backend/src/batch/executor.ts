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
   * @param intents - Array of decrypted user intents
   * @returns Batch execution result with transaction digest
   */
  async executeBatch(intents: UserIntent[]): Promise<BatchExecution> {
    console.log(`Processing batch of ${intents.length} intents`);
    
    if (intents.length === 0) {
      throw new Error('Cannot execute empty batch');
    }

    try {
      // Build Programmable Transaction Block
      const tx = await this.buildBatchTransaction(intents);
      
      // Sign and execute transaction
      console.log('Signing and executing transaction...');
      const result = await suiClient.signAndExecuteTransaction(tx);
      
      console.log(`Batch executed: ${result.digest}`);
      
      // Calculate stats
      const totalVolume = intents.reduce((sum, i) => sum + i.amount, 0);
      
      return {
        batchId: result.digest,
        trades: intents,
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
    const amounts = intents.map(i => i.amount);
    
    console.log(`  Batch: ${recipients.length} users`);
    
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
