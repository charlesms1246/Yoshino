# Yoshino Integration Tests

Comprehensive end-to-end and performance tests for the Yoshino protocol.

## Overview

This test suite validates the complete Yoshino flow:
1. **Deposit** - Users deposit assets to vault
2. **Intent** - Users submit encrypted trading intents
3. **Batch** - Resolver aggregates and executes trades
4. **Withdrawal** - Users withdraw assets

## Prerequisites

### Required Services
- **Sui Localnet** - Running on port 9000
- **Resolver Agent** - Running on port 3000
- **Deployed Contracts** - Yoshino contracts on localnet

### Quick Start

```bash
# 1. Deploy everything
cd .. && ./scripts/deploy-local.sh

# 2. Install test dependencies
cd integration-tests
npm install

# 3. Run tests
npm test
```

## Test Suites

### E2E Tests (`e2e.test.ts`)

**Full User Journey**
- Deposit → Intent → Batch → Withdrawal flow
- Multi-user batch execution
- Deposit and withdrawal operations
- Resolver API interactions
- Error handling (invalid intents, insufficient balance)
- Balance queries

**Run:**
```bash
npm run test:e2e
```

### Performance Tests (`performance.test.ts`)

**Load Testing**
- 10 concurrent intent submissions
- 50 concurrent intent submissions
- Rapid sequential submissions

**Benchmarking**
- Intent submission rate
- Batch processing latency
- Gas cost measurement
- Throughput analysis

**Run:**
```bash
npm run test:performance
```

## Environment Setup

### Manual Setup

If `deploy-local.sh` doesn't work, set up manually:

1. **Start Localnet**
   ```bash
   sui start
   ```

2. **Deploy Contracts**
   ```bash
   cd contracts
   sui move build
   sui client publish --gas-budget 100000000
   ```

3. **Configure Environment**
   
   Create `integration-tests/.env`:
   ```bash
   YOSHINO_PACKAGE_ID=0x...
   SUI_RPC_URL=http://127.0.0.1:9000
   VAULT_BASE_ID=0x...
   VAULT_QUOTE_ID=0x...
   SOLVER_CAP_ID=0x...
   SOLVER_ADMIN_ID=0x...
   BALANCE_MANAGER_ID=0x...
   DEEPBOOK_POOL_ID=0x...
   ```

4. **Start Resolver**
   ```bash
   cd backend
   npm run dev
   ```

5. **Run Tests**
   ```bash
   cd integration-tests
   npm install
   npm test
   ```

## Test Structure

```
integration-tests/
├── setup.ts              # Test environment & user management
├── helpers.ts            # Encryption, API calls, contract helpers
├── e2e.test.ts          # End-to-end tests
├── performance.test.ts  # Performance & load tests
├── package.json         # Dependencies & scripts
├── tsconfig.json        # TypeScript config
└── .env                 # Contract addresses (generated)
```

## Test Users

The test suite creates 5 funded test accounts:
- **alice** - Primary test user
- **bob** - Secondary user
- **charlie** - Multi-user tests
- **dave** - Concurrent tests
- **eve** - Error handling tests

Each user is automatically funded from the localnet faucet.

## Test Scripts

```bash
# Run all tests
npm test

# Run specific suite
npm run test:e2e
npm run test:performance

# Watch mode (re-run on changes)
npm run test:watch

# Verbose output
npm run test:all
```

## Expected Output

### Successful Test Run

```
🧪 Initializing E2E Test Suite...
🔗 Connected to Sui localnet: http://127.0.0.1:9000

👥 Creating test users...
  ✅ alice    0xabc...
  ✅ bob      0xdef...
  ✅ charlie  0xghi...
  ✅ dave     0xjkl...
  ✅ eve      0xmno...

📦 Loading contract addresses...
  ✅ Package ID: 0x123...
  ✅ Vault Base: 0x456...
  ✅ SolverCap: 0x789...

✅ Test environment ready!

 ✓ Full User Journey > should complete deposit → intent → batch → withdrawal flow (5234ms)
 ✓ Multi-User Batch Execution > should execute batch with multiple users (8912ms)
 ✓ Deposit and Withdrawal > should handle deposits correctly (2145ms)
 ✓ Resolver API > should accept intent submissions (891ms)

Test Files  1 passed (1)
     Tests  8 passed (8)
```

### Skipped Tests

Tests are automatically skipped if:
- Localnet is not running
- Contracts are not deployed
- Resolver is not running

```
⚠️  Resolver not running. Some tests will be skipped.
   Start resolver with: cd ../backend && npm run dev

⏭️  Skipping: Environment not ready
```

## Performance Metrics

### Expected Latency
- **Intent submission:** <10ms per intent
- **Queue processing:** <1ms
- **Decryption (10 intents):** 100-150ms
- **PTB construction:** ~50ms
- **Execution:** 1-3s (Sui finality)
- **Total:** 5-10 seconds (intent → completion)

### Expected Throughput
- **Sequential submission:** ~10-20 intents/second
- **Concurrent submission:** ~50-100 intents/second
- **Batch frequency:** Every 5s or when 10 intents queued

### Expected Gas Costs
- **Single deposit:** <1M MIST (0.001 SUI)
- **Single trade:** ~8M MIST (0.008 SUI)
- **10-trade batch:** ~10M MIST (0.01 SUI)
- **Savings:** ~87% per trade via batching

## Troubleshooting

### Localnet Connection Failed

```bash
Error: connect ECONNREFUSED 127.0.0.1:9000
```

**Solution:** Start localnet
```bash
sui start
```

### Contracts Not Found

```bash
Error: Contracts not loaded
```

**Solution:** Deploy contracts and set environment variables
```bash
./scripts/deploy-local.sh
```

### Resolver Not Running

```bash
⚠️  Resolver not running
```

**Solution:** Start resolver
```bash
cd backend && npm run dev
```

### Tests Timing Out

**Possible causes:**
- Localnet slow or stuck
- Resolver queue not processing
- Network issues

**Solution:**
1. Restart localnet: `sui start`
2. Restart resolver: `cd backend && npm run dev`
3. Increase test timeouts in test files

### Faucet Failures

```bash
Error: Failed to fund account
```

**Solution:** Check localnet faucet
```bash
sui client faucet --url http://127.0.0.1:9123/gas
```

## CI/CD Integration

Tests can be integrated into CI pipelines:

```yaml
# .github/workflows/integration.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - name: Install Sui
        run: cargo install --git https://github.com/MystenLabs/sui.git sui
      - name: Deploy
        run: ./scripts/deploy-local.sh
      - name: Test
        run: cd integration-tests && npm install && npm test
```

## Contributing

When adding new tests:

1. **Use descriptive test names**
   ```typescript
   it('should handle concurrent intent submissions', async () => {
     // Test implementation
   });
   ```

2. **Add proper timeouts**
   ```typescript
   it('long running test', async () => {
     // ...
   }, 30000); // 30s timeout
   ```

3. **Skip if environment not ready**
   ```typescript
   if (!env.hasContracts()) {
     console.log('⏭️  Skipping: Contracts not deployed');
     return;
   }
   ```

4. **Log progress for debugging**
   ```typescript
   console.log('1️⃣ Depositing to vault...');
   // ... operation
   console.log('✅ Deposit successful');
   ```

## References

- [Vitest Documentation](https://vitest.dev/)
- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Yoshino Architecture](../Yoshino_IDEA.md)
- [Backend Documentation](../backend/README.md)
- [Contract Documentation](../contracts/docs/README.md)

---

**Last Updated:** February 6, 2026  
**Phase 3 Status:** ✅ COMPLETE
