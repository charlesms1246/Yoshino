#!/usr/bin/env node

/**
 * Debug user transactions to find deposits
 */

import { SuiClient } from '@mysten/sui/client';
import { config } from 'dotenv';

config();

const rpcUrl = 'https://fullnode.testnet.sui.io:443';
const userAddress = '0x1aacdc938d4ea8bd7982f53a99f143377430e46d88bb9e617396948e194fa9f1';
const packageId = '0xea4d586ac0d5acd3a6a127d5acde57f7ba57f15a9fb1b0fde588b2f2da9655ef';

async function debugUserTransactions() {
  console.log('🔍 Debugging user transactions\n');

  const client = new SuiClient({ url: rpcUrl });

  try {
    console.log(`👤 User: ${userAddress}`);
    console.log(`📦 Package: ${packageId}\n`);
    
    // Query user transactions
    const txBlocks = await client.queryTransactionBlocks({
      filter: { FromAddress: userAddress },
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
      },
      limit: 20,
    });

    console.log(`📊 Found ${txBlocks.data.length} total transactions\n`);

    let depositCount = 0;

    for (let i = 0; i < txBlocks.data.length; i++) {
      const tx = txBlocks.data[i];
      console.log(`🔍 Transaction ${i + 1}: ${tx.digest}`);
      
      if (!tx.transaction?.data.transaction) {
        console.log('   ❌ No transaction data');
        continue;
      }
      
      const ptb = tx.transaction.data.transaction;
      if (ptb.kind !== 'ProgrammableTransaction') {
        console.log(`   ❌ Not PTB: ${ptb.kind}`);
        continue;
      }

      console.log(`   ✅ PTB with ${ptb.transactions?.length || 0} transactions`);

      // Check each transaction in the PTB
      let hasDeposit = false;
      let hasAnyMove = false;
      
      for (let j = 0; j < (ptb.transactions?.length || 0); j++) {
        const txn = ptb.transactions[j];
        if (txn.MoveCall) {
          hasAnyMove = true;
          const call = txn.MoveCall;
          console.log(`     ${j + 1}. MoveCall: ${call.package}::${call.module}::${call.function}`);
          
          // Check for our specific deposit call
          if (call.package === packageId && call.module === 'shielded_pool' && call.function === 'deposit') {
            hasDeposit = true;
            console.log(`       🎯 FOUND DEPOSIT CALL!`);
          }
          
          // Also check for any call to our package
          if (call.package === packageId) {
            console.log(`       📋 Call to our package: ${call.module}::${call.function}`);
          }
        } else {
          console.log(`     ${j + 1}. ${Object.keys(txn)[0]}`);
        }
      }

      if (hasDeposit) {
        depositCount++;
        console.log(`   ✅ DEPOSIT FOUND! Total deposits: ${depositCount}`);
        
        // Try to extract amount
        const inputs = ptb.inputs || [];
        console.log(`   💰 Checking ${inputs.length} inputs:`);
        for (let k = 0; k < inputs.length; k++) {
          const input = inputs[k];
          console.log(`     ${k + 1}. ${input.type}: ${JSON.stringify(input)}`);
          if (input.type === 'pure' && input.valueType === 'u64') {
            console.log(`       💰 AMOUNT: ${input.value} MIST`);
          }
        }
      } else if (hasAnyMove) {
        console.log(`   ⚠️  Has move calls but no deposit`);
      }

      console.log('');
    }

    console.log(`📊 Summary:`);
    console.log(`   Total transactions: ${txBlocks.data.length}`);
    console.log(`   Deposits found: ${depositCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugUserTransactions();