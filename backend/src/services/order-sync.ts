/**
 * Order Sync Service
 * Fetches deposit PTBs and creates active orders
 */

import { SuiClient } from '@mysten/sui/client';
import { CONFIG } from '../config.js';
import { addUserIntent, getUserData } from '../storage/intents.js';

const suiClient = new SuiClient({ url: CONFIG.sui.rpcUrl });

export class OrderSyncService {
  /**
   * Sync all deposit transactions as active orders
   */
  async syncPackageDeposits(): Promise<{
    totalOrders: number;
    byUser: Record<string, number>;
  }> {
    try {
      console.log(`🔄 Syncing deposits from package: ${CONFIG.sui.packageId}`);

      // For now, return empty - this would require indexing all package transactions
      // which is expensive. Use syncUserOrders instead for specific users.
      console.log('⚠️ Package-wide sync not implemented - use syncUserOrders for specific addresses');
      return { totalOrders: 0, byUser: {} };

      // Parse deposit transactions
      const deposits: any[] = [];
      
      console.log(`✅ Found ${deposits.length} deposit transactions`);

      // Group by user
      const byUser: Record<string, number> = {};
      
      for (const deposit of deposits) {
        if (deposit.status !== 'success') continue;

        const userAddress = deposit.sender.toLowerCase();
        
        // Check if this intent already exists
        const userData = getUserData(userAddress);
        const intentExists = userData?.intents.some(i => i.id === deposit.digest);
        
        if (intentExists) {
          console.log(`⏭️ Skipping existing intent: ${deposit.digest.substring(0, 12)}...`);
          continue;
        }

        // Create intent/order from deposit
        const intent = {
          id: deposit.digest,
          user: deposit.sender,
          type: 'swap' as const,
          token_in: '0x2::sui::SUI',
          token_out: '0xdba34672e3cb9efc8d2c9b0c90c6fb0efc149d43eff2cf3d337a4ef79d0b2e11::usdc::USDC', // USDC type
          amount_in: deposit.amount,
          amount_out: '0', // Unknown until swap intent
          status: 'pending' as const,
          submitted_at: deposit.timestamp,
        };

        addUserIntent(userAddress, intent);
        
        byUser[userAddress] = (byUser[userAddress] || 0) + 1;
        
        console.log(`💾 Created order for ${userAddress}: ${Number(deposit.amount) / 1_000_000_000} SUI`);
      }

      const totalOrders = Object.values(byUser).reduce((sum, count) => sum + count, 0);
      
      console.log(`✅ Sync complete: ${totalOrders} new orders created`);
      console.log(`👥 Users with orders:`, Object.keys(byUser).length);

      return { totalOrders, byUser };
    } catch (error) {
      console.error('❌ Error syncing orders:', error);
      throw error;
    }
  }

  /**
   * Sync orders for a specific user
   */
  async syncUserOrders(userAddress: string): Promise<{
    ordersCreated: number;
    deposits: any[];
  }> {
    try {
      console.log(`🔄 Syncing orders for user: ${userAddress}`);

      // Query user's transactions from Sui
      const txBlocks = await suiClient.queryTransactionBlocks({
        filter: { FromAddress: userAddress },
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
        },
        limit: 50,
      });

      console.log(`📦 Found ${txBlocks.data.length} transactions for user`);

      // Parse deposits from transaction blocks
      const userDeposits: any[] = [];
      
      for (const tx of txBlocks.data) {
        if (!tx.transaction?.data.transaction) continue;
        
        const ptb = tx.transaction.data.transaction;
        if (ptb.kind !== 'ProgrammableTransaction') continue;

        // Look for deposit MoveCall
        const hasDeposit = ptb.transactions?.some((t: any) => {
          if (!t.MoveCall) return false;
          const call = t.MoveCall;
          return (
            call.package === CONFIG.sui.packageId &&
            call.module === 'shielded_pool' &&
            call.function === 'deposit'
          );
        });

        if (!hasDeposit) continue;

        // Extract amount from inputs
        const inputs = ptb.inputs || [];
        let amount: string = '0';
        
        // Find SplitCoins or coin amount in inputs
        for (const input of inputs) {
          if (input.type === 'pure' && input.valueType === 'u64') {
            amount = String(input.value);
            break;
          }
        }

        if (amount === '0') continue;

        console.log(`💰 Found deposit: ${tx.digest.substring(0, 12)}... amount: ${amount} MIST`);

        userDeposits.push({
          digest: tx.digest,
          sender: tx.transaction.data.sender,
          amount,
          timestamp: parseInt(tx.timestampMs || Date.now().toString()),
          status: tx.effects?.status?.status || 'unknown',
        });
      }

      console.log(`✅ Found ${userDeposits.length} deposits to process`);

      let ordersCreated = 0;
      const userData = getUserData(userAddress.toLowerCase());
      
      console.log(`🔍 Checking existing user data for ${userAddress.toLowerCase()}`);
      console.log(`📊 Existing intents: ${userData?.intents?.length || 0}`);

      for (const deposit of userDeposits) {
        console.log(`🔄 Processing deposit: ${deposit.digest.substring(0, 12)}...`);
        
        // Check if intent already exists
        const intentExists = userData?.intents.some(i => i.id === deposit.digest);
        console.log(`   Exists: ${intentExists}`);
        
        if (intentExists) {
          console.log(`   ⏭️ Skipping existing intent`);
          continue;
        }

        // Create intent/order
        const intent = {
          id: deposit.digest,
          user: deposit.sender,
          type: 'swap' as const,
          token_in: '0x2::sui::SUI',
          token_out: '0xdba34672e3cb9efc8d2c9b0c90c6fb0efc149d43eff2cf3d337a4ef79d0b2e11::usdc::USDC', // USDC type
          amount_in: deposit.amount,
          amount_out: '0',
          status: 'pending' as const,
          submitted_at: deposit.timestamp,
        };

        console.log(`   ✅ Creating new intent with amount: ${deposit.amount} MIST`);
        addUserIntent(userAddress.toLowerCase(), intent);
        ordersCreated++;
      }

      console.log(`✅ Created ${ordersCreated} orders for user`);

      return { ordersCreated, deposits: userDeposits };
    } catch (error) {
      console.error('❌ Error syncing user orders:', error);
      throw error;
    }
  }
}

export const orderSyncService = new OrderSyncService();
