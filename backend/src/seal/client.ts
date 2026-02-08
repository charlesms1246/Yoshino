import { CONFIG } from '../config.js';
import { suiClient } from '../sui/client.js';
import { SessionKey, retrieveKeyServers } from '@mysten/seal';
import { Transaction } from '@mysten/sui/transactions';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { AesGcm256 } from '@mysten/seal';
import { fromHEX } from '@mysten/bcs';

export interface SealDecryptionRequest {
  encryptedData: string;
  intentId?: string; // Optional ID if we want to track it
}

export interface SealDecryptionResult {
  decryptedData: string;
  timestamp: number;
}

export class SealClient {
  private suiClientInternal: SuiClient;
  
  constructor() {
    this.suiClientInternal = new SuiClient({ url: getFullnodeUrl('testnet') });
  }
  
  /**
   * Decrypt user intent using Sui Seal SDK
   * Note: Full decryption requires the SessionKey which requires user signature
   * For now, we'll use fallback base64 decoding until we implement full flow
   */
  async decryptIntent(request: SealDecryptionRequest): Promise<SealDecryptionResult> {
    try {
      console.log('🔓 Attempting to decrypt intent...');
      
      // Try to detect if this is base64-encoded JSON (fallback) or encrypted binary
      const encryptedData = request.encryptedData;
      
      // First, try base64 decode
      try {
        const decoded = atob(encryptedData);
        
        // Check if decoded data looks like JSON
        if (decoded.startsWith('{') || decoded.startsWith('[')) {
          // This is base64-encoded JSON (fallback mode)
          console.log('✅ Decrypted using base64 fallback (development mode)');
          return {
            decryptedData: decoded,
            timestamp: Date.now(),
          };
        } else {
          // Decoded but not JSON - this is encrypted binary data
          console.log('⚠️ Detected encrypted binary data - SessionKey decryption not implemented');
          throw new Error('Encrypted data requires SessionKey decryption (not yet implemented)');
        }
      } catch (base64Error) {
        // Not valid base64 or decoding failed
        console.log('⚠️ Not base64 data - attempting Seal decryption');
        throw new Error('Seal SDK decryption with SessionKey not yet implemented');
      }
    } catch (error) {
      console.error('Seal decryption error:', error);
      throw new Error(`Failed to decrypt intent: ${(error as Error).message}`);
    }
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
