export interface UserIntent {
  user: string;
  amount: number;
  isBid: boolean;
  minPrice: number;
  asset: 'BASE' | 'QUOTE';
}

export interface EncryptedIntent {
  user: string;
  encryptedData: string;
  createdAt: number;
  status: 'pending' | 'executed' | 'failed';
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
