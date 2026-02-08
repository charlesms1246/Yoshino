#!/usr/bin/env node
/**
 * Manual Transaction Sync
 * Sync the 6 known deposit transactions
 */

const RESOLVER_API = process.env.RESOLVER_API || 'http://localhost:3000';
const USER_ADDRESS = '0x1aacdc938d4ea8bd7982f53a99f143377430e46d88bb9e617396948e194fa9f1';

// The 6 deposit transactions from the screenshot
const KNOWN_DEPOSITS = [
  { digest: '89EGmXodQx53DjRBGtc2TorMoit5gX8dpJvtCBupDhhM', amount: '1000000' }, // 0.001 SUI
  { digest: '6DkrVaUszyy8v19LbqiEDGrHCgMK3CMzDThFBkKEG63v', amount: '82984' },   // ~0.00008 SUI
  { digest: '3DEAGDLsNhnvaq4PBzWF5vq9DAe9xpnee8cQ2YhutUYa', amount: '1061104' }, // ~0.001061 SUI
  { digest: '91sVnqmxFk5LhGkNoo8B73yJTBHoFoU6XppqbxZBf97W', amount: '82984' },   // ~0.00008 SUI
  { digest: '6q3jNEX9GRNdsNiZSuoziiCcduDYoJKbLUuWibkcquRt', amount: '220' },     // ~0.00000022 SUI
];

async function syncKnownDeposits() {
  console.log('🔄 Syncing known deposit transactions...\n');

  let totalDeposited = BigInt(0);
  
  for (const deposit of KNOWN_DEPOSITS) {
    totalDeposited += BigInt(deposit.amount);
    const amountSUI = Number(deposit.amount) / 1_000_000_000;
    console.log(`   ✅ ${deposit.digest.substring(0, 12)}... : ${amountSUI.toFixed(9)} SUI`);
  }

  console.log(`\n💰 Total deposited: ${Number(totalDeposited) / 1_000_000_000} SUI`);
  console.log(`📊 Number of transactions: ${KNOWN_DEPOSITS.length}\n`);

  // Track total deposit in backend
  try {
    const response = await fetch(`${RESOLVER_API}/api/user/${USER_ADDRESS}/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: totalDeposited.toString() }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Backend updated successfully!');
      console.log(`   Total tracked: ${totalDeposited.toString()} MIST\n`);

      // Now fetch user data to verify
      const userData = await fetch(`${RESOLVER_API}/api/user/${USER_ADDRESS}`);
      const userDataJson = await userData.json();

      console.log('📊 User data:');
      console.log(`   Address: ${userDataJson.address}`);
      console.log(`   Total Deposited: ${userDataJson.total_deposited} MIST (${Number(userDataJson.total_deposited) / 1_000_000_000} SUI)`);
      console.log(`   Intents: ${userDataJson.intents.length}`);
    } else {
      console.error('❌ Failed to update backend:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

syncKnownDeposits().catch(console.error);
