/**
 * Batch Executor Module
 * Constructs and executes Programmable Transaction Blocks for batched trades
 */

import { Transaction } from '@mysten/sui/transactions';
import { suiClient } from '../sui/client.js';
import { CONFIG } from '../config.js';
import { UserIntent, BatchExecution } from '../types.js';
import { TradeConverter } from './converter.js';

/**
 * BatchExecutor handles PTB construction and execution for batched trades
 */
export class BatchExecutor {
  /**
   * Execute a batch of trades on-chain via execute_batch
   * @param intents - Array of decrypted user intents
   * @returns Batch execution result with transaction digest
   */
  async executeBatch(intents: UserIntent[]): Promise<BatchExecution> {
    console.log(`🔄 Executing batch of ${intents.length} trades`);
    
    if (intents.length === 0) {
      throw new Error('Cannot execute empty batch');
    }

    try {
      // Validate all intents before building PTB
      const validatedTrades = TradeConverter.validateAndConvertBatch(intents);
      console.log(`✅ Validated ${validatedTrades.length} trades`);

      // Calculate volumes for logging
      const { totalBids, totalAsks } = TradeConverter.calculateVolumes(intents);
      console.log(`📊 Volume: ${totalBids} bids, ${totalAsks} asks`);

      // Build Programmable Transaction Block
      const tx = await this.buildBatchTransaction(intents);
      
      // Sign and execute transaction
      // Note: In production, this requires a keypair from the resolver's private key
      console.log('📝 Signing and executing transaction...');
      const result = await suiClient.signAndExecuteTransaction(tx);
      
      console.log(`✅ Batch executed: ${result.digest}`);
      
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
      console.error('❌ Batch execution failed:', error);
      throw new Error(`Batch execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Build the Programmable Transaction Block for execute_batch
   * @param intents - Array of decrypted user intents
   * @returns Transaction instance ready for signing
   */
  private async buildBatchTransaction(intents: UserIntent[]): Promise<Transaction> {
    const tx = new Transaction();
    
    // Set gas budget (10M MIST = 0.01 SUI)
    tx.setGasBudget(10_000_000);
    
    console.log('🔨 Building PTB with execute_batch call...');

    // 1. Reference SolverCap (owned by resolver)
    const solverCap = tx.object(CONFIG.sui.solverCapId);
    console.log(`  ✓ SolverCap: ${CONFIG.sui.solverCapId}`);
    
    // 2. Reference Vaults (shared objects)
    const vaultBase = tx.object(CONFIG.sui.vaultBaseId);
    const vaultQuote = tx.object(CONFIG.sui.vaultQuoteId);
    console.log(`  ✓ Vaults: Base=${CONFIG.sui.vaultBaseId}, Quote=${CONFIG.sui.vaultQuoteId}`);
    
    // 3. Reference BalanceManager (shared object)
    const balanceManager = tx.object(CONFIG.sui.balanceManagerId);
    console.log(`  ✓ BalanceManager: ${CONFIG.sui.balanceManagerId}`);
    
    // 4. Reference DeepBook Pool (shared object)
    const pool = tx.object(CONFIG.sui.deepBookPoolId);
    console.log(`  ✓ DeepBook Pool: ${CONFIG.sui.deepBookPoolId}`);
    
    // 5. Reference Clock (shared object at standard address)
    const clock = tx.object('0x6');
    console.log(`  ✓ Clock: 0x6`);
    
    // 6. Build trades vector argument
    const tradesVector = this.buildTradesArgument(tx, intents);
    console.log(`  ✓ Trades vector built for ${intents.length} intents`);
    
    // 7. Call execute_batch function
    tx.moveCall({
      target: `${CONFIG.sui.packageId}::vault::execute_batch`,
      typeArguments: [
        CONFIG.sui.baseAssetType,  // e.g., 0x2::sui::SUI
        CONFIG.sui.quoteAssetType, // e.g., USDC type
      ],
      arguments: [
        solverCap,
        vaultBase,
        vaultQuote,
        balanceManager,
        pool,
        tradesVector,
        clock,
      ],
    });
    
    console.log('✅ PTB construction complete');
    
    return tx;
  }
  
  /**
   * Build trades argument for Move call
   * Constructs a vector<Trade> for the execute_batch function
   * @param tx - Transaction builder instance
   * @param intents - Array of decrypted user intents
   * @returns Transaction argument representing vector<Trade>
   */
  private buildTradesArgument(tx: Transaction, intents: UserIntent[]) {
    // Build array of Trade struct fields
    const trades = intents.map(intent => {
      const trade = TradeConverter.intentToMoveStruct(intent);
      
      // Create Move struct: Trade { user: address, amount: u64, is_bid: bool, min_price: u64 }
      return [
        tx.pure.address(trade.user),
        tx.pure.u64(trade.amount),
        tx.pure.bool(trade.is_bid),
        tx.pure.u64(trade.min_price),
      ];
    });
    
    // Flatten array of struct fields into single array
    const flattenedTrades = trades.flat();
    
    // Build Move vector using makeMoveVec
    // The type parameter should match the actual Trade struct from the contract
    return tx.makeMoveVec({
      elements: flattenedTrades,
      type: `${CONFIG.sui.packageId}::intent::Trade`,
    });
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
        console.log(`⛽ Gas estimate: ${totalCost} MIST (${totalCost / 1_000_000_000} SUI)`);
        return totalCost;
      }
      
      // Fallback estimate: 10M MIST per batch
      return 10_000_000;
    } catch (error) {
      console.error('❌ Gas estimation failed:', error);
      // Return conservative estimate
      return 10_000_000;
    }
  }

  /**
   * Validate PTB before execution
   * @param tx - Transaction to validate
   * @returns True if valid, throws error otherwise
   */
  async validateTransaction(tx: Transaction): Promise<boolean> {
    try {
      // Perform dry run to check if transaction will succeed
      const result = await suiClient.dryRunTransaction(tx);
      
      if ('effects' in result && result.effects.status.status === 'success') {
        console.log('✅ PTB validation passed');
        return true;
      }
      
      throw new Error('PTB validation failed: Transaction would not succeed');
    } catch (error) {
      console.error('❌ PTB validation failed:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance of BatchExecutor
 */
export const batchExecutor = new BatchExecutor();
