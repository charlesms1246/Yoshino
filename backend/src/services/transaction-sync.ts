/**
 * Transaction Sync Service
 * Fetches and parses user deposit transactions from blockchain
 */

import { SuiClient } from '@mysten/sui/client';
import { CONFIG } from '../config.js';
import { trackDeposit, addUserIntent } from '../storage/intents.js';

interface DepositTransaction {
  digest: string;
  timestamp: number;
  amount: string; // in MIST
  sender: string;
  status: 'success' | 'failed';
}

export class TransactionSyncService {
  private client: SuiClient;

  constructor() {
    this.client = new SuiClient({ url: CONFIG.sui.rpcUrl });
  }

  /**
   * Fetch all deposit transactions for a user
   */
  async fetchUserDeposits(userAddress: string): Promise<DepositTransaction[]> {
    try {
      console.log(`🔍 Fetching deposit transactions for: ${userAddress}`);

      // Query user's transactions
      const txBlocks = await this.client.queryTransactionBlocks({
        filter: { FromAddress: userAddress },
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
        limit: 50,
      });

      const deposits: DepositTransaction[] = [];

      for (const tx of txBlocks.data) {
        if (!tx.transaction?.data.transaction) continue;
        
        const ptb = tx.transaction.data.transaction;
        if (ptb.kind !== 'ProgrammableTransaction') continue;

        // Look for shielded_pool::deposit call
        let hasDeposit = false;
        let depositAmount = '0';

        for (const txn of ptb.transactions || []) {
          if ('MoveCall' in txn) {
            const call = txn.MoveCall;
            if (
              call.package === CONFIG.sui.packageId &&
              call.module === 'shielded_pool' &&
              call.function === 'deposit'
            ) {
              hasDeposit = true;
              break;
            }
          }
        }

        if (!hasDeposit) continue;

        // Extract amount from events (BalanceEvent or custom deposit event)
        if (tx.events) {
          for (const event of tx.events) {
            const parsed = event.parsedJson as any;
            if (parsed && (parsed.amount || parsed.balance_change)) {
              depositAmount = (parsed.amount || parsed.balance_change || '0') as string;
              break;
            }
          }
        }

        // Fallback: try to extract from inputs
        if (depositAmount === '0') {
          const inputs = ptb.inputs || [];
          for (const input of inputs) {
            if (input.type === 'pure' && input.valueType === 'u64') {
              depositAmount = input.value as string;
              break;
            }
          }
        }

        if (depositAmount === '0' || depositAmount === '') continue;

        deposits.push({
          digest: tx.digest,
          timestamp: parseInt(tx.timestampMs || Date.now().toString()),
          amount: depositAmount,
          sender: userAddress,
          status: tx.effects?.status?.status === 'success' ? 'success' : 'failed',
        });
      }

      console.log(`✅ Found ${deposits.length} deposit transactions`);
      return deposits;
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Check if transaction is a deposit to shielded_pool
   */
  private isDepositTransaction(tx: any): boolean {
    try {
      const data = tx.transaction?.data?.transaction;
      if (!data || data.kind !== 'ProgrammableTransaction') return false;

      // Check if any MoveCall is to shielded_pool::deposit
      const transactions = data.transactions as any[];
      if (!transactions || !Array.isArray(transactions)) return false;

      const hasDepositCall = transactions.some((t: any) => {
        if (!t.MoveCall) return false;
        const call = t.MoveCall;
        return (
          call.package === CONFIG.sui.packageId &&
          call.module === 'shielded_pool' &&
          call.function === 'deposit'
        );
      });

      return hasDepositCall;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract deposit amount from PTB inputs
   */
  private extractDepositAmount(tx: any): string | null {
    try {
      const data = tx.transaction?.data;
      if (!data?.transaction) return null;

      const ptb = data.transaction;
      
      // Find the first pure input with u64 type (this is the deposit amount)
      const amountInput = ptb.inputs?.find((input: any) => 
        input.type === 'pure' && input.valueType === 'u64'
      );

      if (amountInput?.value) {
        return amountInput.value;
      }

      // Fallback: check balance changes
      if (tx.balanceChanges) {
        for (const change of tx.balanceChanges) {
          if (change.coinType === '0x2::sui::SUI' && change.amount < 0) {
            // Negative balance change means deposit (exclude gas)
            // The actual deposit is absolute value minus gas cost
            return Math.abs(parseInt(change.amount)).toString();
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting amount:', error);
      return null;
    }
  }

  /**
   * Sync deposits for a user and update backend storage
   */
  async syncUserDeposits(userAddress: string): Promise<{
    totalDeposited: string;
    transactionCount: number;
    deposits: DepositTransaction[];
  }> {
    const deposits = await this.fetchUserDeposits(userAddress);
    
    // Calculate total deposited amount
    let totalDeposited = BigInt(0);
    for (const deposit of deposits) {
      if (deposit.status === 'success') {
        totalDeposited += BigInt(deposit.amount);
      }
    }

    // Update backend storage
    trackDeposit(userAddress, totalDeposited.toString());

    console.log(`💾 Synced deposits for ${userAddress}:`);
    console.log(`   Total: ${totalDeposited.toString()} MIST (${Number(totalDeposited) / 1_000_000_000} SUI)`);
    console.log(`   Transactions: ${deposits.length}`);

    return {
      totalDeposited: totalDeposited.toString(),
      transactionCount: deposits.length,
      deposits,
    };
  }

  /**
   * Get specific transaction details
   */
  async getTransaction(digest: string) {
    return await this.client.getTransactionBlock({
      digest,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showBalanceChanges: true,
        showObjectChanges: true,
      },
    });
  }
}

// Singleton instance
export const transactionSync = new TransactionSyncService();
