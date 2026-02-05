/**
 * Fund test users from resolver account
 */
const { SuiClient } = require('@mysten/sui/client');
const { Transaction } = require('@mysten/sui/transactions');
const { decodeSuiPrivateKey } = require('@mysten/sui/cryptography');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
require('dotenv').config();

const AMOUNT = 100_000_000n; // 0.1 SUI per user

async function fundUsers(addresses) {
  const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
  
  // Load resolver keypair
  const resolverKey = process.env.RESOLVER_PRIVATE_KEY;
  if (!resolverKey) throw new Error('RESOLVER_PRIVATE_KEY not set');
  
  let keypair;
  if (resolverKey.startsWith('suiprivkey')) {
    const decoded = decodeSuiPrivateKey(resolverKey);
    keypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
  } else {
    keypair = Ed25519Keypair.fromSecretKey(Buffer.from(resolverKey, 'base64'));
  }
  
  const resolverAddress = keypair.getPublicKey().toSuiAddress();
  console.log(`💰 Funding from resolver: ${resolverAddress.slice(0, 10)}...`);
  
  for (const addr of addresses) {
    try {
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [AMOUNT]);
      tx.transferObjects([coin], addr);
      
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: { showEffects: true },
      });
      
      if (result.effects?.status?.status === 'success') {
        console.log(`   ✅ ${addr.slice(0, 10)}... funded with 0.1 SUI`);
      } else {
        console.log(`   ❌ ${addr.slice(0, 10)}... failed: ${result.effects?.status?.error}`);
      }
    } catch (error) {
      console.log(`   ❌ ${addr.slice(0, 10)}... error: ${error.message}`);
    }
  }
}

// Read addresses from command line or stdin
const addresses = process.argv.slice(2);
if (addresses.length === 0) {
  console.error('Usage: node fund-users.cjs <address1> <address2> ...');
  process.exit(1);
}

fundUsers(addresses).catch(console.error);
