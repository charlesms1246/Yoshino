#!/usr/bin/env node

/**
 * Debug transaction to see why deposits aren't being detected
 */

import { SuiClient } from '@mysten/sui/client';

const rpcUrl = 'https://fullnode.testnet.sui.io:443';
const userAddress = '0x1aacdc938d4ea8bd7982f53a99f143377430e46d88bb9e617396948e194fa9f1';
const packageId = '0xea4d586ac0d5acd3a6a127d5acde57f7ba57f15a9fb1b0fde588b2f2da9655ef';

// Known deposit transaction from screenshot
const knownTxDigest = '89EGmXodQx53kWGASDHKGrnRXyT6CZJXFG9CZsPhbN1c';

async function debugTransaction() {
  console.log('🔍 Debugging transaction detection\n');

  const client = new SuiClient({ url: rpcUrl });

  try {
    // Get specific known transaction
    console.log(`📄 Analyzing known deposit: ${knownTxDigest}`);
    
    const tx = await client.getTransactionBlock({
      digest: knownTxDigest,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    console.log('\n📋 Transaction Details:');
    console.log('- Sender:', tx.transaction?.data.sender);
    console.log('- Transaction kind:', tx.transaction?.data.transaction.kind);
    
    if (tx.transaction?.data.transaction.kind === 'ProgrammableTransaction') {
      const ptb = tx.transaction.data.transaction;
      console.log('- PTB transactions count:', ptb.transactions?.length || 0);
      
      console.log('\n🔍 Analyzing PTB transactions:');
      for (let i = 0; i < (ptb.transactions?.length || 0); i++) {
        const txn = ptb.transactions[i];
        if (txn.MoveCall) {
          const call = txn.MoveCall;
          console.log(`  ${i + 1}. MoveCall:`);
          console.log(`     Package: ${call.package}`);
          console.log(`     Module: ${call.module}`);
          console.log(`     Function: ${call.function}`);
          
          const isDeposit = (
            call.package === packageId &&
            call.module === 'shielded_pool' &&
            call.function === 'deposit'
          );
          console.log(`     Is Deposit: ${isDeposit ? '✅' : '❌'}`);
        } else {
          console.log(`  ${i + 1}. Other:`, Object.keys(txn)[0]);
        }
      }

      console.log('\n💰 Analyzing inputs:');
      for (let i = 0; i < (ptb.inputs?.length || 0); i++) {
        const input = ptb.inputs[i];
        console.log(`  ${i + 1}. Type: ${input.type}, Value: ${JSON.stringify(input)}`);
      }
    }

    console.log('\n📊 Events:');
    if (tx.events?.length) {
      for (let i = 0; i < tx.events.length; i++) {
        const event = tx.events[i];
        console.log(`  ${i + 1}. ${event.type}`);
        console.log(`     Data:`, JSON.stringify(event.parsedJson, null, 2));
      }
    } else {
      console.log('  No events found');
    }

    console.log('\n🔄 Object Changes:');
    if (tx.objectChanges?.length) {
      for (let i = 0; i < tx.objectChanges.length; i++) {
        const change = tx.objectChanges[i];
        console.log(`  ${i + 1}. ${change.type}:`, change);
      }
    } else {
      console.log('  No object changes found');
    }

    // Now test our detection logic
    console.log('\n🧪 Testing Detection Logic:');
    
    const ptb = tx.transaction?.data.transaction;
    if (ptb?.kind === 'ProgrammableTransaction') {
      const hasDeposit = ptb.transactions?.some((t) => {
        if (!t.MoveCall) return false;
        const call = t.MoveCall;
        return (
          call.package === packageId &&
          call.module === 'shielded_pool' &&
          call.function === 'deposit'
        );
      });

      console.log(`✅ Our logic detects deposit: ${hasDeposit}`);

      if (hasDeposit) {
        // Try to extract amount
        let amount = '0';
        const inputs = ptb.inputs || [];
        for (const input of inputs) {
          if (input.type === 'pure' && input.valueType === 'u64') {
            amount = String(input.value);
            console.log(`💰 Found amount in inputs: ${amount} MIST`);
            break;
          }
        }

        // Also check events
        if (tx.events) {
          for (const event of tx.events) {
            const parsed = event.parsedJson;
            if (parsed && (parsed.amount || parsed.balance_change)) {
              console.log(`💰 Found amount in events: ${parsed.amount || parsed.balance_change} MIST`);
              break;
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugTransaction();