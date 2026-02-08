#!/usr/bin/env node
/**
 * Withdrawal CLI Tool
 * Process withdrawals to return funds to users
 */

const RESOLVER_API = process.env.RESOLVER_API || 'http://localhost:3000';

async function withdrawSingle(userAddress, amount) {
  console.log(`\n💸 Initiating withdrawal...`);
  console.log(`   User: ${userAddress}`);
  console.log(`   Amount: ${amount} MIST (${Number(amount) / 1_000_000_000} SUI)`);

  try {
    const response = await fetch(`${RESOLVER_API}/api/withdraw/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress,
        amount,
        tokenType: '0x2::sui::SUI',
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`\n✅ Withdrawal successful!`);
      console.log(`   TX Digest: ${result.txDigest}`);
      console.log(`   Explorer: ${result.explorerUrl}`);
      return result;
    } else {
      console.error(`\n❌ Withdrawal failed:`, result.error);
      console.error(`   Details:`, result.details);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    throw error;
  }
}

async function withdrawBatch(withdrawals) {
  console.log(`\n💸 Initiating batch withdrawal of ${withdrawals.length} transactions...`);

  for (const w of withdrawals) {
    console.log(`   → ${w.userAddress}: ${Number(w.amount) / 1_000_000_000} SUI`);
  }

  try {
    const response = await fetch(`${RESOLVER_API}/api/withdraw/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ withdrawals }),
    });

    const result = await response.json();

    if (result.success) {
      console.log(`\n✅ Batch withdrawal successful!`);
      console.log(`   Processed: ${result.count} withdrawals`);
      console.log(`   TX Digest: ${result.txDigest}`);
      console.log(`   Explorer: ${result.explorerUrl}`);
      return result;
    } else {
      console.error(`\n❌ Batch withdrawal failed:`, result.error);
      console.error(`   Details:`, result.details);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Yoshino Withdrawal Tool
=======================

Usage:
  node process-withdrawals.cjs <user_address> <amount_in_mist>
  node process-withdrawals.cjs batch <file.json>

Examples:
  # Single withdrawal: 1.5 SUI (1500000000 MIST)
  node process-withdrawals.cjs 0x1aa...9f1 1500000000

  # Batch withdrawal from JSON file
  node process-withdrawals.cjs batch withdrawals.json

JSON Format:
  [
    { "userAddress": "0x1aa...9f1", "amount": "1500000000" },
    { "userAddress": "0x2bb...8e2", "amount": "500000000" }
  ]
`);
    process.exit(1);
  }

  if (args[0] === 'batch') {
    const filename = args[1];
    if (!filename) {
      console.error('❌ Please provide JSON file path');
      process.exit(1);
    }

    const fs = await import('fs');
    const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    await withdrawBatch(data);
  } else {
    const [userAddress, amount] = args;
    if (!userAddress || !amount) {
      console.error('❌ Please provide user address and amount');
      process.exit(1);
    }

    await withdrawSingle(userAddress, amount);
  }

  console.log('\n✅ All withdrawals completed!\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
