/**
 * Find shared objects created by Yoshino deployment
 */
import { SuiClient } from '@mysten/sui/client';

const RPC_URL = 'https://fullnode.testnet.sui.io:443';
const PACKAGE_ID = '0x24cff15f379297d8f14e9f5b5845e49705526c747bb92c9c8b036bafe128e0b7';

async function main() {
  const client = new SuiClient({ url: RPC_URL });
  
  console.log('🔍 Searching for YoshinoState shared object...\n');
  
  // Query dynamic fields or use getObject with the package
  try {
    // Method 1: Query objects by type
    const yoshinoStateType = `${PACKAGE_ID}::shielded_pool::YoshinoState`;
    
    console.log(`📦 Package: ${PACKAGE_ID}`);
    console.log(`🔎 Looking for type: ${yoshinoStateType}\n`);
    
    // Try to get objects owned by package (won't work for shared)
    // Instead, we need to look at recent transactions
    
    // Get the package object to find when it was published
    const packageObj = await client.getObject({
      id: PACKAGE_ID,
      options: { showPreviousTransaction: true }
    });
    
    if (packageObj.data?.previousTransaction) {
      console.log(`📜 Deployment Transaction: ${packageObj.data.previousTransaction}\n`);
      
      // Get the transaction details
      const txn = await client.getTransactionBlock({
        digest: packageObj.data.previousTransaction,
        options: {
          showEffects: true,
          showObjectChanges: true,
        }
      });
      
      // Find YoshinoState in object changes
      if (txn.objectChanges) {
        console.log('🔄 Object Changes:\n');
        
        for (const change of txn.objectChanges) {
          if (change.type === 'created' || change.type === 'published') {
            const objType = 'objectType' in change ? change.objectType : '';
            const objId = 'objectId' in change ? change.objectId : '';
            
            console.log(`  ${change.type.toUpperCase()}: ${objType}`);
            console.log(`  ID: ${objId}`);
            
            if (objType.includes('YoshinoState')) {
              console.log(`\n  ✅ FOUND YoshinoState!`);
              console.log(`  📍 Object ID: ${objId}`);
              console.log(`  🔓 Owner: Shared\n`);
              
              // Verify we can read it
              try {
                const stateObj = await client.getObject({
                  id: objId,
                  options: { showContent: true, showType: true }
                });
                
                if (stateObj.data) {
                  console.log('  ✅ Object is accessible!');
                  console.log(`  📊 Version: ${stateObj.data.version}`);
                  console.log(`  🔗 Type: ${stateObj.data.type}\n`);
                  
                  return objId;
                }
              } catch (e: any) {
                console.log(`  ⚠️  Could not read object: ${e.message}\n`);
              }
            }
            console.log();
          }
        }
      }
      
      // Also check effects for created objects
      if (txn.effects?.created) {
        console.log('📦 Created Objects:\n');
        for (const created of txn.effects.created) {
          console.log(`  ${created.reference.objectId}`);
          console.log(`  Owner: ${JSON.stringify(created.owner)}\n`);
        }
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);
