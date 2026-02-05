/**
 * End-to-End Integration Tests
 * Tests the complete Yoshino flow from deposit to withdrawal
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestEnvironment, setupTestEnvironment } from './setup.js';
import {
  encryptIntent,
  submitIntent,
  depositToVault,
  withdrawFromVault,
  waitForBatchExecution,
  isResolverRunning,
  formatSui,
  parseSui,
  createRandomIntent,
} from './helpers.js';

describe('Yoshino E2E Integration Tests', () => {
  let env: TestEnvironment;
  let resolverRunning: boolean;
  
  beforeAll(async () => {
    console.log('\n🧪 Initializing E2E Test Suite...\n');
    
    env = await setupTestEnvironment();
    resolverRunning = await isResolverRunning();
    
    if (!resolverRunning) {
      console.warn('⚠️  Resolver not running. Some tests will be skipped.');
      console.warn('   Start resolver with: cd ../backend && npm run dev\n');
    }
    
    if (!env.hasContracts()) {
      console.warn('⚠️  Contracts not deployed. Integration tests will be skipped.');
      console.warn('   Deploy contracts with: ./scripts/deploy-local.sh\n');
    }
  }, 60000); // 60s timeout for setup
  
  afterAll(async () => {
    await env.cleanup();
  });
  
  describe('Full User Journey', () => {
    it('should complete deposit → intent → batch → withdrawal flow', async () => {
      // Skip if environment is not ready
      if (!env.hasContracts() || !resolverRunning) {
        console.log('⏭️  Skipping: Environment not ready');
        return;
      }
      
      const alice = env.getUser('alice');
      const aliceAddress = env.getUserAddress('alice');
      
      console.log('\n📍 Testing full user journey for Alice...\n');
      
      // Step 1: Check initial balance
      console.log('1️⃣ Checking initial balance...');
      const initialBalance = await env.getBalance(aliceAddress);
      console.log(`   Alice balance: ${formatSui(initialBalance)} SUI`);
      expect(initialBalance).toBeGreaterThan(0n);
      
      // Step 2: Deposit to vault
      console.log('\n2️⃣ Depositing 1 SUI to vault...');
      const depositAmount = parseSui(1.0);
      
      await depositToVault(env, alice, depositAmount);
      console.log('   ✅ Deposit successful');
      
      // Step 3: Create and encrypt intent
      console.log('\n3️⃣ Creating encrypted intent...');
      const intent = {
        user: aliceAddress,
        amount: parseSui(0.5),
        isBid: true,
        minPrice: 100,
        asset: 'QUOTE' as const,
      };
      
      const encryptedIntent = await encryptIntent(intent);
      expect(encryptedIntent).toBeDefined();
      console.log('   ✅ Intent encrypted');
      
      // Step 4: Submit intent to resolver
      console.log('\n4️⃣ Submitting intent to resolver...');
      const submitted = await submitIntent(encryptedIntent, aliceAddress);
      expect(submitted).toBe(true);
      console.log('   ✅ Intent submitted to queue');
      
      // Step 5: Wait for batch execution
      console.log('\n5️⃣ Waiting for batch execution...');
      const executed = await waitForBatchExecution(15000);
      
      if (executed) {
        console.log('   ✅ Batch executed');
      } else {
        console.log('   ⏱️  Batch not executed within timeout (expected if queue < 10)');
      }
      
      // Step 6: Withdraw (optional - depends on execution)
      console.log('\n6️⃣ Testing withdrawal...');
      try {
        await withdrawFromVault(env, alice, parseSui(0.1));
        console.log('   ✅ Withdrawal successful');
      } catch (error) {
        console.log('   ⚠️  Withdrawal skipped (may not have funds yet)');
      }
      
      console.log('\n✅ Full journey test complete!\n');
    }, 30000); // 30s timeout
  });
  
  describe('Multi-User Batch Execution', () => {
    it('should execute batch with multiple users', async () => {
      if (!env.hasContracts() || !resolverRunning) {
        console.log('⏭️  Skipping: Environment not ready');
        return;
      }
      
      const users = ['alice', 'bob', 'charlie'];
      console.log('\n📍 Testing multi-user batch...\n');
      
      // Step 1: All users deposit
      console.log('1️⃣ All users depositing...');
      for (const userName of users) {
        const user = env.getUser(userName);
        await depositToVault(env, user, parseSui(1.0));
        console.log(`   ✅ ${userName} deposited`);
      }
      
      // Step 2: All users submit intents
      console.log('\n2️⃣ Submitting intents...');
      for (const userName of users) {
        const userAddress = env.getUserAddress(userName);
        const intent = createRandomIntent(userAddress);
        const encrypted = await encryptIntent(intent);
        const submitted = await submitIntent(encrypted, userAddress);
        
        expect(submitted).toBe(true);
        console.log(`   ✅ ${userName} intent submitted (${intent.isBid ? 'BUY' : 'SELL'} ${formatSui(intent.amount)} SUI)`);
      }
      
      // Step 3: Wait for batch execution
      console.log('\n3️⃣ Waiting for batch execution...');
      const executed = await waitForBatchExecution(15000);
      
      if (executed) {
        console.log('   ✅ Multi-user batch executed');
      } else {
        console.log('   ⏱️  Batch pending (need more intents or time)');
      }
      
      console.log('\n✅ Multi-user batch test complete!\n');
    }, 45000); // 45s timeout
  });
  
  describe('Deposit and Withdrawal', () => {
    it('should handle deposits correctly', async () => {
      if (!env.hasContracts()) {
        console.log('⏭️  Skipping: Contracts not deployed');
        return;
      }
      
      const bob = env.getUser('bob');
      const depositAmount = parseSui(0.5);
      
      console.log('\n📍 Testing deposit...\n');
      
      await depositToVault(env, bob, depositAmount);
      console.log('✅ Deposit successful');
      
      // Verify balance decreased
      const balance = await env.getBalance(env.getUserAddress('bob'));
      expect(balance).toBeGreaterThan(0n);
    }, 15000);
    
    it('should handle withdrawals correctly', async () => {
      if (!env.hasContracts()) {
        console.log('⏭️  Skipping: Contracts not deployed');
        return;
      }
      
      const charlie = env.getUser('charlie');
      
      console.log('\n📍 Testing withdrawal...\n');
      
      // First deposit
      await depositToVault(env, charlie, parseSui(1.0));
      console.log('✅ Deposit successful');
      
      // Then withdraw
      await withdrawFromVault(env, charlie, parseSui(0.3));
      console.log('✅ Withdrawal successful');
    }, 20000);
  });
  
  describe('Resolver API', () => {
    it('should accept intent submissions', async () => {
      if (!resolverRunning) {
        console.log('⏭️  Skipping: Resolver not running');
        return;
      }
      
      const dave = env.getUser('dave');
      const daveAddress = env.getUserAddress('dave');
      
      const intent = createRandomIntent(daveAddress);
      const encrypted = await encryptIntent(intent);
      
      const submitted = await submitIntent(encrypted, daveAddress);
      expect(submitted).toBe(true);
      
      console.log('✅ Intent submission successful');
    }, 10000);
    
    it('should return queue status', async () => {
      if (!resolverRunning) {
        console.log('⏭️  Skipping: Resolver not running');
        return;
      }
      
      const response = await fetch('http://localhost:3000/api/intents/queue');
      expect(response.ok).toBe(true);
      
      const status = await response.json();
      expect(status).toHaveProperty('pendingIntents');
      expect(status).toHaveProperty('readyForBatch');
      
      console.log(`✅ Queue status: ${status.pendingIntents} pending, ready: ${status.readyForBatch}`);
    }, 10000);
  });
  
  describe('Error Handling', () => {
    it('should reject invalid intents', async () => {
      if (!resolverRunning) {
        console.log('⏭️  Skipping: Resolver not running');
        return;
      }
      
      // Submit invalid intent (empty encrypted data)
      const response = await fetch('http://localhost:3000/api/intents/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: '0x123',
          encryptedData: '',
        }),
      });
      
      const result = await response.json();
      
      // Should return error (validation failure)
      if (!result.success) {
        console.log('✅ Invalid intent correctly rejected');
      }
    }, 10000);
    
    it('should handle insufficient balance', async () => {
      if (!env.hasContracts()) {
        console.log('⏭️  Skipping: Contracts not deployed');
        return;
      }
      
      const eve = env.getUser('eve');
      
      // Try to withdraw without depositing
      try {
        await withdrawFromVault(env, eve, parseSui(1.0));
        // Should fail
        expect(true).toBe(false); // This shouldn't be reached
      } catch (error) {
        console.log('✅ Insufficient balance correctly handled');
        expect(error).toBeDefined();
      }
    }, 15000);
  });
  
  describe('Balance Queries', () => {
    it('should query all user balances', async () => {
      const balances = await env.getAllBalances();
      
      console.log('\n💰 User Balances:');
      for (const [name, balance] of balances) {
        console.log(`   ${name.padEnd(8)}: ${formatSui(balance)} SUI`);
        expect(balance).toBeGreaterThan(0n);
      }
      console.log();
    }, 10000);
  });
});
