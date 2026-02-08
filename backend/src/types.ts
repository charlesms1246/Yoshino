export type ExecutionStrategy = 'Standard' | 'TWAP';
export type IntentStatus = 'OPEN' | 'PARTIAL' | 'FILLED' | 'EXPIRED' | 'CANCELLED' | 'pending';

export interface UserIntent {
  // Basic fields
  nonce: number;
  user: string;
  token_in: string;
  amount_in: bigint | string; // Accept string for JSON parsing
  token_out: string;
  
  // Constraints
  expires_at: number;              // Unix timestamp (ms)
  limit_price: bigint | string;    // 0 = market order, else limit price in MIST
  strategy: ExecutionStrategy;     // "Standard" or "TWAP"
  allow_partial_fill: boolean;     // Can fill 50% now, 50% later?
  max_gas_fee_contribution: bigint | string; // Optional gas tip
  
  // Tracking (database fields)
  amount_in_total?: bigint | string;        // Original request amount
  amount_filled?: bigint | string;          // Currently filled amount
  status?: IntentStatus;           // OPEN, PARTIAL, FILLED, EXPIRED
  created_at?: number;             // Submission timestamp
  updated_at?: number;             // Last update timestamp
  
  // Backward compatibility (old field names)
  amount?: number;                 // Legacy field, maps to amount_in
  isBid?: boolean;                 // Legacy field, inferred from token_in/out
  minPrice?: number;               // Legacy field, maps to limit_price
}

export interface EncryptedIntent {
  user: string;
  encryptedData: string;
  createdAt: number;
  status: IntentStatus;
}

export interface BatchExecution {
  batchId: string;
  trades: UserIntent[];
  totalVolume: number;
  executedAt: number;
  txDigest: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
