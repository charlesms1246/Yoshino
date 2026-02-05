import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { CONFIG } from '../config.js';

export class YoshinoSuiClient {
  private client: SuiClient;
  private keypair: Ed25519Keypair | null;
  
  constructor() {
    this.client = new SuiClient({ url: CONFIG.sui.rpcUrl });
    
    // Initialize keypair if private key is provided
    try {
      if (CONFIG.resolver.privateKey) {
        // Handle both base64 and Sui private key formats
        if (CONFIG.resolver.privateKey.startsWith('suiprivkey')) {
          // Sui private key format (from sui keytool)
          this.keypair = Ed25519Keypair.fromSecretKey(CONFIG.resolver.privateKey);
        } else {
          // Base64 format
          this.keypair = Ed25519Keypair.fromSecretKey(
            Buffer.from(CONFIG.resolver.privateKey, 'base64')
          );
        }
      } else {
        console.warn('⚠️  No RESOLVER_PRIVATE_KEY configured - resolver operations will be disabled');
        this.keypair = null;
      }
    } catch (error) {
      console.warn('⚠️  Invalid RESOLVER_PRIVATE_KEY - resolver operations will be disabled');
      console.warn('   Error:', error);
      this.keypair = null;
    }
  }
  
  getClient(): SuiClient {
    return this.client;
  }
  
  getAddress(): string {
    if (!this.keypair) {
      return 'NO_RESOLVER_KEY_CONFIGURED';
    }
    return this.keypair.getPublicKey().toSuiAddress();
  }
  
  async signAndExecute(tx: Transaction): Promise<SuiTransactionBlockResponse> {
    if (!this.keypair) {
      throw new Error('Cannot execute transaction: No resolver private key configured');
    }
    
    const result = await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.keypair,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
    
    if (result.effects?.status.status !== 'success') {
      throw new Error(`Transaction failed: ${result.effects?.status.error}`);
    }
    
    return result;
  }

  /**
   * Sign and execute transaction (alias for compatibility)
   */
  async signAndExecuteTransaction(tx: Transaction): Promise<SuiTransactionBlockResponse> {
    return this.signAndExecute(tx);
  }

  /**
   * Dry run transaction to estimate gas or validate
   */
  async dryRunTransaction(tx: Transaction) {
    return this.client.dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: this.client }),
    });
  }
  
  async getObject(objectId: string) {
    return this.client.getObject({
      id: objectId,
      options: { showContent: true, showOwner: true },
    });
  }
  
  async getSolverCap() {
    return this.getObject(CONFIG.sui.solverCapId);
  }
}

// Singleton instance
export const suiClient = new YoshinoSuiClient();
