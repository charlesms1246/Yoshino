/**
 * User Data API Endpoints
 * Handles fetching and storing user intents and deposits
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  getUserData,
  addUserIntent,
  trackDeposit,
  updateIntentStatus,
  type StoredIntent,
} from '../storage/intents.js';
import { transactionSync } from '../services/transaction-sync.js';
import { orderSyncService } from '../services/order-sync.js';

const app = new Hono();

// Enable CORS
app.use('/*', cors());

/**
 * GET /api/user/:address
 * Fetch user data (deposits + intents)
 */
app.get('/:address', async (c) => {
  try {
    const address = c.req.param('address');
    
    if (!address || !address.startsWith('0x')) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }
    
    console.log(`📊 Fetching user data for: ${address}`);
    
    // Auto-sync transactions and orders from blockchain
    try {
      await transactionSync.syncUserDeposits(address);
      console.log('✅ Transactions synced from blockchain');
    } catch (syncError) {
      console.warn('⚠️ Failed to sync transactions:', syncError);
    }

    try {
      await orderSyncService.syncUserOrders(address);
      console.log('✅ Orders synced from package');
    } catch (syncError) {
      console.warn('⚠️ Failed to sync orders:', syncError);
    }
    
    const userData = getUserData(address);
    
    if (!userData) {
      // Return empty data for new users
      return c.json({
        address,
        total_deposited: '0',
        intents: [],
        last_updated: Date.now(),
      });
    }
    
    console.log(`✅ Found ${userData.intents.length} intents, deposited: ${userData.total_deposited} MIST`);
    
    return c.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return c.json({ error: 'Failed to fetch user data' }, 500);
  }
});

/**
 * POST /api/user/:address/intent
 * Save a new intent for user
 */
app.post('/:address/intent', async (c) => {
  try {
    const address = c.req.param('address');
    const intent = await c.req.json<StoredIntent>();
    
    if (!address || !address.startsWith('0x')) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }
    
    if (!intent.id || !intent.type || !intent.amount_in) {
      return c.json({ error: 'Invalid intent data' }, 400);
    }
    
    console.log(`💾 Saving intent for ${address}:`, {
      id: intent.id,
      type: intent.type,
      amount_in: intent.amount_in,
      amount_out: intent.amount_out,
    });
    
    addUserIntent(address, intent);
    
    return c.json({ 
      success: true,
      message: 'Intent saved successfully',
    });
  } catch (error) {
    console.error('Error saving intent:', error);
    return c.json({ error: 'Failed to save intent' }, 500);
  }
});

/**
 * POST /api/user/:address/deposit
 * Track a deposit transaction
 */
app.post('/:address/deposit', async (c) => {
  try {
    const address = c.req.param('address');
    const { amount } = await c.req.json<{ amount: string }>();
    
    if (!address || !address.startsWith('0x')) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }
    
    if (!amount || BigInt(amount) <= 0) {
      return c.json({ error: 'Invalid deposit amount' }, 400);
    }
    
    console.log(`💰 Tracking deposit for ${address}: ${amount} MIST`);
    
    trackDeposit(address, amount);
    
    return c.json({ 
      success: true,
      message: 'Deposit tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking deposit:', error);
    return c.json({ error: 'Failed to track deposit' }, 500);
  }
});

/**
 * PATCH /api/user/:address/intent/:intentId
 * Update intent status
 */
app.patch('/:address/intent/:intentId', async (c) => {
  try {
    const address = c.req.param('address');
    const intentId = c.req.param('intentId');
    const { status, tx_digest } = await c.req.json<{ 
      status: StoredIntent['status'];
      tx_digest?: string;
    }>();
    
    if (!address || !intentId || !status) {
      return c.json({ error: 'Missing required parameters' }, 400);
    }
    
    console.log(`🔄 Updating intent ${intentId} for ${address}: ${status}`);
    
    const updated = updateIntentStatus(address, intentId, status, tx_digest);
    
    if (!updated) {
      return c.json({ error: 'Intent not found' }, 404);
    }
    
    return c.json({ 
      success: true,
      message: 'Intent status updated',
    });
  } catch (error) {
    console.error('Error updating intent:', error);
    return c.json({ error: 'Failed to update intent' }, 500);
  }
});

/**
 * POST /api/user/:address/sync
 * Sync user's transactions from blockchain
 */
app.post('/:address/sync', async (c) => {
  try {
    const address = c.req.param('address');
    
    if (!address || !address.startsWith('0x')) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }
    
    console.log(`🔄 Starting blockchain sync for: ${address}`);
    
    const result = await transactionSync.syncUserDeposits(address);
    
    console.log(`✅ Sync complete:`, result);
    
    return c.json({
      success: true,
      message: 'Transactions synced from blockchain',
      data: result,
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    return c.json({ 
      error: 'Failed to sync transactions',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

export default app;
