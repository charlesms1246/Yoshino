import { CONFIG } from '../config.js';
import { suiClient } from '../sui/client.js';

export interface SealDecryptionRequest {
  encryptedData: string;
  policyModule: string;
  policyFunction: string;
}

export interface SealDecryptionResult {
  decryptedData: string;
  timestamp: number;
}

export class SealClient {
  private networkUrl: string;
  
  constructor() {
    this.networkUrl = CONFIG.seal.networkUrl;
  }
  
  /**
   * Decrypt user intent by proving SolverCap ownership
   */
  async decryptIntent(request: SealDecryptionRequest): Promise<SealDecryptionResult> {
    try {
      // Build proof of SolverCap ownership
      const proof = await this.buildSolverCapProof();
      
      // Request decryption from Seal Network
      const response = await fetch(`${this.networkUrl}/decrypt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedData: request.encryptedData,
          policy: {
            module: request.policyModule,
            function: request.policyFunction,
          },
          proof,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Seal decryption failed: ${response.statusText}`);
      }
      
      const result = await response.json() as { data: string };
      
      return {
        decryptedData: result.data,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Seal decryption error:', error);
      throw new Error(`Failed to decrypt intent: ${(error as Error).message}`);
    }
  }
  
  /**
   * Build proof that we own the SolverCap
   * Seal nodes will simulate seal_approve(SolverCap) on-chain
   */
  private async buildSolverCapProof() {
    const resolverAddress = suiClient.getAddress();
    const solverCapId = CONFIG.sui.solverCapId;
    
    // Verify we actually own the SolverCap
    const solverCap = await suiClient.getSolverCap();
    
    if (!solverCap.data) {
      throw new Error('SolverCap not found');
    }
    
    // Build proof structure
    return {
      signer: resolverAddress,
      objectId: solverCapId,
      // Seal network will verify this object exists and is owned by signer
      type: 'object-ownership',
    };
  }
  
  /**
   * Decrypt multiple intents in batch
   */
  async decryptBatch(requests: SealDecryptionRequest[]): Promise<SealDecryptionResult[]> {
    const promises = requests.map(req => this.decryptIntent(req));
    return Promise.all(promises);
  }
}

// Singleton instance
export const sealClient = new SealClient();
