/**
 * Transaction Sync API
 * Endpoints to sync and fetch user transactions
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { transactionSync } from '../services/transaction-sync.js';

const app = new Hono();
app.use('/*', cors());

/**
 * POST /api/transactions/sync/:address
 * Sync all deposit transactions for a user
 */
app.post('/sync/:address', async (c) => {
  try {
    const address = c.req.param('address');

    if (!address || !address.startsWith('0x')) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }

    console.log(`🔄 Syncing transactions for: ${address}`);

    const result = await transactionSync.syncUserDeposits(address);

    return c.json({
      success: true,
      message: 'Transactions synced successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    return c.json({
      success: false,
      error: 'Failed to sync transactions',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

/**
 * GET /api/transactions/:address
 * Get deposit transactions for a user
 */
app.get('/:address', async (c) => {
  try {
    const address = c.req.param('address');

    if (!address || !address.startsWith('0x')) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }

    const deposits = await transactionSync.fetchUserDeposits(address);

    return c.json({
      success: true,
      data: {
        deposits,
        count: deposits.length,
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch transactions',
    }, 500);
  }
});

/**
 * GET /api/transactions/tx/:digest
 * Get specific transaction details
 */
app.get('/tx/:digest', async (c) => {
  try {
    const digest = c.req.param('digest');

    const tx = await transactionSync.getTransaction(digest);

    return c.json({
      success: true,
      data: tx,
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch transaction',
    }, 500);
  }
});

export default app;
