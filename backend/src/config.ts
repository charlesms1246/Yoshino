import { config } from 'dotenv';

config();

export const CONFIG = {
  sui: {
    network: process.env.SUI_NETWORK as 'localnet' | 'testnet' | 'mainnet',
    rpcUrl: process.env.SUI_RPC_URL!,
    packageId: process.env.VAULT_BASE_PACKAGE_ID!,
    stateId: process.env.YOSHINO_STATE_ID!,
    solverCapId: process.env.SOLVER_CAP_OBJECT_ID!,
    balanceManagerId: process.env.BALANCE_MANAGER_ID!,
    vaultBaseId: process.env.VAULT_BASE_ID!,
    vaultQuoteId: process.env.VAULT_QUOTE_ID!,
    deepBookPoolId: process.env.DEEPBOOK_POOL_ID!,
    baseAssetType: process.env.BASE_ASSET_TYPE || '0x2::sui::SUI',
    quoteAssetType: process.env.QUOTE_ASSET_TYPE!,
  },
  resolver: {
    privateKey: process.env.RESOLVER_PRIVATE_KEY || '',
    port: parseInt(process.env.PORT || '3001', 10),
  },
  seal: {
    networkUrl: process.env.SEAL_NETWORK_URL!,
  },
  batch: {
    size: parseInt(process.env.BATCH_SIZE || '10'),
    intervalMs: parseInt(process.env.BATCH_INTERVAL_MS || '5000'),
  },
} as const;

// Validate configuration
export function validateConfig() {
  const required = [
    'SUI_RPC_URL',
    'VAULT_BASE_PACKAGE_ID',
    'SOLVER_CAP_OBJECT_ID',
    'VAULT_BASE_ID',
    'VAULT_QUOTE_ID',
    'DEEPBOOK_POOL_ID',
    'QUOTE_ASSET_TYPE',
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      console.warn(`⚠️  Missing env var: ${key} - using placeholder value`);
    }
  }
  
  console.log('✅ Configuration loaded (some values may be placeholders)');
}
