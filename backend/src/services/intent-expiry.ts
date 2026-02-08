/**
 * Intent Expiry Service
 * Monitors intents and automatically withdraws expired ones
 */

import { getUserData, updateIntentStatus, type StoredIntent } from '../storage/intents.js';
import { CONFIG } from '../config.js';
import { Transaction } from '@mysten/sui/transactions';
import { suiClient } from '../sui/client.js';

export class IntentExpiryService {
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring for expired intents
   */
  start(intervalMs: number = 30000) { // Check every 30 seconds
    if (this.checkInterval) {
      console.warn('⚠️ Expiry service already running');
      return;
    }

    console.log(`⏰ Starting intent expiry monitor (checking every ${intervalMs}ms)`);
    
    this.checkInterval = setInterval(() => {
      this.checkExpiredIntents();
    }, intervalMs);

    // Run immediately on start
    this.checkExpiredIntents();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏹️ Intent expiry monitor stopped');
    }
  }

  /**
   * Check all intents and process expired ones
   */
  private async checkExpiredIntents() {
    try {
      const now = Date.now();
      console.log(`🔍 Checking for expired intents...`);

      // This would iterate through all stored user data
      // For now, we'll need to implement a way to get all users
      // Let's add a method to storage to get all users with pending intents
      
      // TODO: Implement getAllUsersWithPendingIntents in storage
      console.log('✅ Expiry check complete');
    } catch (error) {
      console.error('❌ Error checking expired intents:', error);
    }
  }

  /**
   * Process withdrawal for an expired intent
   */
  private async processExpiredIntentWithdrawal(
    userAddress: string,
    intent: StoredIntent
  ): Promise<void> {
    try {
      console.log(`💸 Processing withdrawal for expired intent: ${intent.id}`);
      console.log(`   User: ${userAddress}`);
      console.log(`   Amount: ${intent.amount_in} MIST`);

      // Build withdrawal transaction
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONFIG.sui.packageId}::shielded_pool::withdraw_to_user`,
        arguments: [
          tx.object(CONFIG.sui.solverCapId),
          tx.object(CONFIG.sui.stateId),
          tx.pure.u64(Number(intent.amount_in)),
          tx.pure.address(userAddress),
        ],
        typeArguments: [intent.token_in],
      });

      // Execute withdrawal
      const result = await suiClient.signAndExecute(tx);

      if (result.effects?.status?.status === 'success') {
        console.log(`✅ Expired intent withdrawal successful: ${result.digest}`);
        
        // Update intent status to cancelled
        updateIntentStatus(userAddress, intent.id, 'cancelled', result.digest);
      } else {
        console.error(`❌ Expired intent withdrawal failed:`, result.effects?.status?.error);
      }
    } catch (error) {
      console.error('❌ Error processing expired intent withdrawal:', error);
    }
  }
}

// Singleton instance
export const intentExpiryService = new IntentExpiryService();
