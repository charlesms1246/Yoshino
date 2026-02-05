/**
 * Fund test users from deployer account
 */
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { config } from 'dotenv';

config();

const RPC_URL = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.RESOLVER_PRIVATE_KEY;

if (!DEPLOYER_KEY) {
  console.error('❌ DEPLOYER_PRIVATE_KEY or RESOLVER_PRIVATE_KEY must be set in .env');
  process.exit(1);
}

async function main() {
  const client = new SuiClient({ url: RPC_URL });
  
  // Load deployer keypair
  let deployer: Ed25519Keypair;
  if (DEPLOYER_KEY.startsWith('suiprivkey')) {
    deployer = Ed25519Keypair.fromSecretKey(DEPLOYER_KEY);
  } else {
    deployer = Ed25519Keypair.fromSecretKey(Buffer.from(DEPLOYER_KEY, 'base64'));
  }
  
  const deployerAddress = deployer.getPublicKey().toSuiAddress();
  console.log(`🔑 Deployer: ${deployerAddress}`);
  
  // Check deployer balance
  const balance = await client.getBalance({ owner: deployerAddress });
  const suiBalance = Number(balance.totalBalance) / 1_000_000_000;
  console.log(`💰 Balance: ${suiBalance.toFixed(4)} SUI\n`);
  
  if (suiBalance < 0.5) {
    console.error('❌ Insufficient balance to fund test users (need at least 0.5 SUI)');
    process.exit(1);
  }
  
  // Test user addresses from the test run logs
  const testUsers = [
    { name: 'alice', address: '0x6678683bb82e1579e309df2547eaf758cd618bffd986870d5377009cadb03f6c' },
    { name: 'bob', address: '0xadf50434b82307358aa65db69cc0c2cb295bbebc4b796b660e7d6bf920383eac' },
    { name: 'charlie', address: '0x2e4826094fab12dd77dea53a34b7fc1fff59305d56bd82b873fa6910d158e400' },
  ];
  
  console.log('💸 Funding test users...\n');
  
  for (const user of testUsers) {
    try {
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [0.1 * 1_000_000_000]); // 0.1 SUI
      tx.transferObjects([coin], user.address);
      
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: deployer,
        options: {
          showEffects: true,
        },
      });
      
      if (result.effects?.status.status === 'success') {
        console.log(`✅ ${user.name.padEnd(8)} funded: ${user.address.slice(0, 10)}...`);
      } else {
        console.log(`❌ ${user.name.padEnd(8)} failed: ${result.effects?.status.error}`);
      }
    } catch (error: any) {
      console.log(`❌ ${user.name.padEnd(8)} error: ${error.message}`);
    }
  }
  
  console.log('\n✅ Funding complete!');
}

main().catch(console.error);
