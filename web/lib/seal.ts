import { CONTRACTS } from './contracts';
import { encrypt, retrieveKeyServers, getAllowlistedKeyServers, AesGcm256 } from '@mysten/seal';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { fromHEX } from '@mysten/bcs';

export type ExecutionStrategy = 'Standard' | 'TWAP';
export type IntentStatus = 'OPEN' | 'PARTIAL' | 'FILLED' | 'EXPIRED';

export interface IntentData {
  // Basic fields
  nonce: number;
  user: string;
  token_in: string;
  amount_in: bigint;
  token_out: string;
  
  // Constraints
  expires_at: number;              // Unix timestamp (ms)
  limit_price: bigint;             // 0 = market order, else limit price in MIST
  strategy: ExecutionStrategy;     // "Standard" or "TWAP"
  allow_partial_fill: boolean;     // Can fill 50% now, 50% later?
  max_gas_fee_contribution: bigint; // Optional gas tip
}

const THRESHOLD = 2;

export async function encryptIntent(intent: IntentData): Promise<string> {
  try {
    // TEMPORARY: Use base64 fallback until SessionKey flow is implemented in backend
    // Real Sui Seal encryption works, but backend can't decrypt without SessionKey
    console.warn('⚠️ Using base64 fallback - SessionKey flow not implemented');
    const serializableIntent = {
      ...intent,
      amount_in: intent.amount_in.toString(),
      limit_price: intent.limit_price.toString(),
      max_gas_fee_contribution: intent.max_gas_fee_contribution.toString(),
    };
    const intentJson = JSON.stringify(serializableIntent);
    return btoa(intentJson);
    
    /* REAL SUI SEAL ENCRYPTION CODE (uncomment when SessionKey is implemented):
    
    // Initialize Sui client for testnet
    const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

    // Convert BigInts to strings for JSON serialization
    const serializableIntent = {
      ...intent,
      amount_in: intent.amount_in.toString(),
      limit_price: intent.limit_price.toString(),
      max_gas_fee_contribution: intent.max_gas_fee_contribution.toString(),
    };
    
    const intentJson = JSON.stringify(serializableIntent);
    const data = new TextEncoder().encode(intentJson);
    
    // Generate unique ID for this intent
    const id = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const idBytes = new TextEncoder().encode(id);

    console.log('🔒 Encrypting intent with Sui Seal...', {
      packageId: CONTRACTS.PACKAGE_ID,
      id,
      threshold: THRESHOLD,
    });

    // Get testnet key server object IDs
    const keyServerIds = getAllowlistedKeyServers('testnet');
    console.log(`Found ${keyServerIds.length} allowlisted key servers`);

    // Retrieve key server details from on-chain
    const keyServers = await retrieveKeyServers({
      objectIds: keyServerIds,
      client: suiClient as any, // Type cast to handle SDK version differences
    });
    console.log(`Retrieved ${keyServers.length} key servers`);

    // Encrypt using Sui Seal SDK
    const { encryptedObject, key: backupKey } = await encrypt({
      keyServers,
      threshold: THRESHOLD,
      packageId: fromHEX(CONTRACTS.PACKAGE_ID.slice(2)), // Remove 0x prefix
      id: idBytes,
      encryptionInput: new AesGcm256(data, new Uint8Array(0)), // Empty AAD
    });

    // Convert encrypted bytes to base64 for transmission
    const encryptedBase64 = Buffer.from(encryptedObject).toString('base64');
    
    console.log('✅ Intent encrypted successfully');
    console.log('Backup key (store securely):', Buffer.from(backupKey).toString('hex'));

    return encryptedBase64;
    */
  } catch (error) {
    console.error('Seal encryption failed:', error);
    // Fallback to base64 encoding
    console.warn('⚠️ Falling back to base64 encoding');
    const serializableIntent = {
      ...intent,
      amount_in: intent.amount_in.toString(),
      limit_price: intent.limit_price.toString(),
      max_gas_fee_contribution: intent.max_gas_fee_contribution.toString(),
    };
    const intentJson = JSON.stringify(serializableIntent);
    return btoa(intentJson);
  }
}

/**
 * Submit encrypted intent to resolver backend
 */
export async function submitEncryptedIntent(
  user: string,
  encryptedData: string
): Promise<{ success: boolean; queuePosition?: number; error?: string }> {
  try {
    const response = await fetch(`${CONTRACTS.RESOLVER_API_URL}/api/intents/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user,
        encryptedData,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Submission failed');
    }

    const result = await response.json();
    
    console.log('✅ Intent submitted to resolver:', result);
    
    return {
      success: true,
      queuePosition: result.data?.queuePosition,
    };
  } catch (error) {
    console.error('Intent submission failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function decryptIntent(encrypted: string): IntentData {
  // Placeholder for testing - only resolver should decrypt
  const decrypted = atob(encrypted);
  const parsed = JSON.parse(decrypted);
  
  // Convert string amounts back to BigInt
  return {
    ...parsed,
    amount_in: BigInt(parsed.amount_in),
    limit_price: BigInt(parsed.limit_price),
    max_gas_fee_contribution: BigInt(parsed.max_gas_fee_contribution),
  };
}
