import { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { CONFIG } from '../config.js';

export class YoshinoSuiClient {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  
  constructor() {
    this.client = new SuiClient({ url: CONFIG.sui.rpcUrl });
    this.keypair = Ed25519Keypair.fromSecretKey(
      Buffer.from(CONFIG.resolver.privateKey, 'base64')
    );
  }
  
  getClient(): SuiClient {
    return this.client;
  }
  
  getAddress(): string {
    return this.keypair.getPublicKey().toSuiAddress();
  }
  
  async signAndExecute(tx: Transaction): Promise<SuiTransactionBlockResponse> {
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
