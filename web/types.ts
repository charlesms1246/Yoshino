export interface UserIntent {
  user: string;
  amount: number;
  isBid: boolean;
  minPrice: number;
  asset: string;
  // Advanced intent fields
  expires_at?: number;
  limit_price?: string;
  strategy?: string;
  allow_partial_fill?: boolean;
  max_gas_fee_contribution?: string;
}

export interface VaultBalance {
  amount: bigint;
  formatted: string;
}

export interface Transaction {
  digest: string;
  timestamp: number;
  type: 'deposit' | 'withdraw' | 'intent';
  amount: string;
  status: 'success' | 'pending' | 'failed';
}

export interface IntentSubmission {
  user: string;
  encryptedData: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
