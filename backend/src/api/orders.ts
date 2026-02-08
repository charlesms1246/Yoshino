/**
 * Orders API
 * Endpoints to sync and manage orders
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { orderSyncService } from '../services/order-sync.js';
import { getUserData } from '../storage/intents.js';

const app = new Hono();
app.use('/*', cors());

/**
 * POST /api/orders/sync
 * Sync all package deposits as orders
 */
app.post('/sync', async (c) => {
  try {
    console.log('🔄 Starting package-wide order sync...');

    const result = await orderSyncService.syncPackageDeposits();

    return c.json({
      success: true,
      message: 'Orders synced successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error syncing orders:', error);
    return c.json({
      success: false,
      error: 'Failed to sync orders',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

/**
 * POST /api/orders/sync/:address
 * Sync orders for specific user
 */
app.post('/sync/:address', async (c) => {
  try {
    const address = c.req.param('address');

    if (!address || !address.startsWith('0x')) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }

    console.log(`🔄 Syncing orders for: ${address}`);

    const result = await orderSyncService.syncUserOrders(address);

    return c.json({
      success: true,
      message: 'User orders synced successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error syncing user orders:', error);
    return c.json({
      success: false,
      error: 'Failed to sync user orders',
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

/**
 * GET /api/orders/:address
 * Get active orders for user
 */
app.get('/:address', async (c) => {
  try {
    const address = c.req.param('address');

    if (!address || !address.startsWith('0x')) {
      return c.json({ error: 'Invalid wallet address' }, 400);
    }

    const userData = getUserData(address);

    return c.json({
      success: true,
      data: {
        orders: userData?.intents || [],
        count: userData?.intents.length || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch orders',
    }, 500);
  }
});

export default app;
