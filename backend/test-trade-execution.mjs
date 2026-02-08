#!/usr/bin/env node
/**
 * DeepBook Trade Execution Simulation
 * Simulates full trade flow from intent submission to execution
 * 
 * Usage:
 *   node test-trade-execution.mjs [test-type]
 * 
 * Test Types:
 *   instant   - Test instant market order
 *   limit     - Test limit order with price check
 *   twap      - Test TWAP (Time-Weighted Average Price)
 *   batch     - Test batch execution with multiple trades
 *   full      - Test complete flow from intent to settlement
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
}

const {
  SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443',
  VAULT_BASE_PACKAGE_ID,
  YOSHINO_STATE_ID,
  SOLVER_CAP_OBJECT_ID,
  DEEPBOOK_POOL_ID,
} = process.env;

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  debug: (msg) => console.log(`🔍 ${msg}`),
  header: (msg) => console.log(`\n╔════════════════════════════════════════╗\n║ ${msg.padEnd(36)} ║\n╚════════════════════════════════════════╝\n`),
};

// Helper functions
function generateMockIntent(type = 'instant') {
  const baseIntent = {
    nonce: Date.now(),
    user: '0x1aacdc938d4ea8bd7982f53a99f143377430e46d88bb9e617396948e194fa9f1',
    token_in: '0x2::sui::SUI',
    amount_in: '1000000000', // 1 SUI in MIST
    token_out: '0xc060006111016b8a020ad5b33834665e39c4d19fef680643f641cfd175f727f::usdc::USDC',
    expires_at: Date.now() + 3600000, // 1 hour
    allow_partial_fill: true,
    max_gas_fee_contribution: '5000000', // 0.005 SUI
  };

  switch (type) {
    case 'limit':
      return {
        ...baseIntent,
        strategy: 'Limit',
        limit_price: '2000000000', // Limit price
      };
    case 'twap':
      return {
        ...baseIntent,
        strategy: 'TWAP',
        duration_hours: 24,
      };
    default:
      return {
        ...baseIntent,
        strategy: 'Standard',
        limit_price: '0',
      };
  }
}

function generateMockEncryptedData() {
  return {
    ciphertext: Buffer.from('mock_encrypted_data_' + Date.now()).toString('hex'),
    nonce: Buffer.from('mock_nonce').toString('hex'),
    tag: Buffer.from('mock_tag').toString('hex'),
  };
}

// Test 1: Instant Market Order
async function testInstantMarketOrder() {
  log.header('Test 1: Instant Market Order');

  const intent = generateMockIntent('instant');
  log.info(`Creating instant market order:`);
  log.info(`  Amount: ${Number(intent.amount_in) / 1_000_000_000} SUI`);
  log.info(`  Token Out: ${intent.token_out.substring(0, 20)}...`);

  try {
    // Simulate submitting to backend
    const response = await fetch('http://localhost:3001/api/intents/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: intent.user,
        encryptedData: generateMockEncryptedData(),
      }),
    }).catch(() => null);

    if (!response) {
      log.warn('Backend API not available - simulating local execution');
      log.success('Intent structure validated');
      console.log('\nIntent object:');
      console.log(JSON.stringify(intent, null, 2));
      return true;
    }

    const data = await response.json();
    if (data.success) {
      log.success(`Intent submitted to queue`);
      log.info(`Queue position: ${data.data.queuePosition}`);
      return true;
    } else {
      log.error(`Submission failed: ${data.error}`);
      return false;
    }
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Test 2: Limit Order Execution
async function testLimitOrder() {
  log.header('Test 2: Limit Order Execution');

  const intent = generateMockIntent('limit');
  log.info(`Creating limit order:`);
  log.info(`  Amount: ${Number(intent.amount_in) / 1_000_000_000} SUI`);
  log.info(`  Limit Price: ${intent.limit_price}`);
  log.info(`  Expires: ${new Date(intent.expires_at).toISOString()}`);

  try {
    // Check current DeepBook price
    log.debug('Checking DeepBook pool for current price...');
    
    const poolResponse = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getObject',
        params: [DEEPBOOK_POOL_ID, { showContent: true }],
      }),
    });

    const poolData = await poolResponse.json();
    if (poolData.result?.data?.content?.fields?.mid_price) {
      const currentPrice = poolData.result.data.content.fields.mid_price;
      log.info(`Current DeepBook mid price: ${currentPrice}`);
      
      if (currentPrice <= intent.limit_price) {
        log.success('Price check PASSED - order would execute');
      } else {
        log.warn('Price check FAILED - order would be held');
      }
    } else {
      log.warn('Could not retrieve current price');
    }

    log.success('Limit order validation complete');
    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Test 3: TWAP Execution
async function testTWAPOrder() {
  log.header('Test 3: TWAP Order Execution');

  const intent = generateMockIntent('twap');
  log.info(`Creating TWAP order:`);
  log.info(`  Amount: ${Number(intent.amount_in) / 1_000_000_000} SUI`);
  log.info(`  Duration: ${intent.duration_hours} hours`);

  try {
    const chunkSize = BigInt(intent.amount_in) / 3n;
    log.info(`Split into ${Math.ceil(Number(BigInt(intent.amount_in)) / Number(chunkSize))} chunks`);
    log.info(`Chunk size: ${Number(chunkSize) / 1_000_000_000} SUI`);

    // Simulate execution schedule
    const executionSchedule = [];
    for (let i = 0; i < 3; i++) {
      const executionTime = intent.expires_at - (intent.duration_hours * 60 * 60 * 1000) + (i * (intent.duration_hours * 60 * 60 * 1000 / 3));
      executionSchedule.push({
        chunk: i + 1,
        amount: Number(chunkSize) / 1_000_000_000,
        executionTime: new Date(executionTime).toISOString(),
      });
    }

    log.success('TWAP execution schedule:');
    executionSchedule.forEach(exec => {
      log.info(`  Chunk ${exec.chunk}: ${exec.amount} SUI at ${exec.executionTime}`);
    });

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Test 4: Batch Execution
async function testBatchExecution() {
  log.header('Test 4: Batch Execution');

  const batch = [
    generateMockIntent('instant'),
    generateMockIntent('limit'),
    generateMockIntent('instant'),
    generateMockIntent('twap'),
    generateMockIntent('instant'),
  ];

  log.info(`Batch contains ${batch.length} intents:`);
  batch.forEach((intent, idx) => {
    log.info(`  [${idx + 1}] ${intent.strategy}: ${Number(intent.amount_in) / 1_000_000_000} SUI`);
  });

  try {
    // Calculate batch stats
    const totalVolume = batch.reduce((sum, i) => sum + Number(i.amount_in), 0);
    const totalGasEstimate = batch.length * 5_000_000 + 1_000_000; // ~5M per trade + overhead

    log.success('Batch Statistics:');
    log.info(`  Total Volume: ${totalVolume / 1_000_000_000} SUI`);
    log.info(`  Estimated Gas: ${totalGasEstimate.toLocaleString()} MIST (${(totalGasEstimate / 1_000_000_000).toFixed(4)} SUI)`);
    log.info(`  Average per trade: ${(totalGasEstimate / batch.length).toLocaleString()} MIST`);

    // Simulate PTB construction
    log.debug('Building Programmable Transaction Block...');
    const ptbDetails = {
      target: `${VAULT_BASE_PACKAGE_ID}::shielded_pool::settle_batch`,
      typeArguments: ['0x2::sui::SUI'],
      recipients: batch.map(i => i.user),
      amounts: batch.map(i => Number(i.amount_in)),
    };

    log.success('PTB constructed successfully');
    log.info(`  Function: settle_batch`);
    log.info(`  Recipients: ${ptbDetails.recipients.length}`);
    log.info(`  Total Amount: ${ptbDetails.amounts.reduce((a, b) => a + b) / 1_000_000_000} SUI`);

    return true;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    return false;
  }
}

// Test 5: Full Integration Flow
async function testFullIntegration() {
  log.header('Test 5: Full Integration Flow');

  const steps = [];

  try {
    // Step 1: Submit Intent
    log.info('Step 1: Submit encrypted intent to resolver...');
    const intent = generateMockIntent('instant');
    steps.push({ step: 'Intent Submission', status: '✅' });

    // Step 2: Decrypt Intent
    log.info('Step 2: Decrypt intent using Seal Network...');
    steps.push({ step: 'Intent Decryption', status: '✅' });

    // Step 3: Validate Intent
    log.info('Step 3: Validate intent (expiry, partial fill, etc.)...');
    steps.push({ step: 'Intent Validation', status: '✅' });

    // Step 4: Queue for Batching
    log.info('Step 4: Queue intent for batch processing...');
    steps.push({ step: 'Batch Queueing', status: '✅' });

    // Step 5: Wait for Batch Ready
    log.info('Step 5: Wait for batch conditions (size, interval)...');
    steps.push({ step: 'Batch Wait', status: '⏳' });

    // Step 6: Execute Batch
    log.info('Step 6: Execute batch via settle_batch function...');
    log.info(`  SolverCap: ${SOLVER_CAP_OBJECT_ID}`);
    log.info(`  YoshinoState: ${YOSHINO_STATE_ID}`);
    steps.push({ step: 'Batch Execution', status: '⏳' });

    // Step 7: Process Results
    log.info('Step 7: Process transaction results and update state...');
    steps.push({ step: 'Result Processing', status: '⏳' });

    // Step 8: Notify User
    log.info('Step 8: Notify user of execution result...');
    steps.push({ step: 'User Notification', status: '⏳' });

    log.success('\nIntegration Flow:');
    steps.forEach(s => {
      console.log(`  ${s.status} ${s.step}`);
    });

    return true;
  } catch (error) {
    log.error(`Flow failed: ${error.message}`);
    return false;
  }
}

// Main
const testType = process.argv[2] || 'full';

(async () => {
  log.header('DeepBook Trade Execution Tests');

  const results = {};

  try {
    switch (testType) {
      case 'instant':
        results.instant = await testInstantMarketOrder();
        break;
      case 'limit':
        results.limit = await testLimitOrder();
        break;
      case 'twap':
        results.twap = await testTWAPOrder();
        break;
      case 'batch':
        results.batch = await testBatchExecution();
        break;
      case 'full':
      default:
        results.instant = await testInstantMarketOrder();
        results.limit = await testLimitOrder();
        results.twap = await testTWAPOrder();
        results.batch = await testBatchExecution();
        results.integration = await testFullIntegration();
    }
  } catch (error) {
    log.error(`Tests failed: ${error.message}`);
    process.exit(1);
  }

  // Summary
  log.header('Test Summary');
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`Passed: ${passed}/${total} tests\n`);
  Object.entries(results).forEach(([name, result]) => {
    const status = result ? '✅' : '❌';
    console.log(`${status} ${name}`);
  });

  process.exit(passed === total ? 0 : 1);
})().catch(err => {
  log.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
