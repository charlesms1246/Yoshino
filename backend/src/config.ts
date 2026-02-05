import { config } from 'dotenv';

config();

export const CONFIG = {
  sui: {
    network: process.env.SUI_NETWORK as 'localnet' | 'testnet' | 'mainnet',
    rpcUrl: process.env.SUI_RPC_URL!,
    packageId: process.env.VAULT_BASE_PACKAGE_ID!,
    solverCapId: process.env.SOLVER_CAP_OBJECT_ID!,
    balanceManagerId: process.env.BALANCE_MANAGER_ID!,
  },
  resolver: {
    privateKey: process.env.RESOLVER_PRIVATE_KEY!,
    port: parseInt(process.env.PORT || '3000'),
  },
  seal: {
    networkUrl: process.env.SEAL_NETWORK_URL!,
  },
} as const;

// Validate configuration
export function validateConfig() {
  const required = [
    'SUI_RPC_URL',
    'VAULT_BASE_PACKAGE_ID',
    'SOLVER_CAP_OBJECT_ID',
    'RESOLVER_PRIVATE_KEY',
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
  
  console.log('✅ Configuration validated');
}
