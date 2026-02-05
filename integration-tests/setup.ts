/**
 * Test Environment Setup for Yoshino Integration Tests
 * Manages testnet connection, test users, and contract addresses
 */

import { config } from 'dotenv';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

// Load environment variables from .env file
config();

/**
 * Configuration for deployed contracts
 * These should be set after running deploy-local.sh
 */
export interface DeployedContracts {
  packageId: string;
  vaultBaseId: string;
  vaultQuoteId: string;
  balanceManagerId: string;
  solverCapId: string;
  solverAdminId: string;
  deepBookPoolId: string;
}

/**
 * TestEnvironment manages the integration test setup
 */
export class TestEnvironment {
  client: SuiClient;
  users: Map<string, Ed25519Keypair>;
  contracts: DeployedContracts | null = null;
  
  constructor(rpcUrl: string = 'https://fullnode.testnet.sui.io:443') {
    this.client = new SuiClient({ url: rpcUrl });
    this.users = new Map();
    console.log(`🔗 Connected to Sui testnet: ${rpcUrl}`);
  }
  
  /**
   * Setup test environment with users and contracts
   */
  async setup(): Promise<void> {
    console.log('\n🚀 Setting up test environment...\n');
    
    // Create test users
    await this.createTestUsers();
    
    // Load deployed contract addresses
    await this.loadContracts();
    
    console.log('\n✅ Test environment ready!\n');
  }
  
  /**
   * Create and fund test user accounts
   */
  private async createTestUsers(): Promise<void> {
    const userNames = ['alice', 'bob', 'charlie', 'dave', 'eve'];
    
    // Use deterministic private keys so addresses are consistent across test runs
    // These are test-only keys (32-byte seeds derived from hashing user names)
    const { createHash } = await import('crypto');
    
    console.log('👥 Creating test users...');
    
    for (const name of userNames) {
      // Generate deterministic private key from name
      const hash = createHash('sha256').update(`yoshino-test-${name}-v1`).digest();
      const keypair = Ed25519Keypair.fromSecretKey(hash);
      const address = keypair.getPublicKey().toSuiAddress();
      
      this.users.set(name, keypair);
      
      // Fund account from resolver if needed
      try {
        await this.fundAccount(keypair);
        console.log(`  ✅ ${name.padEnd(8)} ${address}`);
      } catch (error) {
        console.error(`  ❌ ${name} funding failed:`, error);
      }
    }
  }
  
  /**
   * Request SUI from resolver account (for testnet)
   */
  private async fundAccount(keypair: Ed25519Keypair): Promise<void> {
    const address = keypair.getPublicKey().toSuiAddress();
    
    // Check if user already has funds
    const coins = await this.client.getCoins({ owner: address, coinType: '0x2::sui::SUI' });
    const balance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    
    if (balance >= 50_000_000n) {
      // Already has at least 0.05 SUI
      return;
    }
    
    // Fund from resolver account if RESOLVER_PRIVATE_KEY is set
    const resolverKey = process.env.RESOLVER_PRIVATE_KEY;
    if (!resolverKey) {
      console.log(`  ℹ️  ${address.slice(0, 10)}... (please fund manually)`);
      return;
    }
    
    try {
      const { decodeSuiPrivateKey } = await import('@mysten/sui/cryptography');
      let resolverKeypair: Ed25519Keypair;
      
      if (resolverKey.startsWith('suiprivkey')) {
        const decoded = decodeSuiPrivateKey(resolverKey);
        resolverKeypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
      } else {
        resolverKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(resolverKey, 'base64'));
      }
      
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [100_000_000n]); // 0.1 SUI
      tx.transferObjects([coin], address);
      
      await this.client.signAndExecuteTransaction({
        transaction: tx,
        signer: resolverKeypair,
        options: { showEffects: true },
      });
      
    } catch (error: any) {
      console.log(`  ⚠️  ${address.slice(0, 10)}... funding failed: ${error.message}`);
    }
  }
  
  /**
   * Load deployed contract addresses from environment or config file
   */
  private async loadContracts(): Promise<void> {
    console.log('\n📦 Loading contract addresses...');
    
    // Try to load from environment variables (supporting both naming conventions)
    const packageId = process.env.PACKAGE_ID || process.env.YOSHINO_PACKAGE_ID;
    
    if (packageId) {
      this.contracts = {
        packageId,
        vaultBaseId: process.env.VAULT_BASE_ID || '',
        vaultQuoteId: process.env.VAULT_QUOTE_ID || '',
        balanceManagerId: process.env.BALANCE_MANAGER_ID || '',
        solverCapId: process.env.SOLVER_CAP_ID || '',
        solverAdminId: process.env.SOLVER_ADMIN_ID || '',
        deepBookPoolId: process.env.DEEPBOOK_POOL_ID || '',
      };
      
      console.log(`  ✅ Package ID: ${this.contracts.packageId}`);
      console.log(`  ✅ Yoshino State: ${process.env.YOSHINO_STATE_ID || 'N/A'}`);
      console.log(`  ✅ SolverCap: ${this.contracts.solverCapId}`);
    } else {
      console.log('  ⚠️  No contract addresses found');
      console.log('  ℹ️  Set PACKAGE_ID environment variable');
      this.contracts = null;
    }
  }
  
  /**
   * Get keypair for named test user
   */
  getUser(name: string): Ed25519Keypair {
    const keypair = this.users.get(name);
    if (!keypair) {
      throw new Error(`User '${name}' not found. Available: ${Array.from(this.users.keys()).join(', ')}`);
    }
    return keypair;
  }
  
  /**
   * Get address for named test user
   */
  getUserAddress(name: string): string {
    return this.getUser(name).getPublicKey().toSuiAddress();
  }
  
  /**
   * Get all test user addresses
   */
  getAllUsers(): string[] {
    return Array.from(this.users.keys());
  }
  
  /**
   * Get contract addresses (throws if not loaded)
   */
  getContracts(): DeployedContracts {
    if (!this.contracts) {
      throw new Error('Contracts not loaded. Run deploy-local.sh and set environment variables.');
    }
    return this.contracts;
  }
  
  /**
   * Check if contracts are deployed
   */
  hasContracts(): boolean {
    return this.contracts !== null;
  }
  
  /**
   * Get user's SUI balance
   */
  async getBalance(address: string): Promise<bigint> {
    const balance = await this.client.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI',
    });
    return BigInt(balance.totalBalance);
  }
  
  /**
   * Get all user balances
   */
  async getAllBalances(): Promise<Map<string, bigint>> {
    const balances = new Map<string, bigint>();
    
    for (const [name, keypair] of this.users) {
      const address = keypair.getPublicKey().toSuiAddress();
      const balance = await this.getBalance(address);
      balances.set(name, balance);
    }
    
    return balances;
  }
  
  /**
   * Execute transaction and wait for confirmation
   */
  async signAndExecute(
    tx: Transaction,
    signer: Ed25519Keypair,
    options?: { showEffects?: boolean; showEvents?: boolean }
  ) {
    const result = await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer,
      options: {
        showEffects: options?.showEffects ?? true,
        showEvents: options?.showEvents ?? true,
        showObjectChanges: true,
      },
    });
    
    if (result.effects?.status.status !== 'success') {
      throw new Error(`Transaction failed: ${result.effects?.status.error}`);
    }
    
    return result;
  }
  
  /**
   * Wait for specified milliseconds
   */
  async wait(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test environment...');
    // Any cleanup logic here
    console.log('✅ Cleanup complete');
  }
}

/**
 * Create and setup test environment
 */
export async function setupTestEnvironment(): Promise<TestEnvironment> {
  const env = new TestEnvironment();
  await env.setup();
  return env;
}
