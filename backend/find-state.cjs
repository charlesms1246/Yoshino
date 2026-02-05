const { SuiClient } = require('@mysten/sui/client');

const RPC_URL = 'https://fullnode.testnet.sui.io:443';
const PACKAGE_ID = '0x24cff15f379297d8f14e9f5b5845e49705526c747bb92c9c8b036bafe128e0b7';

async function main() {
  const client = new SuiClient({ url: RPC_URL });
  
  console.log('🔍 Searching for YoshinoState shared object...\n');
  console.log(`📦 Package: ${PACKAGE_ID}\n`);
  
  try {
    const packageObj = await client.getObject({
      id: PACKAGE_ID,
      options: { showPreviousTransaction: true }
    });
    
    if (packageObj.data?.previousTransaction) {
      console.log(`📜 Deployment Transaction: ${packageObj.data.previousTransaction}\n`);
      
      const txn = await client.getTransactionBlock({
        digest: packageObj.data.previousTransaction,
        options: {
          showEffects: true,
          showObjectChanges: true,
        }
      });
      
      if (txn.objectChanges) {
        console.log('🔄 Object Changes:\n');
        
        for (const change of txn.objectChanges) {
          if (change.type === 'created' || change.type === 'published') {
            const objType = change.objectType || '';
            const objId = change.objectId || '';
            
            console.log(`  ${change.type.toUpperCase()}: ${objType}`);
            console.log(`  ID: ${objId}`);
            
            if (objType.includes('YoshinoState')) {
              console.log(`\n  ✅ FOUND YoshinoState!`);
              console.log(`  📍 Object ID: ${objId}\n`);
              
              // Update .env files
              console.log('📝 Update your .env files with:');
              console.log(`YOSHINO_STATE_ID=${objId}\n`);
              
              return objId;
            }
            console.log();
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);
