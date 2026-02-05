/**
 * Test Environment Setup for Yoshino Integration Tests
 * Manages localnet connection, test users, and funding
 */

import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';

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
  
  constructor(rpcUrl: string = 'http://127.0.0.1:9000') {
    this.client = new SuiClient({ url: rpcUrl });
    this.users = new Map();
    console.log(`🔗 Connected to Sui localnet: ${rpcUrl}`);
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
    
    console.log('👥 Creating test users...');
    
    for (const name of userNames) {
      // Generate keypair
      const keypair = new Ed25519Keypair();
      const address = keypair.getPublicKey().toSuiAddress();
      
      this.users.set(name, keypair);
      
      // Fund account from localnet faucet
      try {
        await this.fundAccount(keypair);
        console.log(`  ✅ ${name.padEnd(8)} ${address}`);
      } catch (error) {
        console.error(`  ❌ ${name} funding failed:`, error);
      }
    }
  }
  
  /**
   * Request SUI from localnet faucet
   */
  private async fundAccount(keypair: Ed25519Keypair): Promise<void> {
    const address = keypair.getPublicKey().toSuiAddress();
    
    try {
      await this.client.requestSuiFromFaucet(address);
      
      // Wait a bit for transaction to finalize
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      throw new Error(`Failed to fund account ${address}: ${error}`);
    }
  }
  
  /**
   * Load deployed contract addresses from environment or config file
   */
  private async loadContracts(): Promise<void> {
    console.log('\n📦 Loading contract addresses...');
    
    // Try to load from environment variables
    if (process.env.YOSHINO_PACKAGE_ID) {
      this.contracts = {
        packageId: process.env.YOSHINO_PACKAGE_ID,
        vaultBaseId: process.env.VAULT_BASE_ID || '',
        vaultQuoteId: process.env.VAULT_QUOTE_ID || '',
        balanceManagerId: process.env.BALANCE_MANAGER_ID || '',
        solverCapId: process.env.SOLVER_CAP_ID || '',
        solverAdminId: process.env.SOLVER_ADMIN_ID || '',
        deepBookPoolId: process.env.DEEPBOOK_POOL_ID || '',
      };
      
      console.log(`  ✅ Package ID: ${this.contracts.packageId}`);
      console.log(`  ✅ Vault Base: ${this.contracts.vaultBaseId}`);
      console.log(`  ✅ Vault Quote: ${this.contracts.vaultQuoteId}`);
      console.log(`  ✅ SolverCap: ${this.contracts.solverCapId}`);
    } else {
      console.log('  ⚠️  No contract addresses found');
      console.log('  ℹ️  Run deploy-local.sh first and set environment variables');
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
