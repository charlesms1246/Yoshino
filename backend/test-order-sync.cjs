#!/usr/bin/env node

/**
 * Test Order Sync
 * Manual script to test Blockberry API and order sync
 */

const RESOLVER_API_URL = process.env.RESOLVER_API_URL || 'http://localhost:3001';

async function testOrderSync() {
  console.log('🧪 Testing Order Sync Service\n');

  try {
    // Test 1: Sync all package deposits
    console.log('📦 Test 1: Sync all package deposits');
    const syncAllResponse = await fetch(`${RESOLVER_API_URL}/api/orders/sync`, {
      method: 'POST',
    });

    if (!syncAllResponse.ok) {
      throw new Error(`Sync failed: ${syncAllResponse.statusText}`);
    }

    const syncAllData = await syncAllResponse.json();
    console.log('✅ Response:', JSON.stringify(syncAllData, null, 2));
    console.log('');

    // Test 2: Sync specific user orders
    const testAddress = '0x1aacdc938d4ea8bd7982f53a99f143377430e46d88bb9e617396948e194fa9f1';
    console.log(`👤 Test 2: Sync orders for ${testAddress}`);
    
    const syncUserResponse = await fetch(
      `${RESOLVER_API_URL}/api/orders/sync/${testAddress}`,
      { method: 'POST' }
    );

    if (!syncUserResponse.ok) {
      throw new Error(`User sync failed: ${syncUserResponse.statusText}`);
    }

    const syncUserData = await syncUserResponse.json();
    console.log('✅ Response:', JSON.stringify(syncUserData, null, 2));
    console.log('');

    // Test 3: Fetch user orders
    console.log(`📋 Test 3: Fetch orders for ${testAddress}`);
    
    const ordersResponse = await fetch(`${RESOLVER_API_URL}/api/orders/${testAddress}`);

    if (!ordersResponse.ok) {
      throw new Error(`Fetch failed: ${ordersResponse.statusText}`);
    }

    const ordersData = await ordersResponse.json();
    console.log('✅ Response:', JSON.stringify(ordersData, null, 2));

    if (ordersData.data?.orders?.length > 0) {
      console.log('\n📊 Order Summary:');
      ordersData.data.orders.forEach((order, idx) => {
        const amountInSui = (Number(order.amount_in) / 1_000_000_000).toFixed(6);
        console.log(
          `  ${idx + 1}. ${order.id.substring(0, 12)}... ` +
          `${amountInSui} SUI - ${order.status}`
        );
      });
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testOrderSync();
