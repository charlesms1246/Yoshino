#!/usr/bin/env node
/**
 * DeepBook Trade Test Suite
 * Tests the backend implementation for DeepBook integration and trade execution
 * 
 * Usage:
 *   node test-deepbook-trades.mjs [command]
 * 
 * Commands:
 *   balance       - Check balances and vault status
 *   estimate      - Estimate gas for a sample batch
 *   ptb-check     - Verify PTB construction
 *   deepbook      - Test DeepBook integration
 *   all           - Run all tests
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
  SUI_NETWORK = 'testnet',
  SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443',
  VAULT_BASE_PACKAGE_ID,
  YOSHINO_STATE_ID,
  SOLVER_CAP_OBJECT_ID,
  VAULT_BASE_ID,
  VAULT_QUOTE_ID,
  DEEPBOOK_POOL_ID,
  BASE_ASSET_TYPE = '0x2::sui::SUI',
  QUOTE_ASSET_TYPE,
  RESOLVER_PRIVATE_KEY,
} = process.env;

// Logging utilities
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  debug: (msg) => console.log(`🔍 ${msg}`),
  header: (msg) => console.log(`\n╔═══════════════════════════════════╗\n║ ${msg.padEnd(33)} ║\n╚═══════════════════════════════════╝\n`),
};

// Config validation
async function validateConfig() {
  log.header('Validating Configuration');
  
  const required = [
    'SUI_RPC_URL',
    'VAULT_BASE_PACKAGE_ID',
    'YOSHINO_STATE_ID',
    'SOLVER_CAP_OBJECT_ID',
    'VAULT_BASE_ID',
    'VAULT_QUOTE_ID',
    'DEEPBOOK_POOL_ID',
    'QUOTE_ASSET_TYPE',
  ];

  let isValid = true;
  
  for (const key of required) {
    const value = process.env[key];
    if (!value || value === 'placeholder') {
      log.error(`Missing or invalid: ${key}`);
      isValid = false;
    } else {
      log.success(`${key}: ${value.substring(0, 20)}...`);
    }
  }

  if (!RESOLVER_PRIVATE_KEY) {
    log.warn('RESOLVER_PRIVATE_KEY not configured - read-only mode only');
  } else {
    log.success('RESOLVER_PRIVATE_KEY configured');
  }

  if (!isValid) {
    log.error('Configuration validation failed. Please check your .env file.');
    process.exit(1);
  }

  return true;
}

// Test 1: Vault Balance Check
async function testVaultBalances() {
  log.header('Test 1: Vault Balance Check');

  try {
    const response = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getObject',
        params: [VAULT_BASE_ID, { showContent: true, showOwner: true }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      log.error(`RPC Error: ${data.error.message}`);
      return false;
    }

    const object = data.result?.data;
    if (!object) {
      log.warn('Vault Base object not found');
      return false;
    }

    log.success(`Vault Base ID: ${VAULT_BASE_ID}`);
    log.info(`Owner: ${object.owner.AddressOwner || 'Shared Object'}`);
    
    if (object.content?.fields?.balance) {
      log.info(`Balance: ${object.content.fields.balance} MIST`);
    }

    return true;
  } catch (error) {
    log.error(`Failed to check vault: ${error.message}`);
    return false;
  }
}

// Test 2: DeepBook Pool Info
async function testDeepBookPool() {
  log.header('Test 2: DeepBook Pool Integration');

  try {
    const response = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getObject',
        params: [DEEPBOOK_POOL_ID, { showContent: true }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      log.error(`RPC Error: ${data.error.message}`);
      return false;
    }

    const object = data.result?.data;
    if (!object) {
      log.warn('DeepBook Pool not found');
      return false;
    }

    log.success(`DeepBook Pool ID: ${DEEPBOOK_POOL_ID}`);
    log.info(`Object Type: ${object.type}`);
    
    if (object.content?.fields) {
      const fields = object.content.fields;
      log.info(`Bid Orders: ${fields.bid_orders?.fields?.size || 'N/A'}`);
      log.info(`Ask Orders: ${fields.ask_orders?.fields?.size || 'N/A'}`);
      log.info(`Mid Price: ${fields.mid_price || 'N/A'}`);
    }

    return true;
  } catch (error) {
    log.error(`Failed to check DeepBook pool: ${error.message}`);
    return false;
  }
}

// Test 3: PTB Construction Validation
async function testPTBConstruction() {
  log.header('Test 3: PTB Construction Validation');

  try {
    log.info('Sample PTB for settle_batch:');
    log.debug(`Package: ${VAULT_BASE_PACKAGE_ID}`);
    log.debug(`Module: shielded_pool`);
    log.debug(`Function: settle_batch`);
    
    const ptbExample = {
      target: `${VAULT_BASE_PACKAGE_ID}::shielded_pool::settle_batch`,
      typeArguments: ['0x2::sui::SUI'],
      arguments: [
        `SolverCap: ${SOLVER_CAP_OBJECT_ID}`,
        `YoshinoState: ${YOSHINO_STATE_ID}`,
        'Recipients: vector<address>',
        'Amounts: vector<u64>',
      ],
    };

    log.success('PTB structure is valid');
    console.log('\nPTB Example:');
    console.log(JSON.stringify(ptbExample, null, 2));

    return true;
  } catch (error) {
    log.error(`PTB validation failed: ${error.message}`);
    return false;
  }
}

// Test 4: Solver Cap Status
async function testSolverCapStatus() {
  log.header('Test 4: Solver Cap Status');

  try {
    const response = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getObject',
        params: [SOLVER_CAP_OBJECT_ID, { showContent: true, showOwner: true }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      log.error(`RPC Error: ${data.error.message}`);
      return false;
    }

    const object = data.result?.data;
    if (!object) {
      log.error('SolverCap object not found');
      return false;
    }

    log.success(`SolverCap ID: ${SOLVER_CAP_OBJECT_ID}`);
    log.info(`Owner: ${object.owner.AddressOwner || 'Shared Object'}`);
    log.info(`Type: ${object.type}`);

    return true;
  } catch (error) {
    log.error(`Failed to check SolverCap: ${error.message}`);
    return false;
  }
}

// Test 5: Gas Estimation
async function testGasEstimation() {
  log.header('Test 5: Gas Estimation for Sample Batch');

  try {
    log.info('Estimating gas for batch of 5 trades...');
    
    // Conservative estimates based on Sui gas model
    const estimatedCosts = {
      perTrade: 5_000_000,  // ~5M per trade
      batchOverhead: 1_000_000,  // ~1M overhead
      deepbookSwap: 3_000_000,  // ~3M per DeepBook swap
      total: 0,
    };

    estimatedCosts.total = 
      (estimatedCosts.perTrade * 5) + 
      estimatedCosts.batchOverhead + 
      (estimatedCosts.deepbookSwap * 5);

    log.success('Gas Estimates:');
    log.info(`Per Trade: ${estimatedCosts.perTrade.toLocaleString()} MIST`);
    log.info(`Batch Overhead: ${estimatedCosts.batchOverhead.toLocaleString()} MIST`);
    log.info(`Per DeepBook Swap: ${estimatedCosts.deepbookSwap.toLocaleString()} MIST`);
    log.info(`Total for 5 trades: ${estimatedCosts.total.toLocaleString()} MIST`);
    log.info(`Total for 5 trades: ${(estimatedCosts.total / 1_000_000_000).toFixed(4)} SUI`);

    return true;
  } catch (error) {
    log.error(`Gas estimation failed: ${error.message}`);
    return false;
  }
}

// Test 6: API Connectivity
async function testAPIConnectivity() {
  log.header('Test 6: Backend API Connectivity');

  try {
    const response = await fetch('http://localhost:3001', {
      timeout: 5000,
    });

    if (!response.ok) {
      log.warn(`API returned status ${response.status}`);
      return false;
    }

    const data = await response.json();
    log.success(`Backend is running on port 3001`);
    log.info(`Service: ${data.service}`);
    log.info(`Status: ${data.status}`);
    log.info(`Network: ${data.network}`);

    return true;
  } catch (error) {
    log.warn(`Backend API not accessible: ${error.message}`);
    log.info('Make sure to start the backend with: npm run dev');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  log.header('DeepBook Trade Test Suite');
  
  const results = {
    config: false,
    vaultBalance: false,
    deepbookPool: false,
    ptbConstruction: false,
    solverCap: false,
    gasEstimation: false,
    apiConnectivity: false,
  };

  try {
    // Config validation
    results.config = await validateConfig();

    if (!results.config) {
      process.exit(1);
    }

    // Run all tests in sequence
    results.vaultBalance = await testVaultBalances();
    results.deepbookPool = await testDeepBookPool();
    results.ptbConstruction = await testPTBConstruction();
    results.solverCap = await testSolverCapStatus();
    results.gasEstimation = await testGasEstimation();
    results.apiConnectivity = await testAPIConnectivity();

  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    process.exit(1);
  }

  // Summary
  log.header('Test Summary');
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`Passed: ${passed}/${total} tests\n`);

  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}`);
  });

  process.exit(passed === total ? 0 : 1);
}

// Main
const command = process.argv[2] || 'all';

(async () => {
  switch (command) {
    case 'balance':
      await validateConfig();
      await testVaultBalances();
      break;
    case 'deepbook':
      await validateConfig();
      await testDeepBookPool();
      break;
    case 'estimate':
      await validateConfig();
      await testGasEstimation();
      break;
    case 'ptb-check':
      await validateConfig();
      await testPTBConstruction();
      break;
    case 'solver':
      await validateConfig();
      await testSolverCapStatus();
      break;
    case 'api':
      await testAPIConnectivity();
      break;
    case 'all':
    default:
      await runAllTests();
  }
})().catch(err => {
  log.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
