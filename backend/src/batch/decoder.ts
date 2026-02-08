import { sealClient } from '../seal/client.js';
import { UserIntent, EncryptedIntent } from '../types.js';
import { CONFIG } from '../config.js';

export class IntentDecoder {
  /**
   * Decrypt and parse a user intent
   */
  async decryptIntent(encrypted: EncryptedIntent): Promise<UserIntent> {
    try {
      // Decrypt using Seal SDK
      const result = await sealClient.decryptIntent({
        encryptedData: encrypted.encryptedData,
        intentId: undefined, // Could extract from metadata if needed
      });
      
      // Parse decrypted JSON
      const intent = JSON.parse(result.decryptedData) as UserIntent;
      
      // Validate intent structure
      this.validateIntent(intent);
      
      return intent;
    } catch (error) {
      console.error(`Failed to decrypt intent for ${encrypted.user}:`, error);
      throw error;
    }
  }
  
  /**
   * Decrypt multiple intents
   */
  async decryptBatch(encrypted: EncryptedIntent[]): Promise<UserIntent[]> {
    const promises = encrypted.map(enc => this.decryptIntent(enc));
    return Promise.all(promises);
  }
  
  /**
   * Validate intent has required fields
   */
  private validateIntent(intent: UserIntent): void {
    if (!intent.user || typeof intent.amount !== 'number') {
      throw new Error('Invalid intent structure');
    }
    
    if (intent.amount <= 0) {
      throw new Error('Intent amount must be positive');
    }
    
    if (typeof intent.isBid !== 'boolean') {
      throw new Error('Intent must specify bid/ask');
    }
  }
}

export const intentDecoder = new IntentDecoder();
